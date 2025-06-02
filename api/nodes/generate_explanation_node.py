import os
import sys
import logging
from typing import Dict, Any

from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

# Load environment variables
from api.schema.schema import WorkflowState

logger = logging.getLogger(__name__)

def generate_fallback_response(state: WorkflowState) -> WorkflowState:
    """Generate fallback explanation when LLM is not available"""
    logger.info("Generating fallback response...")
    
    fertility_status = state.get('fertility_prediction', 'unknown')
    fertilizer_type = state.get('fertilizer_prediction', 'unknown')
    soil_data = state['soil_data']
    
    state["explanation"] = (
        f"Your soil shows {fertility_status.lower()} fertility status "
        f"with {state.get('fertility_confidence', 0):.1%} confidence. "
        f"The recommended fertilizer {fertilizer_type} will help improve nutrient availability "
        f"based on current levels (N: {soil_data['n']}, P: {soil_data['p']}, K: {soil_data['k']}) "
        f"and pH: {soil_data['ph']}."
    )
    
    state["recommendations"] = [
        f"Apply {fertilizer_type} according to package instructions",
        "Monitor soil pH and adjust if needed (optimal range: 6.0-7.0)",
        "Maintain proper soil moisture levels for optimal nutrient uptake",
        f"Consider adding organic matter to improve {soil_data['simplified_texture'].lower()} soil structure",
        "Test soil nutrients again after 3-4 months to track improvement"
    ]
    
    logger.debug(f"Fallback explanation generated: {state['explanation']}")
    return state

def generate_explanation_node(state: WorkflowState) -> WorkflowState:
    """Generate AI explanation and recommendations"""
    logger.info("Starting explanation generation...")
    
    try:
        # Get components from state
        app_components = state.get("app_components", {})
        llm = app_components.get('llm')
        
        if llm is None:
            logger.warning("LLM not available, using fallback response")
            return generate_fallback_response(state)
        
        # Create prompts
        system_prompt = """You are an agricultural expert AI assistant. Explain soil analysis results and fertilizer recommendations in simple, farmer-friendly language. Provide practical advice and actionable recommendations."""
        
        soil_data = state['soil_data']
        human_prompt = f"""
        Based on the following soil analysis and predictions, provide a clear explanation and practical recommendations:
        
        Soil Data:
        - Soil Texture: {soil_data['simplified_texture']}
        - pH: {soil_data['ph']}
        - Nitrogen (N): {soil_data['n']}, Phosphorus (P): {soil_data['p']}, Potassium (K): {soil_data['k']}
        - Organic Content (O): {soil_data['o']}
        - Calcium (Ca): {soil_data['ca']}, Magnesium (Mg): {soil_data['mg']}
        - Copper (Cu): {soil_data['cu']}, Iron (Fe): {soil_data['fe']}, Zinc (Zn): {soil_data['zn']}
        
        Predictions:
        - Soil Fertility Status: {state['fertility_prediction']} (Confidence: {state['fertility_confidence']:.1%})
        - Recommended Fertilizer: {state['fertilizer_prediction']} (Confidence: {state['fertilizer_confidence']:.1%})
        
        Please provide:
        1. A brief simple explanation of what these results mean for the farmer
        2. Why this fertilizer was recommended based on the soil's nutrient profile
        3. 3-5 specific actionable recommendations for improving soil health and crop yield
        
        Keep the language simple and practical for farmers.
        """
        
        logger.debug(f"Sending prompt to LLM")
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = llm.invoke(messages)
        full_response = response.content
        
        # Parse response to extract explanation and recommendations
        lines = [line.strip() for line in full_response.split('\n') if line.strip()]
        explanation_lines = []
        recommendations = []
        
        in_recommendations = False
        for line in lines:
            if any(keyword in line.lower() for keyword in ['recommendation', '1.', '2.', '3.', '4.', '5.']) or line.startswith(('-', '•')):
                in_recommendations = True
                if line.lower().startswith(('1.', '2.', '3.', '4.', '5.')):
                    recommendations.append(line)
                elif line.startswith(('-', '•')):
                    recommendations.append(line[1:].strip())
                elif 'recommendation' not in line.lower():
                    recommendations.append(line)
            elif not in_recommendations:
                explanation_lines.append(line)
        
        state["explanation"] = ' '.join(explanation_lines) if explanation_lines else full_response

        state["recommendations"] = recommendations if recommendations else [
            "Monitor soil moisture regularly",
            "Test soil pH monthly",
            "Apply organic matter to improve soil structure",
            "Follow recommended fertilizer application rates",
            "Consider crop rotation for soil health"
        ]
        
        logger.info("AI explanation generated successfully")
        return state
        
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        logger.error(f"Exception details:", exc_info=True)
        return generate_fallback_response(state)
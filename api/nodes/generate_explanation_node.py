import os
import sys
import logging
from typing import Dict, Any, List
from pydantic import BaseModel, Field

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import PydanticOutputParser
from dotenv import load_dotenv

# Load environment variables
from api.schema.schema import WorkflowState, SoilAnalysisResponse, Recommendation, SoilExplanation

# Load environment variables from .env file
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

def generate_fallback_response(state: WorkflowState) -> WorkflowState:
    """Generate fallback explanation when LLM is not available"""
    logger.info("Generating fallback response...")
    
    fertility_status = state.get('fertility_prediction', 'unknown')
    fertilizer_type = state.get('fertilizer_prediction', 'unknown')
    soil_data = state['soil_data']
    
    # Create structured fallback response
    fallback_response = SoilAnalysisResponse(
        explanation=SoilExplanation(
            summary=f"Your soil shows {fertility_status.lower()} fertility status with {state.get('fertility_confidence', 0):.1%} confidence.",
            fertility_analysis=f"The {fertility_status.lower()} fertility indicates your soil's current ability to support crop growth.",
            nutrient_analysis=f"Current nutrient levels - Nitrogen: {soil_data['n']}, Phosphorus: {soil_data['p']}, Potassium: {soil_data['k']}",
            ph_analysis=f"Soil pH is {soil_data['ph']}, which affects nutrient availability to plants."
        ),
        recommendations=[
            Recommendation(
                category="fertilizer",
                priority="high",
                action=f"Apply {fertilizer_type} according to package instructions",
                reasoning="Addresses current nutrient deficiencies",
                timeframe="immediate"
            ),
            Recommendation(
                category="soil_management",
                priority="medium",
                action="Monitor soil pH and adjust if needed (optimal range: 6.0-7.0)",
                reasoning="Proper pH ensures optimal nutrient uptake",
                timeframe="monthly"
            ),
            Recommendation(
                category="soil_management",
                priority="medium",
                action="Maintain proper soil moisture levels for optimal nutrient uptake",
                reasoning="Moisture is essential for nutrient dissolution and plant uptake",
                timeframe="immediate"
            ),
            Recommendation(
                category="soil_improvement",
                priority="low",
                action=f"Consider adding organic matter to improve {soil_data['simplified_texture'].lower()} soil structure",
                reasoning="Organic matter improves soil structure and water retention",
                timeframe="seasonal"
            ),
            Recommendation(
                category="monitoring",
                priority="medium",
                action="Test soil nutrients again after 3-4 months to track improvement",
                reasoning="Regular testing helps track soil health improvements",
                timeframe="seasonal"
            )
        ],
        fertilizer_justification=f"The recommended {fertilizer_type} will help improve nutrient availability based on current nutrient levels and soil conditions.",
        confidence_assessment=f"Predictions have {state.get('fertility_confidence', 0):.1%} confidence for fertility and {state.get('fertilizer_confidence', 0):.1%} for fertilizer recommendation."
    )
    
    # Convert to dict for backward compatibility
    state["structured_response"] = fallback_response.model_dump()
    state["explanation"] = fallback_response.explanation.summary
    state["recommendations"] = [rec.action for rec in fallback_response.recommendations]
    
    logger.debug(f"Fallback structured response generated")
    return state

def generate_explanation_node(state: WorkflowState) -> WorkflowState:
    """Generate AI explanation and recommendations with structured output"""
    logger.info("Starting structured explanation generation...")
    
    try:
        # Get components from state
        app_components = state.get("app_components", {})
        llm = app_components.get('llm')
        
        if llm is None:
            logger.warning("LLM not available, using fallback response")
            return generate_fallback_response(state)
        
        # Setup structured output parser
        parser = PydanticOutputParser(pydantic_object=SoilAnalysisResponse)
        
        # Create prompts with structured output instructions
        system_prompt = """You are an agricultural expert AI assistant. Analyze soil data and provide structured recommendations in the exact format specified. Use simple, farmer-friendly language while maintaining technical accuracy."""
        
        soil_data = state['soil_data']
        human_prompt = f"""
        Based on the following soil analysis and predictions, provide a structured response:
        
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
        
        {parser.get_format_instructions()}
        
        Provide a comprehensive analysis with practical recommendations categorized by type and priority.
        """
        
        logger.debug(f"Sending structured prompt to LLM")
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = llm.invoke(messages)
        
        # Parse the structured response
        try:
            structured_response = parser.parse(response.content)
            
            # Store structured response in state
            state["structured_response"] = structured_response.model_dump()
            
            # Add additional structured fields
            state["detailed_explanation"] = {
                "summary": structured_response.explanation.summary,
                "fertility_analysis": structured_response.explanation.fertility_analysis,
                "nutrient_analysis": structured_response.explanation.nutrient_analysis,
                "ph_analysis": structured_response.explanation.ph_analysis,
                "soil_texture_analysis": structured_response.explanation.soil_texture_analysis,
                "overall_assessment": structured_response.explanation.overall_assessment
            }
            
            state["categorized_recommendations"] = [
                {
                    "category": rec.category,
                    "priority": rec.priority,
                    "action": rec.action,
                    "reasoning": rec.reasoning,
                    "timeframe": rec.timeframe
                }
                for rec in structured_response.recommendations
            ]
            
            state["fertilizer_justification"] = structured_response.fertilizer_justification
            state["confidence_assessment"] = structured_response.confidence_assessment
            state["long_term_strategy"] = structured_response.long_term_strategy
            
            logger.info("Structured AI explanation generated successfully")
            return state
            
        except Exception as parse_error:
            logger.warning(f"Failed to parse structured output: {parse_error}")
            logger.info("Falling back to unstructured parsing...")
            
            return state
        
    except Exception as e:
        logger.error(f"Error generating structured explanation: {e}")
        logger.error(f"Exception details:", exc_info=True)
        return generate_fallback_response(state)
import os
import sys
import logging
import asyncio # Import asyncio
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

async def generate_fallback_response(state: WorkflowState) -> WorkflowState:
    """Asynchronously generate fallback explanation when LLM is not available"""
    logger.info("Generating fallback response...")

    # Step 1: Extract data from state
    logger.debug("Fallback: Extracting data from state")
    fertility_status = state.get('fertility_prediction', 'unknown')
    fertilizer_type = state.get('fertilizer_prediction', 'unknown')
    soil_data = state['soil_data']

    # Step 2: Create soil explanation
    logger.debug("Fallback: Creating soil explanation")
    explanation = SoilExplanation(
        summary=f"Your soil shows {fertility_status.lower()} fertility status with {state.get('fertility_confidence', 0):.1%} confidence.",
        fertility_analysis=f"The {fertility_status.lower()} fertility indicates your soil's current ability to support crop growth.",
        nutrient_analysis=f"Current nutrient levels - Nitrogen: {soil_data['n']}, Phosphorus: {soil_data['p']}, Potassium: {soil_data['k']}",
        ph_analysis=f"Soil pH is {soil_data['ph']}, which affects nutrient availability to plants."
    )

    # Step 3: Generate recommendations
    logger.debug("Fallback: Generating recommendations")
    recommendations = [
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
    ]

    # Step 4: Create structured response
    logger.debug("Fallback: Creating structured response")
    fallback_response = SoilAnalysisResponse(
        explanation=explanation,
        recommendations=recommendations,
        fertilizer_justification=f"The recommended {fertilizer_type} will help improve nutrient availability based on current nutrient levels and soil conditions.",
        confidence_assessment=f"Predictions have {state.get('fertility_confidence', 0):.1%} confidence for fertility and {state.get('fertilizer_confidence', 0):.1%} for fertilizer recommendation."
    )

    # Step 5: Update state
    logger.debug("Fallback: Updating state")
    state["structured_response"] = fallback_response.model_dump()
    # For backward compatibility with other parts of the app if they use these flat fields
    state["explanation"] = fallback_response.explanation.summary
    state["recommendations"] = [rec.action for rec in fallback_response.recommendations]

    logger.debug("Fallback structured response generated")
    return state


async def generate_explanation_node(state: WorkflowState) -> WorkflowState:
    """Asynchronously generate AI explanation and recommendations with structured output"""
    logger.info("Starting structured explanation generation...")

    try:
        # Step 1: Initialize components
        logger.debug("Initializing components for explanation...")
        app_components = state.get("app_components", {})
        llm = app_components.get('llm')

        if llm is None:
            logger.warning("LLM not available, using fallback response")
            return await generate_fallback_response(state)

        # Step 2: Setup parser
        logger.debug("Setting up output parser...")
        parser = PydanticOutputParser(pydantic_object=SoilAnalysisResponse)

        # Step 3: Create system prompt
        logger.debug("Creating system prompt...")
        system_prompt = """You are an agricultural expert AI assistant. Analyze soil data and provide structured recommendations in the exact format specified. Use simple, farmer-friendly language while maintaining technical accuracy."""

        # Step 4: Build human prompt with soil data
        logger.debug("Building prompt with soil data...")
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

        # Step 5: Send to LLM asynchronously
        logger.debug("Sending request to LLM...")
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]

        # Use await to ensure non-blocking call
        response = await llm.ainvoke(messages)
        logger.debug("LLM response received.")

        # Step 6: Parse response
        logger.debug("Parsing LLM response...")
        try:
            # PydanticOutputParser.parse is synchronous. To avoid blocking,
            # we can run it in a thread pool, but for a fast operation like this,
            # direct calling is often acceptable. For a truly non-blocking approach,
            # a different parser or manual parsing might be needed.
            structured_response = parser.parse(response.content)
            response_dict = structured_response.model_dump()
            logger.debug("LLM response parsed successfully.")

        except Exception as parse_error:
            logger.warning(f"Failed to parse structured output: {parse_error}. Using fallback.")
            return await generate_fallback_response(state)

        # Step 7: Structure state data
        logger.debug("Structuring state data from parsed response...")
        state["structured_response"] = response_dict
        state["detailed_explanation"] = {
            "summary": structured_response.explanation.summary,
            "fertility_analysis": structured_response.explanation.fertility_analysis,
            "nutrient_analysis": structured_response.explanation.nutrient_analysis,
            "ph_analysis": structured_response.explanation.ph_analysis,
            "soil_texture_analysis": structured_response.explanation.soil_texture_analysis,
            "overall_assessment": structured_response.explanation.overall_assessment
        }
        state["categorized_recommendations"] = [rec.model_dump() for rec in structured_response.recommendations]
        state["fertilizer_justification"] = structured_response.fertilizer_justification
        state["confidence_assessment"] = structured_response.confidence_assessment
        state["long_term_strategy"] = structured_response.long_term_strategy

        # Step 8: Finalize
        logger.info("Structured AI explanation generated successfully")
        return state

    except Exception as e:
        logger.error(f"Error generating structured explanation: {e}", exc_info=True)
        return await generate_fallback_response(state)
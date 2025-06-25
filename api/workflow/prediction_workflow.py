"""
Workflow management utilities for LangGraph
"""
import os
import sys
import logging
from langgraph.graph import StateGraph, START, END

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.schema.schema import WorkflowState
from api.nodes.fertility_node import predict_fertility_node
from api.nodes.fertilizer_node import predict_fertilizer_node  
from api.nodes.agrovet_search_node import find_nearest_agrovets_node
from api.nodes.generate_explanation_node import generate_explanation_node
from api.utils.logging_config import setup_logger

# Setup logging
logger = setup_logger("Workflow", level=logging.INFO, console_level=logging.INFO)

class WorkflowManager:
    """Manages LangGraph workflow creation and compilation"""
    
    def __init__(self):
        self.workflow = None
        self.compiled_workflow = None
    
    def create_workflow(self):
        """Create and compile LangGraph workflow"""
        logger.info("Creating workflow...")
        
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("predict_fertility", predict_fertility_node)
        workflow.add_node("predict_fertilizer", predict_fertilizer_node)
        workflow.add_node("find_nearest_agrovets", find_nearest_agrovets_node)
        workflow.add_node("generate_explanation", generate_explanation_node)
        
        # Define edges
        workflow.add_edge(START, "predict_fertility")
        workflow.add_edge("predict_fertility", "predict_fertilizer")
        workflow.add_edge("predict_fertilizer", "find_nearest_agrovets")
        workflow.add_edge("find_nearest_agrovets", "generate_explanation")
        workflow.add_edge("generate_explanation", END)
        
        self.workflow = workflow
        self.compiled_workflow = workflow.compile()
        
        logger.info("Workflow created and compiled successfully")
        return self.compiled_workflow
    
    def get_compiled_workflow(self):
        """Get the compiled workflow"""
        if not self.compiled_workflow:
            return self.create_workflow()
        return self.compiled_workflow
    
    def is_workflow_ready(self) -> bool:
        """Check if workflow is ready for use"""
        return self.compiled_workflow is not None


def create_prediction_workflow():
    """Create and return a compiled prediction workflow"""
    workflow_manager = WorkflowManager()
    return workflow_manager.create_workflow()
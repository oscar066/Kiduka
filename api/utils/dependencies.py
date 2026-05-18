"""
Utility module for managing application dependencies across routers
"""
from typing import Optional, Dict, Any

class DependencyManager:
    """
    Singleton-style manager for shared, stateful application dependencies.
    
    Acts as a centralized registry to store and inject long-lived objects 
    such as loaded ML models, preprocessing pipelines, or session managers 
    into FastAPI routers without requiring complex parameter passing.
    """
    
    def __init__(self):
        self._app_components: Optional[Dict[str, Any]] = None
        self._session_manager = None
    
    def set_components(self, app_components: Dict[str, Any]):
        """
        Register the core application components.
        
        Args:
            app_components (Dict[str, Any]): A dictionary mapping component names to their instances.
        """
        self._app_components = app_components
    
    def set_session_manager(self, session_manager):
        """
        Register the application's session manager instance.
        
        Args:
            session_manager (Any): The session management object to store globally.
        """
        self._session_manager = session_manager
    
    def get_components(self) -> Optional[Dict[str, Any]]:
        """
        Retrieve the registered application components.
        
        Returns:
            Optional[Dict[str, Any]]: The components dictionary, or None if not initialized.
        """
        return self._app_components
    
    def get_session_manager(self):
        """
        Retrieve the registered session manager instance.
        
        Returns:
            Any: The session manager object, or None if not initialized.
        """
        return self._session_manager
    
    def is_initialized(self) -> bool:
        """
        Check if all critical dependencies have been registered.
        
        Returns:
            bool: True if both components and the session manager are loaded.
        """
        return all([
            self._app_components is not None,
            self._session_manager is not None
        ])
    
    def validate_models_loaded(self) -> bool:
        """
        Verify that the necessary ML models are available in the components dictionary.
        
        Returns:
            bool: True if components have been successfully initialized.
        """
        # Kept for compatibility but always true if components are set
        return self._app_components is not None

# Global dependency manager instance
dependency_manager = DependencyManager()
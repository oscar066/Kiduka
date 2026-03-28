"""
Utility module for managing application dependencies across routers
"""
from typing import Optional, Dict, Any

class DependencyManager:
    """Manages shared dependencies across the application"""
    
    def __init__(self):
        self._app_components: Optional[Dict[str, Any]] = None
        self._session_manager = None
    
    def set_components(self, app_components: Dict[str, Any]):
        """Set application components (models, preprocessors, etc.)"""
        self._app_components = app_components
    
    def set_session_manager(self, session_manager):
        """Set the session manager"""
        self._session_manager = session_manager
    
    def get_components(self) -> Optional[Dict[str, Any]]:
        """Get application components"""
        return self._app_components
    
    def get_session_manager(self):
        """Get the session manager"""
        return self._session_manager
    
    def is_initialized(self) -> bool:
        """Check if all dependencies are initialized"""
        return all([
            self._app_components is not None,
            self._session_manager is not None
        ])
    
    def validate_models_loaded(self) -> bool:
        """Validate that required models are loaded"""
        # Kept for compatibility but always true if components are set
        return self._app_components is not None

# Global dependency manager instance
dependency_manager = DependencyManager()
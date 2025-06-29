import os
import sys
import joblib
import logging

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.utils.preprocessing import SoilDataPreprocessor 

# logger import
from api.utils.logging_config import setup_logger

class ModelLoader:
    """
    Model loader class to handle loading of trained models and preprocessors
    """
    
    def __init__(self, models_dir: str = "models", log_level: str = 'INFO'):
        """
        Initialize ModelLoader
        
        Parameters:
            models_dir (str): Directory containing saved models
            log_level (str): Logging level
        """
        self.models_dir = models_dir
        
        # Use the setup_logger function with colorized output
        log_level_int = getattr(logging, log_level.upper())
        self.logger = setup_logger(
            name=self.__class__.__name__,
            level=log_level_int,
            console_level=log_level_int
        )
    
    def load_model(self, filename: str):
        """Load a trained model from joblib file"""
        filepath = os.path.join(self.models_dir, filename)
        
        if not os.path.exists(filepath):
            self.logger.error(f"Model file not found: {filepath}")
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        try:
            model = joblib.load(filepath)
            self.logger.info(f"Successfully loaded model from {filepath}")
            return model
        except Exception as e:
            self.logger.error(f"Error loading model from {filepath}: {e}")
            raise RuntimeError(f"Error loading model: {e}")
    
    def load_preprocessor(self, filename: str) -> SoilDataPreprocessor:
        """
        Load a preprocessor and reconstruct SoilDataPreprocessor object
        
        Parameters:
            filename (str): Name of the preprocessor file
            
        Returns:
            SoilDataPreprocessor: Reconstructed preprocessor object
        """
        filepath = os.path.join(self.models_dir, filename)
        
        if not os.path.exists(filepath):
            self.logger.error(f"Preprocessor file not found: {filepath}")
            raise FileNotFoundError(f"Preprocessor file not found: {filepath}")
        
        try:
            # Load the saved dictionary
            data = joblib.load(filepath)
            self.logger.debug(f"Loaded preprocessor data: {list(data.keys())}")
            
            # Create new SoilDataPreprocessor instance
            preprocessor = SoilDataPreprocessor()
            
            # Restore the saved state
            preprocessor.label_encoders = data['label_encoders']
            preprocessor.scaler = data['scaler']
            preprocessor.feature_columns = data['feature_columns']
            preprocessor.is_fitted = data['is_fitted']
            
            self.logger.info(f"Successfully loaded and reconstructed preprocessor from {filepath}")
            self.logger.debug(f"Preprocessor state - fitted: {preprocessor.is_fitted}, "
                            f"encoders: {len(preprocessor.label_encoders)}, "
                            f"scaler: {type(preprocessor.scaler).__name__ if preprocessor.scaler else 'None'}")
            
            return preprocessor
            
        except Exception as e:
            self.logger.error(f"Error loading preprocessor from {filepath}: {e}")
            raise RuntimeError(f"Error loading preprocessor: {e}")
    
    def list_available_models(self):
        """List all available model files in the models directory"""
        if not os.path.exists(self.models_dir):
            self.logger.warning(f"Models directory does not exist: {self.models_dir}")
            return []
        
        model_files = [f for f in os.listdir(self.models_dir) if f.endswith('.joblib')]
        self.logger.debug(f"Available model files: {model_files}")
        return model_files
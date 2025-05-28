import os
import joblib

class ModelLoader:
    def __init__(self):
        self.models_dir = os.path.dirname(os.path.abspath(__file__))
    
    def get_model_path(self, model_filename):
        """Returns the full path to a model file"""
        return os.path.join(self.models_dir, model_filename)
    
    def load_model(self, model_filename):
        """Loads a model from the models directory"""
        model_path = self.get_model_path(model_filename)
        try:
            return joblib.load(model_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"Model file '{model_filename}' not found in {self.models_dir}")
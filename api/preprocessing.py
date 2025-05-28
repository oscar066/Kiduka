import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from imblearn.over_sampling import SMOTE
import joblib
import os
import logging
from typing import Tuple, Dict, Any

class SoilDataPreprocessor:
    """
    A comprehensive preprocessor for soil data that handles encoding, scaling, and balancing.
    This class ensures consistent preprocessing during both training and prediction.
    """
    
    def __init__(self, log_level: str = 'INFO', log_file: str = None):
        """
        Initialize the preprocessor with logging configuration.
        
        Parameters:
            log_level (str): Logging level ('DEBUG', 'INFO', 'WARNING', 'ERROR')
            log_file (str): Optional file path to save logs. If None, logs to console only.
        """
        self.label_encoders = {}
        self.scaler = None
        self.feature_columns = None
        self.is_fitted = False
        
        # Setup logging
        self._setup_logging(log_level, log_file)
        self.logger.info("SoilDataPreprocessor initialized")
        
    def _setup_logging(self, log_level: str, log_file: str = None):
        """Setup logging configuration."""
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        # Clear existing handlers to avoid duplicates
        self.logger.handlers.clear()
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # File handler if specified
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
            
    def encode_categorical_columns(self, df: pd.DataFrame, encoding_type: str = 'label') -> pd.DataFrame:
        """
        Encodes categorical columns in a DataFrame.

        Parameters:
            df (pd.DataFrame): The input DataFrame with categorical columns.
            encoding_type (str): The encoding type, either 'label' or 'onehot'.

        Returns:
            pd.DataFrame: A DataFrame with encoded categorical columns.
        """
        self.logger.info(f"Starting categorical encoding with type: {encoding_type}")
        self.logger.debug(f"Input DataFrame shape: {df.shape}")
        
        df_encoded = df.copy()
        
        # Handle both categorical dtype and object dtype columns
        categorical_columns = df_encoded.select_dtypes(include=['category', 'object']).columns
        self.logger.info(f"Found {len(categorical_columns)} categorical columns: {list(categorical_columns)}")
        
        if len(categorical_columns) == 0:
            self.logger.info("No categorical columns found, returning original DataFrame")
            return df_encoded
        
        if encoding_type == 'label':
            for col in categorical_columns:
                self.logger.debug(f"Processing column: {col}")
                unique_values = df_encoded[col].nunique()
                self.logger.debug(f"Column {col} has {unique_values} unique values")
                
                if col not in self.label_encoders:
                    self.logger.debug(f"Creating new LabelEncoder for column: {col}")
                    le = LabelEncoder()
                    df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                    self.label_encoders[col] = le
                    self.logger.info(f"Fitted LabelEncoder for {col}, classes: {len(le.classes_)}")
                else:
                    # Use existing encoder for consistency
                    self.logger.debug(f"Using existing LabelEncoder for column: {col}")
                    le = self.label_encoders[col]
                    # Handle unseen categories gracefully
                    try:
                        df_encoded[col] = le.transform(df_encoded[col].astype(str))
                        self.logger.debug(f"Successfully transformed column {col}")
                    except ValueError as e:
                        # Handle unseen labels by assigning them to the most frequent class
                        self.logger.warning(f"Unseen category in column {col}. Using most frequent class.")
                        most_frequent = le.classes_[0]  # or use mode
                        original_values = set(df_encoded[col].astype(str))
                        known_values = set(le.classes_)
                        unseen_values = original_values - known_values
                        self.logger.warning(f"Unseen values in {col}: {unseen_values}")
                        
                        df_encoded[col] = df_encoded[col].astype(str).apply(
                            lambda x: x if x in le.classes_ else most_frequent
                        )
                        df_encoded[col] = le.transform(df_encoded[col])
                        self.logger.info(f"Handled unseen categories in {col} by mapping to {most_frequent}")

        elif encoding_type == 'onehot':
            self.logger.info("Applying one-hot encoding")
            original_shape = df_encoded.shape
            df_encoded = pd.get_dummies(df_encoded, columns=categorical_columns, drop_first=True)
            self.logger.info(f"One-hot encoding changed shape from {original_shape} to {df_encoded.shape}")
            new_columns = df_encoded.shape[1] - original_shape[1] + len(categorical_columns)
            self.logger.info(f"Added {new_columns} new columns from one-hot encoding")
        else:
            error_msg = "Unsupported encoding_type. Use 'label' or 'onehot'."
            self.logger.error(error_msg)
            raise ValueError(error_msg)

        self.logger.info(f"Categorical encoding completed. Output shape: {df_encoded.shape}")
        return df_encoded

    def scale_dataset(self, df: pd.DataFrame, target_column: str = None, scaling_type: str = 'standard') -> pd.DataFrame:
        """
        Scales numerical columns in the DataFrame.

        Parameters:
            df (pd.DataFrame): The input DataFrame.
            target_column (str): The target column to exclude from scaling.
            scaling_type (str): The type of scaling to apply, either 'standard' or 'minmax'.

        Returns:
            pd.DataFrame: A DataFrame with scaled numerical columns.
        """
        self.logger.info(f"Starting numerical scaling with type: {scaling_type}")
        self.logger.debug(f"Input DataFrame shape: {df.shape}")
        self.logger.debug(f"Target column to exclude: {target_column}")
        
        df_scaled = df.copy()

        # Select numeric columns
        numerical_columns = df_scaled.select_dtypes(include=['float64', 'float32']).columns
        self.logger.info(f"Found {len(numerical_columns)} numerical columns: {list(numerical_columns)}")
        
        # Exclude target column if specified
        if target_column and target_column in numerical_columns:
            columns_to_scale = numerical_columns.drop(target_column)
            self.logger.info(f"Excluding target column '{target_column}' from scaling")
        else:
            columns_to_scale = numerical_columns
            if target_column:
                self.logger.debug(f"Target column '{target_column}' not found in numerical columns")

        self.logger.info(f"Columns to scale: {list(columns_to_scale)}")

        if len(columns_to_scale) == 0:
            self.logger.info("No numerical columns to scale, returning original DataFrame")
            return df_scaled

        if not self.is_fitted:
            # Fit scaler during training
            self.logger.info("Fitting scaler (training mode)")
            if scaling_type == 'standard':
                self.scaler = StandardScaler()
                self.logger.debug("Using StandardScaler")
            elif scaling_type == 'minmax':
                self.scaler = MinMaxScaler()
                self.logger.debug("Using MinMaxScaler")
            else:
                error_msg = "Unsupported scaling_type. Use 'standard' or 'minmax'."
                self.logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Log statistics before scaling
            for col in columns_to_scale:
                self.logger.debug(f"Before scaling - {col}: mean={df_scaled[col].mean():.4f}, std={df_scaled[col].std():.4f}")
            
            df_scaled[columns_to_scale] = self.scaler.fit_transform(df_scaled[columns_to_scale])
            self.feature_columns = columns_to_scale
            
            # Log statistics after scaling
            for col in columns_to_scale:
                self.logger.debug(f"After scaling - {col}: mean={df_scaled[col].mean():.4f}, std={df_scaled[col].std():.4f}")
                
            self.logger.info(f"Scaler fitted and applied to {len(columns_to_scale)} columns")
        else:
            # Use fitted scaler during prediction
            self.logger.info("Applying fitted scaler (prediction mode)")
            if self.scaler is None:
                error_msg = "Scaler not fitted. Call fit_transform first."
                self.logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Check if columns match
            missing_cols = set(self.feature_columns) - set(df_scaled.columns)
            if missing_cols:
                self.logger.warning(f"Missing columns in new data: {missing_cols}")
            
            available_cols = [col for col in self.feature_columns if col in df_scaled.columns]
            self.logger.debug(f"Scaling {len(available_cols)} available columns: {available_cols}")
            
            df_scaled[available_cols] = self.scaler.transform(df_scaled[available_cols])
            self.logger.info(f"Applied fitted scaler to {len(available_cols)} columns")

        self.logger.info(f"Numerical scaling completed. Output shape: {df_scaled.shape}")
        return df_scaled

    def balance_with_smote(self, df: pd.DataFrame, target_column: str) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Apply SMOTE to balance the dataset.

        Parameters:
            df (pd.DataFrame): Input DataFrame (encoded and scaled).
            target_column (str): Name of the target column.

        Returns:
            Tuple[pd.DataFrame, pd.Series]: Resampled feature set and target column.
        """
        self.logger.info(f"Starting SMOTE balancing for target column: {target_column}")
        self.logger.debug(f"Input DataFrame shape: {df.shape}")
        
        if target_column not in df.columns:
            error_msg = f"Target column '{target_column}' not found in DataFrame"
            self.logger.error(error_msg)
            raise ValueError(error_msg)
            
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # Log class distribution before SMOTE
        class_counts = y.value_counts().sort_index()
        self.logger.info(f"Class distribution before SMOTE:")
        for class_label, count in class_counts.items():
            self.logger.info(f"  Class {class_label}: {count} samples ({count/len(y)*100:.2f}%)")

        self.logger.debug(f"Feature matrix shape: {X.shape}")
        self.logger.debug(f"Target vector shape: {y.shape}")

        smote = SMOTE(random_state=42)
        self.logger.debug("Applying SMOTE transformation...")
        X_resampled, y_resampled = smote.fit_resample(X, y)

        # Log class distribution after SMOTE
        y_resampled_counts = pd.Series(y_resampled).value_counts().sort_index()
        self.logger.info(f"Class distribution after SMOTE:")
        for class_label, count in y_resampled_counts.items():
            self.logger.info(f"  Class {class_label}: {count} samples ({count/len(y_resampled)*100:.2f}%)")

        self.logger.info(f"SMOTE increased dataset from {len(y)} to {len(y_resampled)} samples")

        # Convert back to DataFrame
        X_resampled = pd.DataFrame(X_resampled, columns=X.columns)
        y_resampled = pd.Series(y_resampled, name=target_column)

        self.logger.info("SMOTE balancing completed successfully")
        return X_resampled, y_resampled
    
    def fit_transform(self, df: pd.DataFrame, target_column: str = None, 
                     encoding_type: str = 'label', scaling_type: str = 'standard',
                     apply_smote: bool = False) -> pd.DataFrame:
        """
        Fit the preprocessor and transform the training data.
        
        Parameters:
            df (pd.DataFrame): Training DataFrame
            target_column (str): Name of the target column
            encoding_type (str): Type of categorical encoding
            scaling_type (str): Type of numerical scaling  
            apply_smote (bool): Whether to apply SMOTE for balancing
            
        Returns:
            pd.DataFrame: Preprocessed DataFrame
        """
        self.logger.info("="*60)
        self.logger.info("Starting fit_transform process")
        self.logger.info(f"Parameters - encoding: {encoding_type}, scaling: {scaling_type}, SMOTE: {apply_smote}")
        self.logger.info(f"Input DataFrame shape: {df.shape}")
        self.logger.info(f"Target column: {target_column}")
        
        if target_column and target_column in df.columns:
            self.logger.info(f"Target column data type: {df[target_column].dtype}")
            if df[target_column].dtype in ['object', 'category']:
                self.logger.info(f"Target classes: {df[target_column].unique()}")
            else:
                self.logger.info(f"Target range: {df[target_column].min()} to {df[target_column].max()}")
        
        # Step 1: Encode categorical columns
        self.logger.info("-" * 40)
        self.logger.info("STEP 1: Categorical Encoding")
        df_processed = self.encode_categorical_columns(df, encoding_type)
        
        # Step 2: Scale numerical columns
        self.logger.info("-" * 40)
        self.logger.info("STEP 2: Numerical Scaling")
        df_processed = self.scale_dataset(df_processed, target_column, scaling_type)
        self.is_fitted = True
        self.logger.info("Preprocessor marked as fitted")
        
        # Step 3: Apply SMOTE if requested
        if apply_smote and target_column:
            self.logger.info("-" * 40)
            self.logger.info("STEP 3: SMOTE Balancing")
            X_resampled, y_resampled = self.balance_with_smote(df_processed, target_column)
            df_processed = pd.concat([X_resampled, y_resampled], axis=1)
            self.logger.info(f"Final DataFrame shape after SMOTE: {df_processed.shape}")
        elif apply_smote and not target_column:
            self.logger.warning("SMOTE requested but no target column specified, skipping SMOTE")
        
        self.logger.info("="*60)
        self.logger.info(f"fit_transform completed successfully. Final shape: {df_processed.shape}")
        
        return df_processed
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform new data using the fitted preprocessor.
        
        Parameters:
            df (pd.DataFrame): New data to transform
            
        Returns:
            pd.DataFrame: Preprocessed DataFrame
        """
        self.logger.info("="*60)
        self.logger.info("Starting transform process (prediction mode)")
        self.logger.info(f"Input DataFrame shape: {df.shape}")
        
        if not self.is_fitted:
            error_msg = "Preprocessor not fitted. Call fit_transform first."
            self.logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Apply same transformations as during training
        self.logger.info("-" * 40)
        self.logger.info("STEP 1: Categorical Encoding")
        df_processed = self.encode_categorical_columns(df, 'label')
        
        self.logger.info("-" * 40)
        self.logger.info("STEP 2: Numerical Scaling")
        df_processed = self.scale_dataset(df_processed)
        
        self.logger.info("="*60)
        self.logger.info(f"Transform completed successfully. Final shape: {df_processed.shape}")
        
        return df_processed
    
    def save(self, filepath: str):
        """Save the preprocessor to disk."""
        self.logger.info(f"Saving preprocessor to: {filepath}")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        
        save_data = {
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(save_data, filepath)
        
        self.logger.info(f"Preprocessor saved successfully")
        self.logger.debug(f"Saved components: {list(save_data.keys())}")
        self.logger.debug(f"Number of label encoders: {len(self.label_encoders)}")
        self.logger.debug(f"Scaler type: {type(self.scaler).__name__ if self.scaler else 'None'}")
        self.logger.debug(f"Feature columns: {len(self.feature_columns) if self.feature_columns is not None else 0}")
    
    def load(self, filepath: str):
        """Load the preprocessor from disk."""
        self.logger.info(f"Loading preprocessor from: {filepath}")
        
        if not os.path.exists(filepath):
            error_msg = f"Preprocessor file not found: {filepath}"
            self.logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        try:
            data = joblib.load(filepath)
            self.label_encoders = data['label_encoders']
            self.scaler = data['scaler']
            self.feature_columns = data['feature_columns']
            self.is_fitted = data['is_fitted']
            
            self.logger.info("Preprocessor loaded successfully")
            self.logger.debug(f"Loaded components: {list(data.keys())}")
            self.logger.debug(f"Number of label encoders: {len(self.label_encoders)}")
            self.logger.debug(f"Scaler type: {type(self.scaler).__name__ if self.scaler else 'None'}")
            self.logger.debug(f"Feature columns: {len(self.feature_columns) if self.feature_columns is not None else 0}")
            self.logger.debug(f"Is fitted: {self.is_fitted}")
            
        except Exception as e:
            error_msg = f"Error loading preprocessor: {str(e)}"
            self.logger.error(error_msg)
            raise RuntimeError(error_msg)

# Example usage with different logging levels
if __name__ == "__main__":
    # Example 1: Console logging with INFO level
    preprocessor = SoilDataPreprocessor(log_level='INFO')
    
    # Example 2: File logging with DEBUG level
    # preprocessor = SoilDataPreprocessor(log_level='DEBUG', log_file='preprocessing.log')
    
    # Example 3: Minimal logging with WARNING level
    # preprocessor = SoilDataPreprocessor(log_level='WARNING')
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from imblearn.over_sampling import SMOTE
import joblib
import os
from typing import Tuple, Dict, Any

class SoilDataPreprocessor:
    """
    A comprehensive preprocessor for soil data that handles encoding, scaling, and balancing.
    This class ensures consistent preprocessing during both training and prediction.
    """
    
    def __init__(self):
        self.label_encoders = {}
        self.scaler = None
        self.feature_columns = None
        self.is_fitted = False
        
    def encode_categorical_columns(self, df: pd.DataFrame, encoding_type: str = 'label') -> pd.DataFrame:
        """
        Encodes categorical columns in a DataFrame.

        Parameters:
            df (pd.DataFrame): The input DataFrame with categorical columns.
            encoding_type (str): The encoding type, either 'label' or 'onehot'.

        Returns:
            pd.DataFrame: A DataFrame with encoded categorical columns.
        """
        df_encoded = df.copy()
        
        # Handle both categorical dtype and object dtype columns
        categorical_columns = df_encoded.select_dtypes(include=['category', 'object']).columns
        
        if encoding_type == 'label':
            for col in categorical_columns:
                if col not in self.label_encoders:
                    le = LabelEncoder()
                    df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                    self.label_encoders[col] = le
                else:
                    # Use existing encoder for consistency
                    le = self.label_encoders[col]
                    # Handle unseen categories gracefully
                    try:
                        df_encoded[col] = le.transform(df_encoded[col].astype(str))
                    except ValueError as e:
                        # Handle unseen labels by assigning them to the most frequent class
                        print(f"Warning: Unseen category in column {col}. Using most frequent class.")
                        most_frequent = le.classes_[0]  # or use mode
                        df_encoded[col] = df_encoded[col].astype(str).apply(
                            lambda x: x if x in le.classes_ else most_frequent
                        )
                        df_encoded[col] = le.transform(df_encoded[col])

        elif encoding_type == 'onehot':
            df_encoded = pd.get_dummies(df_encoded, columns=categorical_columns, drop_first=True)
        else:
            raise ValueError("Unsupported encoding_type. Use 'label' or 'onehot'.")

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
        df_scaled = df.copy()

        # Select numeric columns
        numerical_columns = df_scaled.select_dtypes(include=['float64', 'int64', 'float32', 'int32']).columns
        
        # Exclude target column if specified
        if target_column and target_column in numerical_columns:
            columns_to_scale = numerical_columns.drop(target_column)
        else:
            columns_to_scale = numerical_columns

        if len(columns_to_scale) == 0:
            return df_scaled

        if not self.is_fitted:
            # Fit scaler during training
            if scaling_type == 'standard':
                self.scaler = StandardScaler()
            elif scaling_type == 'minmax':
                self.scaler = MinMaxScaler()
            else:
                raise ValueError("Unsupported scaling_type. Use 'standard' or 'minmax'.")
            
            df_scaled[columns_to_scale] = self.scaler.fit_transform(df_scaled[columns_to_scale])
            self.feature_columns = columns_to_scale
        else:
            # Use fitted scaler during prediction
            if self.scaler is None:
                raise ValueError("Scaler not fitted. Call fit_transform first.")
            df_scaled[self.feature_columns] = self.scaler.transform(df_scaled[self.feature_columns])

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
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in DataFrame")
            
        X = df.drop(columns=[target_column])
        y = df[target_column]

        smote = SMOTE(random_state=42)
        X_resampled, y_resampled = smote.fit_resample(X, y)

        # Convert back to DataFrame
        X_resampled = pd.DataFrame(X_resampled, columns=X.columns)
        y_resampled = pd.Series(y_resampled, name=target_column)

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
        # Step 1: Encode categorical columns
        df_processed = self.encode_categorical_columns(df, encoding_type)
        
        # Step 2: Scale numerical columns
        df_processed = self.scale_dataset(df_processed, target_column, scaling_type)
        self.is_fitted = True
        
        # Step 3: Apply SMOTE if requested
        if apply_smote and target_column:
            X_resampled, y_resampled = self.balance_with_smote(df_processed, target_column)
            df_processed = pd.concat([X_resampled, y_resampled], axis=1)
        
        return df_processed
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform new data using the fitted preprocessor.
        
        Parameters:
            df (pd.DataFrame): New data to transform
            
        Returns:
            pd.DataFrame: Preprocessed DataFrame
        """
        if not self.is_fitted:
            raise ValueError("Preprocessor not fitted. Call fit_transform first.")
        
        # Apply same transformations as during training
        df_processed = self.encode_categorical_columns(df, 'label')
        df_processed = self.scale_dataset(df_processed)
        
        return df_processed
    
    def save(self, filepath: str):
        """Save the preprocessor to disk."""
        joblib.dump({
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'is_fitted': self.is_fitted
        }, filepath)
    
    def load(self, filepath: str):
        """Load the preprocessor from disk."""
        if os.path.exists(filepath):
            data = joblib.load(filepath)
            self.label_encoders = data['label_encoders']
            self.scaler = data['scaler']
            self.feature_columns = data['feature_columns']
            self.is_fitted = data['is_fitted']
        else:
            raise FileNotFoundError(f"Preprocessor file not found: {filepath}")

# Standalone functions for backward compatibility
def encode_categorical_columns(df: pd.DataFrame, encoding_type: str = 'label') -> pd.DataFrame:
    """
    Legacy function - recommend using SoilDataPreprocessor class instead.
    Encodes categorical columns in a DataFrame.
    """
    processor = SoilDataPreprocessor()
    return processor.encode_categorical_columns(df, encoding_type)

def scale_dataset(df: pd.DataFrame, target_column: str = None, scaling_type: str = 'standard') -> pd.DataFrame:
    """
    Legacy function - recommend using SoilDataPreprocessor class instead.
    Scales numerical columns in the DataFrame.
    """
    processor = SoilDataPreprocessor()
    return processor.scale_dataset(df, target_column, scaling_type)

def balance_with_smote(df: pd.DataFrame, target_column: str) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Legacy function - recommend using SoilDataPreprocessor class instead.
    Apply SMOTE to balance the dataset.
    """
    processor = SoilDataPreprocessor()
    return processor.balance_with_smote(df, target_column)
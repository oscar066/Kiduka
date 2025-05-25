import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from imblearn.over_sampling import SMOTE

# Encoding categorical values
def encode_categorical_columns(df: pd.DataFrame, encoding_type: str = 'label') -> pd.DataFrame:
    """
    Encodes categorical columns in a DataFrame.

    Parameters:
        df (pd.DataFrame): The input DataFrame with categorical columns.
        encoding_type (str): The encoding type, either 'label' or 'onehot'.

    Returns:
        pd.DataFrame: A DataFrame with encoded categorical columns.
    """

    df_encoded = df.copy()

    categorical_columns = df_encoded.select_dtypes(include=['category']).columns

    if encoding_type == 'label':
        for col in categorical_columns:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col])

    elif encoding_type == 'onehot':
        df_encoded = pd.get_dummies(df_encoded, columns=categorical_columns, drop_first=True)
    else:
        raise ValueError("Unsupported encoding_type. Use 'label' or 'onehot' .")


    return df_encoded


# Scaling the values
def scale_dataset(df: pd.DataFrame,target_column : str , scaling_type: str = 'standard') -> pd.DataFrame:
    """
    Scales numerical columns in the DataFrame.

    Parameters:
        df (pd.DataFrame): The input DataFrame.
        scaling_type (str): The type of scaling to apply, either 'standard' or 'minmax'.

    Returns:
        pd.DataFrame: A DataFrame with scaled numerical columns.
    """
    df_scaled = df.copy()

    # select numeric columns
    numerical_columns = df_scaled.select_dtypes(include=['float64']).columns
    columns_to_scale = numerical_columns.difference([target_column])

    if scaling_type == 'standard':
        scaler = StandardScaler()
    elif scaling_type == 'minmax':
        scaler = MinMaxScaler()
    else:
        raise ValueError("Unsupported scaling_type. Use 'standard' or 'minmax'. ")

    df_scaled[columns_to_scale] = scaler.fit_transform(df_scaled[columns_to_scale])

    return df_scaled

# checking for class imbalance
def balance_with_smote(df: pd.DataFrame, target_column: str):
    """
    Apply SMOTE to balance the dataset.

    Parameters:
        df (pd.DataFrame): Input DataFrame (encoded and scaled).
        target_column (str): Name of the target column.

    Returns:
        X_resampled (pd.DataFrame): Resampled feature set.
        y_resampled (pd.Series): Resampled target column.
    """
    X = df.drop(columns=[target_column])
    y = df[target_column]

    smote = SMOTE(random_state=142)
    X_resampled, y_resampled = smote.fit_resample(X, y)

    # Convert back to DataFrame
    X_resampled = pd.DataFrame(X_resampled, columns=X.columns)
    y_resampled = pd.Series(y_resampled, name=target_column)

    return X_resampled, y_resampled
import pandas as pd
import numpy as np

def check_column_names(df):
    """
    Check and display the actual column names to identify NPK class columns
    """
    print("Available columns in the dataframe:")
    print("=" * 40)
    
    for i, col in enumerate(df.columns):
        print(f"{i:2d}. '{col}'")
    
    # Look for NPK-related columns
    npk_columns = []
    for col in df.columns:
        if any(nutrient in col.lower() for nutrient in ['nitrogen', 'phosphorus', 'potassium']):
            if 'class' in col.lower():
                npk_columns.append(col)
    
    print(f"\nFound NPK class columns:")
    for col in npk_columns:
        print(f"  - '{col}'")
    
    return npk_columns

def create_soil_fertility_status(df):
    """
    Create soilfertilitystatus column based on NPK classification
    
    Parameters:
    df: DataFrame containing the soil data
    
    Returns:
    DataFrame with new soilfertilitystatus column
    """
    
    # First, check column names
    npk_columns = check_column_names(df)
    
    # Make a copy to avoid modifying original dataframe
    df_copy = df.copy()
    
    def classify_fertility(row):
        """
        Classify soil fertility based on NPK levels
        
        Rules:
        - High, High, High -> Healthy (all 3 high)
        - Low, Low, Low -> Very Poor (all 3 low)
        - 2 High + 1 Low -> Moderately Healthy
        - 2 Low + 1 High -> Poor
        """
        
        # Use the exact column names found in your data
        nitrogen_cols = ['total_Nitrogen_percent_Class', 'total_nitrogen_percent_class', 'nitrogen_class', 'total_nitrogen_class']
        phosphorus_cols = ['phosphorus_Olsen_ppm_Class', 'phosphorus_olsen_ppm_class', 'phosphorus_class', 'p_class']
        potassium_cols = ['potassium_meq_percent_Class', 'potassium_meq_percent_class', 'potassium_class', 'k_class']
        
        # Find the correct column names
        n_class = None
        p_class = None
        k_class = None
        
        for col in nitrogen_cols:
            if col in row.index:
                n_class = row[col]
                break
        
        for col in phosphorus_cols:
            if col in row.index:
                p_class = row[col]
                break
                
        for col in potassium_cols:
            if col in row.index:
                k_class = row[col]
                break
        
        # If we couldn't find the columns, raise an error with helpful info
        if n_class is None or p_class is None or k_class is None:
            available_cols = list(row.index)
            npk_related = [col for col in available_cols if any(nutrient in col.lower() 
                          for nutrient in ['nitrogen', 'phosphorus', 'potassium']) and 'class' in col.lower()]
            raise KeyError(f"Could not find NPK class columns. Available NPK-related columns: {npk_related}")
        
        # Convert to lowercase for consistent comparison
        n_class = str(n_class).lower()
        p_class = str(p_class).lower()
        k_class = str(k_class).lower()
        
        # Count high and low values
        npk_values = [n_class, p_class, k_class]
        high_count = npk_values.count('high')
        low_count = npk_values.count('low')
        
        # Classification based on counts
        if high_count == 3:  # All high
            return 'Healthy'
        elif low_count == 3:  # All low
            return 'Very Poor'
        elif high_count == 2 and low_count == 1:  # 2 high, 1 low
            return 'Moderately Healthy'
        elif low_count == 2 and high_count == 1:  # 2 low, 1 high
            return 'Poor'
        else:
            # Handle any other cases (e.g., medium values if they exist)
            return 'Other'
    
    # Apply the classification function
    df_copy['soilfertilitystatus'] = df_copy.apply(classify_fertility, axis=1)
    
    return df_copy

# Example usage and verification
def analyze_fertility_distribution(df):
    """
    Analyze the distribution of soil fertility status
    """
    
    print("Soil Fertility Status Distribution:")
    print("=" * 40)
    
    # Count distribution
    fertility_counts = df['soilfertilitystatus'].value_counts()
    fertility_percentages = df['soilfertilitystatus'].value_counts(normalize=True) * 100
    
    for status in fertility_counts.index:
        count = fertility_counts[status]
        percentage = fertility_percentages[status]
        print(f"{status}: {count:,} samples ({percentage:.2f}%)")
    
    print(f"\nTotal samples: {len(df):,}")
    
    return fertility_counts

def get_npk_column_names(df):
    """
    Get the actual NPK class column names from the dataframe
    """
    npk_cols = {'nitrogen': None, 'phosphorus': None, 'potassium': None}
    
    for col in df.columns:
        col_lower = col.lower()
        if 'nitrogen' in col_lower and 'class' in col_lower:
            npk_cols['nitrogen'] = col
        elif 'phosphorus' in col_lower and 'class' in col_lower:
            npk_cols['phosphorus'] = col
        elif 'potassium' in col_lower and 'class' in col_lower:
            npk_cols['potassium'] = col
    
    return npk_cols

def verify_classification_logic(df):
    """
    Verify that the classification logic is working correctly
    """
    
    # Get the actual column names
    npk_cols = get_npk_column_names(df)
    
    print("\nClassification Verification:")
    print("=" * 30)
    print(f"Using columns: N='{npk_cols['nitrogen']}', P='{npk_cols['phosphorus']}', K='{npk_cols['potassium']}'")
    
    # Define the order for better presentation
    status_order = ['Healthy', 'Moderately Healthy', 'Poor', 'Very Poor', 'Other']
    
    for status in status_order:
        if status in df['soilfertilitystatus'].values:
            status_data = df[df['soilfertilitystatus'] == status]
            status_npk = status_data[[npk_cols['nitrogen'], 
                                    npk_cols['phosphorus'], 
                                    npk_cols['potassium']]].drop_duplicates()
            
            print(f"\n{status} samples: {len(status_data):,}")
            print(f"NPK combinations for {status}:")
            if len(status_npk) <= 15:  # Show all if few combinations
                print(status_npk.to_string(index=False))
            else:  # Show first 15 if many combinations
                print(status_npk.head(15).to_string(index=False))
                print(f"... and {len(status_npk) - 15} more combinations")
    
    # Show classification summary
    print(f"\nClassification Summary:")
    print("=" * 25)
    print("Healthy: All 3 nutrients HIGH")
    print("Moderately Healthy: 2 nutrients HIGH, 1 LOW") 
    print("Poor: 2 nutrients LOW, 1 HIGH")
    print("Very Poor: All 3 nutrients LOW")
    if 'Other' in df['soilfertilitystatus'].values:
        print("Other: Unexpected combinations (check data quality)")

# Main execution
if __name__ == "__main__":
    # Assuming your dataframe is called 'df'
    df = pd.read_csv('/teamspace/studios/this_studio/Fertiliser_Modelling/data/all_karlo_data_cleaned_no_missing_and_cleaned_NPK_data.csv')  # Load your data
    
    # Create the soil fertility status column
    df_with_fertility = create_soil_fertility_status(df)
    
    # Analyze the results
    fertility_distribution = analyze_fertility_distribution(df_with_fertility)
    
    # Verify the classification logic
    verify_classification_logic(df_with_fertility)
    
    # Optional: Save the updated dataframe
    df_with_fertility.to_csv('All_karlo_cleaned_no_missing_soil_data_with_fertility_status2.csv', index=False)
    
    print(f"\nNew column 'soilfertilitystatus' has been added to the dataframe.")
    print(f"Updated dataframe shape: {df_with_fertility.shape}")
import pandas as pd
import numpy as np

def identify_duplicate_columns(excel_file_path, sheet_name=0):
    """
    Analyzes an Excel file to identify duplicate columns based on content.
    
    Parameters:
    -----------
    excel_file_path : str
        Path to the Excel file
    sheet_name : str or int, default 0
        Name or index of the sheet to analyze
        
    Returns:
    --------
    tuple
        (df, duplicate_groups, content_duplicates, name_duplicates)
    """
    # Read the Excel file
    print(f"Reading file: {excel_file_path}")
    df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
    
    print(f"DataFrame shape: {df.shape}")
    print(f"Number of columns: {len(df.columns)}")
    print(f"Column names: {list(df.columns)}")
    
    # Check for duplicate column names
    name_duplicates = {}
    seen_names = {}
    
    for i, col_name in enumerate(df.columns):
        if col_name in seen_names:
            if col_name not in name_duplicates:
                name_duplicates[col_name] = [seen_names[col_name]]
            name_duplicates[col_name].append(i)
        else:
            seen_names[col_name] = i
            
    # Check for content duplicates (columns with identical values)
    content_duplicates = {}
    duplicate_groups = []
    
    # Convert DataFrame to numpy array for faster comparison
    df_values = df.values
    n_cols = df.shape[1]
    col_names = list(df.columns)
    
    # Compare each pair of columns
    for i in range(n_cols):
        # Skip if this column is already identified as a duplicate
        if any(i in group for group in duplicate_groups):
            continue
            
        current_group = [i]
        
        for j in range(i + 1, n_cols):
            # Skip if this column is already identified as a duplicate
            if any(j in group for group in duplicate_groups):
                continue
                
            # Compare column values
            if np.array_equal(df_values[:, i], df_values[:, j]):
                current_group.append(j)
                
        if len(current_group) > 1:
            # This means we found duplicate columns
            duplicate_col_names = [col_names[idx] for idx in current_group]
            content_duplicates[col_names[i]] = duplicate_col_names
            duplicate_groups.append(current_group)
    
    # Print report
    print("\n=== DUPLICATE COLUMN REPORT ===")
    
    if name_duplicates:
        print("\nColumns with duplicate names:")
        for name, indices in name_duplicates.items():
            print(f"  • '{name}' appears {len(indices)} times at positions: {indices}")
    else:
        print("\nNo columns with duplicate names found.")
        
    if content_duplicates:
        print("\nColumns with identical content:")
        for name, dupes in content_duplicates.items():
            print(f"  • '{name}' has identical values with: {dupes[1:]}")
            # Show a sample of values from these columns
            sample_values = df[name].head(3).tolist()
            print(f"    Sample values: {sample_values}")
    else:
        print("\nNo columns with identical content found.")
        
    if not name_duplicates and not content_duplicates:
        print("\nNo duplicate columns detected in the dataset.")
        
    return df, duplicate_groups, content_duplicates, name_duplicates

# Example usage
if __name__ == "__main__":
    # Replace with your Excel file path
    excel_file_path = "/teamspace/uploads/Soil Data -Oscar.xlsx"
    
    # Run the analysis
    identify_duplicate_columns(excel_file_path)
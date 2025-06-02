import pandas as pd
import numpy as np
import os

def remove_duplicate_columns(excel_file_path, sheet_name=0, output_file_path=None):
    """
    Analyzes an Excel file to identify and remove duplicate columns, saving the cleaned data.
    
    Parameters:
    -----------
    excel_file_path : str
        Path to the Excel file
    sheet_name : str or int, default 0
        Name or index of the sheet to analyze
    output_file_path : str, optional
        Path for the output file. If None, will create a new name based on input file
        
    Returns:
    --------
    tuple
        (cleaned_df, duplicate_groups, content_duplicates, name_duplicates, output_path)
    """
    # Read the Excel file
    print(f"Reading file: {excel_file_path}")
    df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
    
    print(f"Original DataFrame shape: {df.shape}")
    print(f"Original number of columns: {len(df.columns)}")
    
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
                
            # Compare column values (handle NaN values properly)
            col_i = df_values[:, i]
            col_j = df_values[:, j]
            
            # Check if columns are identical (considering NaN == NaN)
            if len(col_i) == len(col_j):
                # Use pandas Series comparison which handles NaN properly
                if df.iloc[:, i].equals(df.iloc[:, j]):
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
    
    # Create cleaned DataFrame by removing duplicates
    columns_to_keep = []
    columns_to_remove = []
    
    # Collect all duplicate column indices to remove (keep only the first occurrence)
    for group in duplicate_groups:
        columns_to_keep.append(group[0])  # Keep the first column
        columns_to_remove.extend(group[1:])  # Remove the rest
    
    # Handle name duplicates (keep only the first occurrence)
    for name, indices in name_duplicates.items():
        if indices[0] not in columns_to_remove:  # If first occurrence isn't already marked for removal
            columns_to_remove.extend(indices[1:])  # Remove subsequent occurrences
    
    # Create list of all columns to keep
    all_columns_to_keep = [i for i in range(n_cols) if i not in columns_to_remove]
    
    # Create cleaned DataFrame
    cleaned_df = df.iloc[:, all_columns_to_keep].copy()
    
    print(f"\n=== CLEANING RESULTS ===")
    print(f"Columns removed: {len(columns_to_remove)}")
    print(f"Cleaned DataFrame shape: {cleaned_df.shape}")
    print(f"Columns kept: {len(cleaned_df.columns)}")
    
    if columns_to_remove:
        removed_col_names = [col_names[i] for i in columns_to_remove]
        print(f"Removed column names: {removed_col_names}")
    
    # Generate output file path if not provided
    if output_file_path is None:
        # Get just the filename without path
        filename = os.path.basename(excel_file_path)
        base_name = os.path.splitext(filename)[0]
        extension = os.path.splitext(filename)[1]
        # Save to current working directory instead of source directory
        output_file_path = f"{base_name}_cleaned{extension}"
    
    # Save the cleaned DataFrame
    try:
        if output_file_path.endswith('.xlsx') or output_file_path.endswith('.xls'):
            cleaned_df.to_excel(output_file_path, index=False)
        elif output_file_path.endswith('.csv'):
            cleaned_df.to_csv(output_file_path, index=False)
        else:
            # Default to Excel format
            if not output_file_path.endswith(('.xlsx', '.xls', '.csv')):
                output_file_path += '.xlsx'
            cleaned_df.to_excel(output_file_path, index=False)
            
        print(f"\n✅ Cleaned data saved to: {output_file_path}")
        
    except Exception as e:
        print(f"\n❌ Error saving file: {str(e)}")
        return cleaned_df, duplicate_groups, content_duplicates, name_duplicates, None
        
    if not name_duplicates and not content_duplicates:
        print("\nNo duplicate columns detected in the dataset.")
        print("Original file was already clean - saved as copy.")
        
    return cleaned_df, duplicate_groups, content_duplicates, name_duplicates, output_file_path

def analyze_only(excel_file_path, sheet_name=0):
    """
    Only analyzes duplicates without removing them (original function).
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
                
            # Compare column values (handle NaN values properly)
            if df.iloc[:, i].equals(df.iloc[:, j]):
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
    
    # Option 1: Just analyze duplicates (original functionality)
    print("=== ANALYSIS ONLY ===")
    analyze_only(excel_file_path)
    
    print("\n" + "="*50)
    
    # Option 2: Remove duplicates and save cleaned file
    print("=== REMOVE DUPLICATES AND SAVE ===")
    cleaned_df, duplicate_groups, content_duplicates, name_duplicates, output_path = remove_duplicate_columns(
        excel_file_path, 
        output_file_path="/teamspace/studios/this_studio/cleaned.xlsx"  # Will auto-generate filename
    )
    
    # You can also specify a custom output path to a writable location:
    # output_path = "cleaned_soil_data.xlsx"  # Saves to current directory
    # output_path = "/tmp/cleaned_soil_data.xlsx"  # Saves to tmp directory
    # cleaned_df, _, _, _, _ = remove_duplicate_columns(excel_file_path, output_file_path=output_path)
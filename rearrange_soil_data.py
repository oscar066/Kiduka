import pandas as pd
import numpy as np
from tqdm import tqdm

def rearrange_large_soil_data(input_file, output_file=None, chunk_size=50000):
    """
    Optimized version for large datasets. Processes data in chunks to manage memory efficiently.
    
    Parameters:
    input_file (str): Path to the input CSV file
    output_file (str, optional): Path for the output CSV file
    chunk_size (int): Size of chunks to process at a time
    
    Returns:
    pd.DataFrame: Pivoted DataFrame with lat/long as rows and properties as columns
    """
    
    print(f"Processing large dataset: {input_file}")
    print("Reading data in chunks for memory efficiency...")
    
    # First pass: Get unique properties and locations to understand structure
    print("First pass: Analyzing data structure...")
    unique_properties = set()
    unique_locations = set()
    total_rows = 0
    
    for chunk in tqdm(pd.read_csv(input_file, chunksize=chunk_size), desc="Analyzing structure"):
        unique_properties.update(chunk['property'].unique())
        unique_locations.update(zip(chunk['lat'], chunk['lon']))
        total_rows += len(chunk)
    
    print(f"Analysis complete:")
    print(f"- Total rows: {total_rows:,}")
    print(f"- Unique properties: {len(unique_properties)}")
    print(f"- Unique locations: {len(unique_locations):,}")
    print(f"- Properties: {sorted(list(unique_properties))}")
    
    # Second pass: Process and pivot data
    print("\nSecond pass: Processing and pivoting data...")
    
    all_data = []
    
    for chunk in tqdm(pd.read_csv(input_file, chunksize=chunk_size), desc="Processing chunks"):
        # Group by location and property within each chunk
        chunk_pivot = chunk.groupby(['lat', 'lon', 'property']).agg({
            'value': 'mean',  # Average multiple measurements
            'unit': 'first',
            'original_name': 'first',
            'upper_depth_cm': 'first',
            'lower_depth_cm': 'first',
            'sampling_date': 'first',
            'license': 'first',
            'h3_index': 'first',
            'publication_date': 'first',
            'data_source': 'first',
            'id': 'first'
        }).reset_index()
        
        all_data.append(chunk_pivot)
    
    # Combine all chunks
    print("Combining processed chunks...")
    combined_data = pd.concat(all_data, ignore_index=True)
    
    # Final groupby to handle any remaining duplicates across chunks
    print("Final aggregation across chunks...")
    final_data = combined_data.groupby(['lat', 'lon', 'property']).agg({
        'value': 'mean',
        'unit': 'first',
        'original_name': 'first',
        'upper_depth_cm': 'first',
        'lower_depth_cm': 'first',
        'sampling_date': 'first',
        'license': 'first',
        'h3_index': 'first',
        'publication_date': 'first',
        'data_source': 'first',
        'id': 'first'
    }).reset_index()
    
    # Create the pivot table
    print("Creating final pivot table...")
    
    # Pivot the main values
    value_pivot = final_data.pivot_table(
        index=['lat', 'lon'], 
        columns='property', 
        values='value',
        aggfunc='first'
    )
    
    # Get the metadata for each location
    metadata = final_data.groupby(['lat', 'lon']).agg({
        'upper_depth_cm': 'first',
        'lower_depth_cm': 'first',
        'sampling_date': 'first',
        'license': 'first',
        'h3_index': 'first',
        'publication_date': 'first',
        'data_source': 'first'
    }).reset_index()
    
    # Reset index and merge
    value_pivot = value_pivot.reset_index()
    result = pd.merge(metadata, value_pivot, on=['lat', 'lon'])
    
    # Clean up column names
    property_columns = [col for col in result.columns if col not in ['lat', 'lon', 'upper_depth_cm', 'lower_depth_cm', 'sampling_date', 'license', 'h3_index', 'publication_date', 'data_source']]
    
    print(f"Final pivoted data shape: {result.shape}")
    print(f"Property columns created: {len(property_columns)}")
    
    # Save to file if output path is provided
    if output_file:
        print(f"Saving to {output_file}...")
        result.to_csv(output_file, index=False)
        print("File saved successfully!")
    
    return result

def create_comprehensive_units_reference(input_file, output_file=None):
    """
    Create a comprehensive reference table with property statistics.
    """
    print("Creating comprehensive units and statistics reference...")
    
    # Read in chunks to handle large file
    all_stats = []
    
    for chunk in tqdm(pd.read_csv(input_file, chunksize=50000), desc="Processing for stats"):
        chunk_stats = chunk.groupby('property').agg({
            'unit': 'first',
            'original_name': 'first',
            'value': ['count', 'mean', 'std', 'min', 'max'],
            'upper_depth_cm': 'first',
            'lower_depth_cm': 'first'
        })
        
        # Flatten column names
        chunk_stats.columns = ['_'.join(col).strip() if col[1] else col[0] for col in chunk_stats.columns.values]
        chunk_stats = chunk_stats.reset_index()
        all_stats.append(chunk_stats)
    
    # Combine and aggregate final statistics
    combined_stats = pd.concat(all_stats, ignore_index=True)
    
    final_stats = combined_stats.groupby('property').agg({
        'unit_first': 'first',
        'original_name_first': 'first',
        'value_count': 'sum',
        'value_mean': 'mean',
        'value_std': 'mean',
        'value_min': 'min',
        'value_max': 'max',
        'upper_depth_cm_first': 'first',
        'lower_depth_cm_first': 'first'
    }).reset_index()
    
    # Rename columns for clarity
    final_stats.columns = ['property', 'unit', 'original_name', 'measurement_count', 
                          'mean_value', 'std_value', 'min_value', 'max_value',
                          'upper_depth_cm', 'lower_depth_cm']
    
    if output_file:
        final_stats.to_csv(output_file, index=False)
        print(f"Comprehensive reference saved to {output_file}")
    
    return final_stats

# Main execution
if __name__ == "__main__":
    input_file = '/teamspace/uploads/output_data_points.csv'
    output_file = 'soil_data_pivoted.csv'
    stats_file = 'property_comprehensive_reference.csv'
    
    try:
        print("=== OPTIMIZED SOIL DATA REARRANGEMENT ===")
        print(f"Input: {input_file} (160,603 rows expected)")
        
        # Process the large dataset
        pivoted_df = rearrange_large_soil_data(input_file, output_file)
        
        # Create comprehensive reference
        stats_df = create_comprehensive_units_reference(input_file, stats_file)
        
        # Display results
        print("\n=== RESULTS SUMMARY ===")
        print(f"✓ Original data: 160,603 rows × 14 columns")
        print(f"✓ Pivoted data: {pivoted_df.shape[0]:,} rows × {pivoted_df.shape[1]} columns")
        print(f"✓ Data reduction: {160603 / pivoted_df.shape[0]:.1f}x fewer rows")
        print(f"✓ Properties as columns: {pivoted_df.shape[1] - 8}")
        
        print(f"\n=== OUTPUT FILES ===")
        print(f"✓ Main pivoted data: {output_file}")
        print(f"✓ Property reference: {stats_file}")
        
        print(f"\n=== SAMPLE DATA ===")
        print("First few rows of pivoted data:")
        print(pivoted_df.head(3))
        
        print(f"\nProperty statistics:")
        print(stats_df.head())
        
        print(f"\n=== COLUMN NAMES ===")
        print("Metadata columns:", [col for col in pivoted_df.columns if col in ['lat', 'lon', 'upper_depth_cm', 'lower_depth_cm', 'sampling_date', 'license', 'h3_index', 'publication_date', 'data_source']])
        print("Property columns:", [col for col in pivoted_df.columns if col not in ['lat', 'lon', 'upper_depth_cm', 'lower_depth_cm', 'sampling_date', 'license', 'h3_index', 'publication_date', 'data_source']][:10], "...")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
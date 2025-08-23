#!/usr/bin/env python3
"""
Inspect the fetched CDC data to see what we're working with
"""

import pandas as pd
import os

def inspect_datasets():
    """Inspect all the CSV files we downloaded"""
    
    csv_files = [
        'county_data_2024_data.csv',
        'county_data_2023_data.csv', 
        'places_data_data.csv'
    ]
    
    for filename in csv_files:
        filepath = f"raw/{filename}"
        if os.path.exists(filepath):
            print(f"\n" + "="*60)
            print(f"INSPECTING: {filename}")
            print("="*60)
            
            try:
                df = pd.read_csv(filepath)
                
                print(f"Shape: {df.shape}")
                print(f"Columns: {list(df.columns)}")
                
                # Check key columns
                key_cols = ['measure', 'stateabbr', 'locationname', 'category', 'data_value']
                
                for col in key_cols:
                    if col in df.columns:
                        unique_count = df[col].nunique()
                        print(f"\n{col}: {unique_count} unique values")
                        
                        if col == 'measure' and unique_count < 50:
                            measures = sorted(df[col].unique())
                            print(f"  Measures: {measures}")
                        elif col == 'stateabbr':
                            states = sorted(df[col].unique())
                            print(f"  States: {states[:10]}..." if len(states) > 10 else f"  States: {states}")
                        elif col == 'category':
                            categories = sorted(df[col].unique())
                            print(f"  Categories: {categories}")
                        elif col == 'data_value':
                            print(f"  Data value range: {df[col].min():.1f} - {df[col].max():.1f}")
                            print(f"  Non-null values: {df[col].count()} / {len(df)}")
                
                # Sample a few rows
                print(f"\nSample data (first 3 rows):")
                print(df.head(3).to_string())
                
            except Exception as e:
                print(f"Error reading {filename}: {e}")
        else:
            print(f"File not found: {filepath}")
    
    # Recommendation
    print(f"\n" + "="*60)
    print("RECOMMENDATION:")
    print("="*60)
    print("Based on the data structure, here's what I suggest:")
    print("1. Use county_data_2024_data.csv as your main dataset")
    print("2. Focus on key health measures like DIABETES, OBESITY, CHD")
    print("3. Each row is one measure for one county")
    print("4. You'll need to pivot/filter the data for each dashboard")

if __name__ == "__main__":
    inspect_datasets()
"""
Simple CDC PLACES Data Fetcher - Pull Everything
"""

import requests
import pandas as pd
import json
import os
from datetime import datetime

def fetch_all_cdc_data():
    """Fetch ALL CDC PLACES data without filtering"""
    
    print("Fetching ALL CDC PLACES data...")
    
    # Try the main county dataset first
    endpoints = [
        {
            "name": "county_data_2024",
            "url": "https://data.cdc.gov/resource/swc5-untb.json",
            "description": "County Data 2024"
        },
        {
            "name": "county_data_2023", 
            "url": "https://data.cdc.gov/resource/cwsq-ngmh.json",
            "description": "County Data 2023"
        },
        {
            "name": "places_data",
            "url": "https://data.cdc.gov/resource/eav7-hnsx.json", 
            "description": "Places/Cities Data"
        }
    ]
    
    os.makedirs("raw", exist_ok=True)
    
    for endpoint in endpoints:
        print(f"\nTrying {endpoint['description']}...")
        print(f"URL: {endpoint['url']}")
        
        try:
            # Start with a small sample to see structure
            print("Getting sample (100 records)...")
            response = requests.get(endpoint['url'], 
                                  params={"$limit": 100}, 
                                  timeout=30)
            response.raise_for_status()
            
            sample_data = response.json()
            print(f"Sample size: {len(sample_data)} records")
            
            if sample_data:
                # Save sample for inspection
                sample_file = f"raw/{endpoint['name']}_sample.json"
                with open(sample_file, 'w') as f:
                    json.dump(sample_data, f, indent=2)
                print(f"Saved sample: {sample_file}")
                
                # Show structure
                if len(sample_data) > 0:
                    print("Sample record structure:")
                    print(f"Keys: {list(sample_data[0].keys())}")
                    
                    # Try to get more data
                    print("Getting larger dataset (10000 records)...")
                    response_large = requests.get(endpoint['url'], 
                                                params={"$limit": 10000}, 
                                                timeout=60)
                    response_large.raise_for_status()
                    large_data = response_large.json()
                    
                    print(f"Large dataset size: {len(large_data)} records")
                    
                    # Convert to DataFrame and save as CSV
                    df = pd.DataFrame(large_data)
                    csv_file = f"raw/{endpoint['name']}_data.csv"
                    df.to_csv(csv_file, index=False)
                    print(f"Saved CSV: {csv_file}")
                    
                    # Save full JSON too
                    json_file = f"raw/{endpoint['name']}_data.json"
                    with open(json_file, 'w') as f:
                        json.dump(large_data, f, indent=2)
                    print(f"Saved JSON: {json_file}")
                    
                    # Show basic info
                    print(f"DataFrame shape: {df.shape}")
                    print(f"Columns: {list(df.columns)}")
                    
                    # Show some sample values for key columns
                    for col in ['measure', 'stateabbr', 'category', 'data_value'][:4]:
                        if col in df.columns:
                            unique_vals = df[col].nunique()
                            print(f"{col}: {unique_vals} unique values")
                            if unique_vals < 20:
                                print(f"  Values: {list(df[col].unique())}")
                            else:
                                print(f"  Sample: {list(df[col].unique()[:5])}...")
                
        except requests.exceptions.RequestException as e:
            print(f"Failed to fetch {endpoint['description']}: {e}")
        except Exception as e:
            print(f"Error processing {endpoint['description']}: {e}")
    
    # Create a summary file
    summary = {
        "fetch_date": datetime.now().isoformat(),
        "endpoints_tried": endpoints,
        "files_created": []
    }
    
    # List all files created
    raw_files = [f for f in os.listdir("raw") if f.endswith(('.csv', '.json'))]
    summary["files_created"] = raw_files
    
    with open("raw/fetch_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n" + "="*50)
    print("Fetch complete!")
    print(f"Files in raw/ directory: {raw_files}")
    print("Check the CSV files to see what data we got.")

if __name__ == "__main__":
    fetch_all_cdc_data()
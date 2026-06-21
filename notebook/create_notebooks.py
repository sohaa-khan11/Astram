import nbformat as nbf
import os

notebook_dir = "/Users/sainath/Desktop/gridlock/astram-parking-intelligence/notebook"

nb = nbf.v4.new_notebook()

nb.cells = [
    nbf.v4.new_markdown_cell("# Phase 1.1: Data Pipeline - Loading and Preprocessing\nThis notebook processes the raw Bengaluru Traffic Police enforcement data."),
    nbf.v4.new_code_cell("""import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

# 1. Load CSV with explicit dtype specifications to avoid pandas type inference errors
csv_path = '../../jan_to_may_police_violation_anonymized.csv' # assuming it's in gridlock root
print(f"Loading data from {csv_path}...")

try:
    df = pd.read_csv(csv_path, dtype={'id': str, 'vehicle_number': str, 'vehicle_type': str, 'device_id': str, 'junction_name': str, 'validation_status': str})
    print("Data loaded successfully.")
except FileNotFoundError:
    print(f"ERROR: File not found at {csv_path}. Please place the file in the gridlock directory.")
    # Exit or halt here ideally, but continuing for structure setup
    df = pd.DataFrame()
"""),
    nbf.v4.new_code_cell("""if not df.empty:
    print("DataFrame Info:")
    df.info()
    print("\\n\\nUnique Values:")
    print(df.nunique())
    print(f"\\nActual row count: {len(df)}")
"""),
    nbf.v4.new_markdown_cell("## 1.2 Parsing JSON and Timezones"),
    nbf.v4.new_code_cell("""def safe_json_load(x):
    if pd.isna(x):
        return []
    try:
        return json.loads(x)
    except:
        return []

if not df.empty:
    df['violation_list'] = df['violation_type'].apply(safe_json_load)
    df['offence_code_list'] = df['offence_code'].apply(safe_json_load)
    
    # 3. Convert timestamps to IST
    df['created_datetime'] = pd.to_datetime(df['created_datetime'], format='mixed', utc=True)
    df['vist_ist'] = df['created_datetime'] + pd.Timedelta(hours=5, minutes=30)
    
    print("Distribution of violation_count per row:")
    df['violation_count'] = df['violation_list'].apply(len)
    print(df['violation_count'].value_counts(normalize=True) * 100)
"""),
    nbf.v4.new_markdown_cell("## 1.3 Filtering In-Scope Parking Violations"),
    nbf.v4.new_code_cell("""in_scope_violations = [
    'WRONG PARKING', 'NO PARKING', 'PARKING IN A MAIN ROAD', 
    'PARKING ON FOOTPATH', 'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC', 
    'DOUBLE PARKING', 'PARKING NEAR ROAD CROSSING', 
    'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS', 
    'PARKING OPPOSITE TO ANOTHER PARKED VEHICLE', 
    'PARKING OTHER THAN BUS STOP', 'H T V PROHIBITED', 
    'AGAINST ONE WAY/NO ENTRY'
]

if not df.empty:
    def has_in_scope(vlist):
        for v in vlist:
            if v in in_scope_violations:
                return True
        return False
        
    initial_count = len(df)
    df['is_parking'] = df['violation_list'].apply(has_in_scope)
    df_filtered = df[df['is_parking']].copy()
    
    print(f"Filtered from {initial_count} to {len(df_filtered)} in-scope parking violation rows.")
    
    # Get primary violation
    def get_primary(vlist):
        for v in vlist:
            if v in in_scope_violations:
                return v
        return vlist[0] if vlist else None
        
    df_filtered['primary_violation'] = df_filtered['violation_list'].apply(get_primary)
    print("\\nTop 5 violation types in filtered data:")
    print(df_filtered['primary_violation'].value_counts().head(5))
"""),
    nbf.v4.new_markdown_cell("## 1.4 Derive Engineered Features"),
    nbf.v4.new_code_cell("""if not df.empty:
    df_filtered['hour_ist'] = df_filtered['vist_ist'].dt.hour
    df_filtered['dow'] = df_filtered['vist_ist'].dt.dayofweek
    df_filtered['is_weekend'] = df_filtered['dow'].isin([5, 6])
    
    df_filtered['has_junction'] = df_filtered['junction_name'] != "No Junction"
    
    # Repeat plate counter
    plate_counts = df_filtered['vehicle_number'].value_counts()
    df_filtered['repeat_plate'] = df_filtered['vehicle_number'].map(plate_counts).fillna(1)
    
    # Device mode mapping
    device_junction_counts = df_filtered.groupby('device_id')['junction_name'].nunique()
    df_filtered['device_mode'] = df_filtered['device_id'].map(lambda x: 'STATIC' if device_junction_counts.get(x, 0) == 1 else 'MOBILE')
    
    print("Device modes:")
    print(df_filtered['device_mode'].value_counts())
"""),
    nbf.v4.new_markdown_cell("## 1.5 Footprint and Severity Tables"),
    nbf.v4.new_code_cell("""footprint_weights = {
    'SCOOTER': 0.3, 'MOPED': 0.3,
    'MOTOR CYCLE': 0.35,
    'PASSENGER AUTO': 0.5,
    'CAR': 0.7, 'JEEP': 0.7,
    'TAXI': 0.75, 'OMNI BUS (SMALL)': 0.75,
    'LGV': 0.85, 'TEMPO': 0.85, 'GOODS AUTO': 0.85,
    'VAN': 0.9, 'MAXI-CAB': 0.9,
    'LORRY': 1.0, 'TRUCK': 1.0,
    'BUS': 1.0, 'OMNI BUS': 1.0
}

severity_weights = {
    'DOUBLE PARKING': 1.0,
    'PARKING NEAR ROAD CROSSING': 0.95,
    'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS': 0.95,
    'PARKING ON FOOTPATH': 0.85,
    'PARKING OPPOSITE TO ANOTHER PARKED VEHICLE': 0.85,
    'PARKING IN A MAIN ROAD': 0.8,
    'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC': 0.75,
    'H T V PROHIBITED': 0.75,
    'WRONG PARKING': 0.6, 'NO PARKING': 0.6,
    'PARKING OTHER THAN BUS STOP': 0.55,
    'AGAINST ONE WAY/NO ENTRY': 0.7
}

if not df.empty:
    def get_footprint(vtype):
        if pd.isna(vtype): return 0.5
        for k, v in footprint_weights.items():
            if k in vtype: return v
        return 0.5 # default
        
    df_filtered['vehicle_footprint'] = df_filtered['vehicle_type'].apply(get_footprint)
    df_filtered['severity_score'] = df_filtered['primary_violation'].map(severity_weights).fillna(0.5)
    
    # Save the processed data for next notebook
    output_path = 'exports/processed_violations.parquet'
    df_filtered.to_parquet(output_path, index=False)
    print(f"Saved processed data to {output_path}")
""")
]

with open(os.path.join(notebook_dir, "01_data_pipeline.ipynb"), 'w') as f:
    nbf.write(nb, f)

print("Created 01_data_pipeline.ipynb")

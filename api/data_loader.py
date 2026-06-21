import json
import pandas as pd

import os

class DataLoader:
    def __init__(self):
        self.hotspots = []
        self.stations = []
        self.metrics = {}
        self.df_clustered = None

    def load_all(self, base_path=None):
        if base_path is None:
            base_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "notebook", "exports")
        print(f"Loading precomputed data from {base_path}...")
        try:
            with open(f"{base_path}/hotspots.json", 'r') as f:
                self.hotspots = json.load(f)
            
            with open(f"{base_path}/triage_metrics.json", 'r') as f:
                self.metrics = json.load(f)
                
            self.df_clustered = pd.read_parquet(f"{base_path}/clustered_violations.parquet")
            
            # Generate stations rollup
            self.stations = self._generate_station_rollup()
            print("Data loaded successfully.")
        except Exception as e:
            print(f"Error loading data: {e}")

    def _generate_station_rollup(self):
        if self.df_clustered is None: return []
        rollup = self.df_clustered.groupby('police_station').agg(
            total_violations=('id', 'count'),
            cluster_count=('cluster_id', lambda x: x[x>=0].nunique()),
            rejected_pct=('validation_status', lambda x: (x == 'rejected').mean())
        ).reset_index()
        
        # Merge top hotspot
        hs_df = pd.DataFrame(self.hotspots)
        if not hs_df.empty:
            top_hs = hs_df.sort_values('impact_score', ascending=False).groupby('police_station').first().reset_index()
            top_hs_map = dict(zip(top_hs['police_station'], top_hs['cluster_id']))
            rollup['top_hotspot_id'] = rollup['police_station'].map(top_hs_map)
        else:
            rollup['top_hotspot_id'] = None

        return rollup.to_dict(orient='records')

data_store = DataLoader()

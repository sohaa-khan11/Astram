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
            # Support DATA_DIR env var for cloud deployments (e.g. Render)
            env_data_dir = os.environ.get("DATA_DIR")
            if env_data_dir:
                base_path = env_data_dir
            else:
                base_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "notebook", "exports")
        print(f"Loading precomputed data from {base_path}...")
        
        # Load hotspots.json
        hotspots_path = os.path.join(base_path, "hotspots.json")
        if os.path.exists(hotspots_path):
            try:
                with open(hotspots_path, 'r') as f:
                    self.hotspots = json.load(f)
                print(f"hotspots.json loaded successfully. ({len(self.hotspots)} hotspots)")
            except Exception as e:
                print(f"Error loading hotspots.json: {e}")
                self.hotspots = []
        else:
            print(f"hotspots.json not found at {hotspots_path}, using empty list")
            self.hotspots = []

        # Load triage_metrics.json
        triage_metrics_path = os.path.join(base_path, "triage_metrics.json")
        if os.path.exists(triage_metrics_path):
            try:
                with open(triage_metrics_path, 'r') as f:
                    self.metrics = json.load(f)
                print("triage_metrics.json loaded successfully.")
            except Exception as e:
                print(f"Error loading triage_metrics.json: {e}")
                self.metrics = {}
        else:
            print("triage_metrics.json not found, using empty dict")
            self.metrics = {}

        # Load clustered_violations.parquet
        clustered_path = os.path.join(base_path, "clustered_violations.parquet")
        if os.path.exists(clustered_path):
            try:
                self.df_clustered = pd.read_parquet(clustered_path)
                print(f"clustered_violations.parquet loaded successfully. ({len(self.df_clustered)} rows)")
            except Exception as e:
                print(f"Error loading clustered_violations.parquet: {e}")
                self.df_clustered = None
        else:
            print(f"clustered_violations.parquet not found at {clustered_path}, using None")
            self.df_clustered = None
            
        # Generate stations rollup
        try:
            self.stations = self._generate_station_rollup()
        except Exception as e:
            print(f"Error generating station rollup: {e}")
            self.stations = []

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

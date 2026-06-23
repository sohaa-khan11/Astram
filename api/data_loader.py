import json
import pandas as pd
import os

class DataLoader:
    def __init__(self):
        self.hotspots = []
        self.metrics = {}
        self._df_clustered = None
        self._stations = None
        self.clustered_path = None

    def load_all(self, base_path=None):
        if base_path is None:
            # Support DATA_DIR env var for cloud deployments (e.g. Render)
            env_data_dir = os.environ.get("DATA_DIR")
            if env_data_dir:
                base_path = env_data_dir
            else:
                base_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "notebook", "exports")
        print(f"Loading precomputed data from {base_path}...")
        
        # Load hotspots.json (Lightweight, load at boot)
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

        # Load triage_metrics.json (Lightweight, load at boot)
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

        # Save path for lazy loading
        self.clustered_path = os.path.join(base_path, "clustered_violations.parquet")
        self._df_clustered = None
        self._stations = None

    @property
    def df_clustered(self):
        # Lazy load the massive parquet file only when an endpoint requests it
        if self._df_clustered is None and self.clustered_path and os.path.exists(self.clustered_path):
            # Only load the columns actually queried by the API to stay under 512MB RAM
            cols = [
                'id', 'police_station', 'cluster_id', 'validation_status',
                'vist_ist', 'latitude', 'longitude', 'violation_list',
                'hour_ist', 'violation_count', 'vehicle_number', 'vehicle_type',
                'primary_violation', 'severity_score', 'created_datetime',
                'location', 'violation_type', 'device_id', 'junction_name'
            ]
            try:
                self._df_clustered = pd.read_parquet(self.clustered_path, columns=cols, dtype_backend='pyarrow')
                print(f"Lazy loaded clustered_violations.parquet. ({len(self._df_clustered)} rows)")
            except Exception as e:
                print(f"Error lazy loading clustered_violations.parquet: {e}")
                self._df_clustered = None
        return self._df_clustered

    @property
    def stations(self):
        # Lazy generate station rollup
        if self._stations is None:
            try:
                self._stations = self._generate_station_rollup()
            except Exception as e:
                print(f"Error generating station rollup: {e}")
                self._stations = []
        return self._stations

    def _generate_station_rollup(self):
        df = self.df_clustered
        if df is None: return []
        
        # Optimize calculations to avoid PyArrow groupby type-coercion issues
        df_temp = df[['police_station', 'id', 'cluster_id', 'validation_status']].copy()
        df_temp['is_rejected'] = (df_temp['validation_status'] == 'rejected').fillna(False).astype('float64')
        
        rollup = df_temp.groupby('police_station').agg(
            total_violations=('id', 'count'),
            cluster_count=('cluster_id', lambda x: int(x[x>=0].nunique())),
            rejected_pct=('is_rejected', 'mean')
        ).reset_index()
        
        # Explicitly cast to standard python dtypes for compatibility
        rollup['police_station'] = rollup['police_station'].astype(str)
        rollup['total_violations'] = rollup['total_violations'].astype('int64')
        rollup['cluster_count'] = rollup['cluster_count'].astype('int64')
        rollup['rejected_pct'] = rollup['rejected_pct'].astype('float64')
        
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

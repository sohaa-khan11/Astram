import pandas as pd
from typing import List, Dict, Any
import numpy as np
from .models import SimulationEvent

def get_ticks(df: pd.DataFrame, start_iso: str, end_iso: str) -> List[Dict[str, Any]]:
    """Return all violations in the given time window, sorted by time."""
    if df is None or df.empty:
        return []
    
    # We parse the incoming times as UTC, then filter against created_datetime
    start = pd.to_datetime(start_iso)
    if start.tzinfo is None: start = start.tz_localize('UTC')
    else: start = start.tz_convert('UTC')
    end = pd.to_datetime(end_iso)
    if end.tzinfo is None: end = end.tz_localize('UTC')
    else: end = end.tz_convert('UTC')
    
    # Ensure df has created_datetime
    if 'created_datetime' not in df.columns:
        return []
        
    # Ensure df column is tz-aware
    if df['created_datetime'].dt.tz is None:
        df['created_datetime'] = df['created_datetime'].dt.tz_localize('UTC')
    
    mask = (df['created_datetime'] >= start) & (df['created_datetime'] < end)
    tick_df = df[mask].sort_values('created_datetime')
    
    if tick_df.empty:
        return []
        
    events = []
    for _, row in tick_df.iterrows():
        events.append({
            "id": row['id'],
            "latitude": row['latitude'],
            "longitude": row['longitude'],
            "created_datetime": row['created_datetime'].isoformat() if pd.notnull(row['created_datetime']) else "",
            "violation_list": row['violation_list'].tolist() if isinstance(row['violation_list'], np.ndarray) else list(row['violation_list']),
            "cluster_id": int(row['cluster_id'])
        })
    return events

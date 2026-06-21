import nbformat as nbf
import os

notebook_dir = "/Users/sainath/Desktop/gridlock/astram-parking-intelligence/notebook"

# --- 02_clustering.ipynb ---
nb2 = nbf.v4.new_notebook()

nb2.cells = [
    nbf.v4.new_markdown_cell("# Phase 1.7 - 1.8: Spatial Clustering with DBSCAN\nProjecting coordinates and identifying spatial clusters of parking violations."),
    nbf.v4.new_code_cell("""import pandas as pd
import numpy as np
from pyproj import Transformer
from sklearn.cluster import DBSCAN
import warnings
warnings.filterwarnings('ignore')

df = pd.read_parquet('exports/processed_violations.parquet')
print(f"Loaded {len(df)} rows.")
"""),
    nbf.v4.new_markdown_cell("## Coordinate Projection (WGS84 -> UTM Zone 43N)"),
    nbf.v4.new_code_cell("""# WGS84 -> UTM Zone 43N (Bengaluru)
transformer = Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
x, y = transformer.transform(df['longitude'].values, df['latitude'].values)
coords_m = np.column_stack([x, y])
df['x_m'] = x
df['y_m'] = y
print("Coordinates projected successfully.")
"""),
    nbf.v4.new_markdown_cell("## DBSCAN Clustering"),
    nbf.v4.new_code_cell("""# Using 80m eps and min_samples=15
db = DBSCAN(eps=80, min_samples=15, algorithm='ball_tree', metric='euclidean', n_jobs=-1)
df['cluster_id'] = db.fit_predict(coords_m)

n_clusters = len(set(df['cluster_id'])) - (1 if -1 in df['cluster_id'] else 0)
n_noise = list(df['cluster_id']).count(-1)

print(f"DBSCAN produced {n_clusters} clusters, {n_noise} noise points.")

if n_clusters > 0:
    top_cluster = df['cluster_id'].value_counts().index[0]
    if top_cluster == -1 and n_clusters > 0:
        top_cluster = df['cluster_id'].value_counts().index[1]
    top_cluster_count = (df['cluster_id'] == top_cluster).sum()
    top_cluster_loc = df[df['cluster_id'] == top_cluster]['location'].mode()[0]
    print(f"Top cluster (ID {top_cluster}): {top_cluster_loc}, {top_cluster_count} violations.")

df.to_parquet('exports/clustered_violations.parquet', index=False)
print("Saved clustered data to exports/clustered_violations.parquet")
""")
]

with open(os.path.join(notebook_dir, "02_clustering.ipynb"), 'w') as f:
    nbf.write(nb2, f)
print("Created 02_clustering.ipynb")

# --- 03_impact_scoring.ipynb ---
nb3 = nbf.v4.new_notebook()

nb3.cells = [
    nbf.v4.new_markdown_cell("# Phase 1.9: Impact Scoring & Feature Aggregation\nGenerate ImpactScore for each hotspot and export for frontend."),
    nbf.v4.new_code_cell("""import pandas as pd
import numpy as np
from scipy.spatial import ConvexHull
import json

df = pd.read_parquet('exports/clustered_violations.parquet')

# Filter only clustered points (ignore noise)
df_clustered = df[df['cluster_id'] >= 0].copy()
"""),
    nbf.v4.new_markdown_cell("## Compute Cluster Area"),
    nbf.v4.new_code_cell("""def compute_cluster_area(cluster_df):
    pts = cluster_df[['x_m', 'y_m']].dropna().values
    if len(pts) < 3:
        return 100.0 # fallback area in sq meters
    try:
        hull = ConvexHull(pts)
        area = hull.volume # Note: volume of 2D hull is area
        return area if area > 0 else 100.0
    except:
        return 100.0

areas = df_clustered.groupby('cluster_id').apply(compute_cluster_area)
areas.name = 'area_m2'
"""),
    nbf.v4.new_markdown_cell("## Cluster Aggregation"),
    nbf.v4.new_code_cell("""# Entropy helper
def hour_entropy(x):
    counts = x.value_counts(normalize=True)
    return -np.sum(counts * np.log2(counts + 1e-9))

def mode_safe(x):
    m = x.mode()
    return m.iloc[0] if not m.empty else None

def get_junction_name(x):
    # filter out 'No Junction'
    valid = x[x != 'No Junction']
    if not valid.empty:
        return valid.mode().iloc[0]
    return 'Midblock'

# Aggregate
cluster_summary = df_clustered.groupby('cluster_id').agg(
    centroid_lat=('latitude', 'mean'),
    centroid_lon=('longitude', 'mean'),
    violation_count=('id', 'count'),
    dominant_violation=('primary_violation', mode_safe),
    dominant_vehicle=('vehicle_type', mode_safe),
    has_junction_pct=('has_junction', 'mean'),
    mean_severity=('severity_score', 'mean'),
    mean_footprint=('vehicle_footprint', 'mean'),
    repeat_rate=('repeat_plate', lambda x: (x > 1).mean()),
    police_station=('police_station', mode_safe),
    junction_name=('junction_name', get_junction_name),
    temporal_entropy=('hour_ist', hour_entropy)
).reset_index()

cluster_summary = cluster_summary.merge(areas, on='cluster_id')

cluster_summary['cluster_type'] = np.where(cluster_summary['has_junction_pct'] > 0.5, 'Junction Blocking', 'Midblock Spillover')

# Density count per sq km
cluster_summary['density'] = cluster_summary['violation_count'] / (cluster_summary['area_m2'] / 1e6)
"""),
    nbf.v4.new_markdown_cell("## Impact Score Calculation"),
    nbf.v4.new_code_cell("""# Normalize components 0-1
def min_max(s):
    if s.max() == s.min(): return s * 0
    return (s - s.min()) / (s.max() - s.min())

cluster_summary['c_density'] = min_max(cluster_summary['density'])
cluster_summary['c_repeat'] = cluster_summary['repeat_rate']
cluster_summary['c_footprint'] = min_max(cluster_summary['mean_footprint'])
cluster_summary['c_severity'] = min_max(cluster_summary['mean_severity'])
cluster_summary['c_junction'] = cluster_summary['has_junction_pct'] # already 0-1
# Penalty for temporal spread. Entropy max is approx log2(24) = ~4.58. 
# Low entropy = concentrated = blind spot. High entropy = spread = chronic hotspot. 
# We want penalty = 1 - normalized_entropy but the prompt said high entropy -> weight higher.
cluster_summary['c_temporal'] = min_max(cluster_summary['temporal_entropy'])

w1, w2, w3, w4, w5, w6 = 0.30, 0.15, 0.15, 0.20, 0.15, 0.05

cluster_summary['impact_score'] = (
    w1 * cluster_summary['c_density'] +
    w2 * cluster_summary['c_repeat'] +
    w3 * cluster_summary['c_footprint'] +
    w4 * cluster_summary['c_severity'] +
    w5 * cluster_summary['c_junction'] +
    w6 * cluster_summary['c_temporal']
)

# Optional component breakdown JSON
def to_breakdown(row):
    return {
        'density': w1 * row['c_density'],
        'repeat': w2 * row['c_repeat'],
        'footprint': w3 * row['c_footprint'],
        'severity': w4 * row['c_severity'],
        'junction': w5 * row['c_junction'],
        'temporal': w6 * row['c_temporal']
    }
cluster_summary['score_breakdown'] = cluster_summary.apply(to_breakdown, axis=1)

print(f"ImpactScore range: {cluster_summary['impact_score'].min():.4f} - {cluster_summary['impact_score'].max():.4f}")
# Sort by impact score descending
cluster_summary = cluster_summary.sort_values('impact_score', ascending=False)
top3 = cluster_summary.head(3)['police_station'].tolist()
print(f"Top-3 hotspots (by station area): {top3}")

# Save JSON
cluster_summary.to_json('exports/hotspots.json', orient='records', default_handler=str)
print("Saved exports/hotspots.json")
""")
]

with open(os.path.join(notebook_dir, "03_impact_scoring.ipynb"), 'w') as f:
    nbf.write(nb3, f)
print("Created 03_impact_scoring.ipynb")

# --- 04_triage_classifier.ipynb ---
nb4 = nbf.v4.new_notebook()
nb4.cells = [
    nbf.v4.new_markdown_cell("# Phase 1.10: Triage Classifier"),
    nbf.v4.new_code_cell("""import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import json
import warnings
warnings.filterwarnings('ignore')

df = pd.read_parquet('exports/processed_violations.parquet')

# Labeled data
labeled = df[df.validation_status.isin(['approved', 'rejected'])].copy()
labeled['is_approved'] = (labeled.validation_status == 'approved').astype(int)

print(f"Total labeled records: {len(labeled)}")
print(labeled['is_approved'].value_counts(normalize=True))
"""),
    nbf.v4.new_code_cell("""labeled['device_mode_enc'] = (labeled['device_mode'] == 'MOBILE').astype(int)

features = [
    'hour_ist', 'dow', 'is_weekend', 'vehicle_footprint',
    'severity_score', 'violation_count', 'has_junction',
    'device_mode_enc', 'repeat_plate'
]

X = labeled[features]
y = labeled['is_approved']

# Fast training for one fold to get metrics
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
train_idx, test_idx = next(skf.split(X, y))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

model = XGBClassifier(eval_metric='logloss')
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

auc = roc_auc_score(y_test, y_prob)
print(f"Precision/recall/AUC on held-out fold. AUC: {auc:.4f}")

# Export feature importance & metrics
fi = dict(zip(features, map(float, model.feature_importances_)))
metrics = {
    'auc': float(auc),
    'feature_importances': fi,
    'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
}
with open('exports/triage_metrics.json', 'w') as f:
    json.dump(metrics, f)
print("Saved triage_metrics.json")
""")
]

with open(os.path.join(notebook_dir, "04_triage_classifier.ipynb"), 'w') as f:
    nbf.write(nb4, f)
print("Created 04_triage_classifier.ipynb")


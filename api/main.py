from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import uvicorn
import os
import requests
from .data_loader import data_store
from .models import TickRequest, Hotspot, SimulationEvent, TriageRequest, TriageRecord, AnalyzeRequest
from .simulate import get_ticks
from .image_analyzer import analyze_image, get_vehicle_history


import pandas as pd
import numpy as np

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - loads data on startup."""
    data_store.load_all()
    yield

app = FastAPI(title="ASTraM Parking Intelligence API", lifespan=lifespan)

# CORS configuration - restrict to specific origins in production via ALLOWED_ORIGINS env var
# Example: ALLOWED_ORIGINS=https://astram.vercel.app,https://your-custom-domain.com
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the ASTraM Parking Intelligence API",
        "docs_url": "/docs",
        "endpoints": {
            "summary": "/api/summary",
            "hotspots": "/api/hotspots",
            "stations": "/api/stations",
            "triage_queue": "/api/triage/queue"
        }
    }

@app.get("/api/health")
def health_check():
    """Health check endpoint for deployment platforms."""
    return {
        "status": "ok",
        "data_loaded": {
            "hotspots": len(data_store.hotspots),
            "stations": len(data_store.stations),
            "violations_df": len(data_store.df_clustered) if data_store.df_clustered is not None else 0
        }
    }

@app.get("/api/summary")
def get_summary() -> Dict[str, Any]:
    total_violations = 0
    total_clusters = len(data_store.hotspots)
    if data_store.df_clustered is not None:
        total_violations = len(data_store.df_clustered)
    
    # average rejection rate across stations
    mean_rejection_rate = 0.0
    if data_store.stations:
        mean_rejection_rate = float(np.mean([s['rejected_pct'] for s in data_store.stations if s['rejected_pct'] is not None and not pd.isna(s['rejected_pct'])]))

    top_station = None
    if data_store.stations:
        sorted_stations = sorted(data_store.stations, key=lambda x: x['total_violations'], reverse=True)
        if sorted_stations:
            top_station = sorted_stations[0]['police_station']

    return {
        "total_violations": total_violations,
        "total_clusters": total_clusters,
        "top_station": top_station,
        "mean_rejection_rate": mean_rejection_rate
    }

@app.get("/api/hotspots", response_model=List[Hotspot])
def get_hotspots(station: Optional[str] = None, min_score: Optional[float] = None):
    results = data_store.hotspots
    if station:
        results = [h for h in results if h['police_station'] == station]
    if min_score is not None:
        results = [h for h in results if h['impact_score'] >= min_score]
    return results

@app.get("/api/hotspots/{cluster_id}", response_model=Hotspot)
def get_hotspot_detail(cluster_id: int):
    for h in data_store.hotspots:
        if h['cluster_id'] == cluster_id:
            return h
    raise HTTPException(status_code=404, detail="Hotspot not found")

@app.get("/api/hotspots/{cluster_id}/timeline")
def get_hotspot_timeline(cluster_id: int):
    if data_store.df_clustered is None:
        return [{"hour_ist": h, "activity_pct": 0.0} for h in range(24)]
    
    df = data_store.df_clustered
    cluster_df = df[df['cluster_id'] == cluster_id]
    if cluster_df.empty:
        raise HTTPException(status_code=404, detail="Hotspot not found")
        
    counts = cluster_df['hour_ist'].value_counts(normalize=True).sort_index()
    
    timeline = []
    for h in range(24):
        timeline.append({
            "hour_ist": h,
            "activity_pct": float(counts.get(h, 0.0))
        })
    return timeline

@app.get("/api/hotspots/{cluster_id}/recommend")
def get_hotspot_recommendation(cluster_id: int):
    for h in data_store.hotspots:
        if h['cluster_id'] == cluster_id:
            # Simple heuristic matching the prompt
            is_junction = h['has_junction_pct'] > 0.5
            area = h['area_m2']
            if is_junction and area < 5000:
                rec = "STATIC"
                rationale = "High density, junction blocking, narrow spread. Ideal for STATIC camera."
            elif not is_junction and area >= 5000:
                rec = "MOBILE"
                rationale = "Midblock spillover over wider area. MOBILE patrol routing recommended."
            else:
                rec = "TARGETED_PATROL"
                rationale = "Spot-check patrol schedule during peak active hours."
                
            return {
                "recommendation": rec,
                "rationale": rationale
            }
    raise HTTPException(status_code=404, detail="Hotspot not found")

@app.get("/api/hotspots/{cluster_id}/copilot")
def get_hotspot_copilot_recommendation(cluster_id: int):
    # Find the hotspot
    hotspot = None
    for h in data_store.hotspots:
        if h['cluster_id'] == cluster_id:
            hotspot = h
            break
            
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
        
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key and not api_key.startswith("your_") and api_key.strip():
        try:
            stats_summary = (
                f"Hotspot ID: {hotspot['cluster_id']}\n"
                f"Police Station Jurisdiction: {hotspot['police_station']}\n"
                f"Nearby Junction Name: {hotspot['junction_name']}\n"
                f"Total Violation Count: {hotspot['violation_count']}\n"
                f"Dominant Violation: {hotspot['dominant_violation']}\n"
                f"Dominant Vehicle Class: {hotspot['dominant_vehicle']}\n"
                f"Junction Proximity: {hotspot['has_junction_pct'] * 100:.1f}%\n"
                f"Repeat Offender Rate: {hotspot['repeat_rate'] * 100:.1f}%\n"
                f"Mean Footprint: {hotspot['mean_footprint']:.2f}\n"
                f"Mean Offense Severity: {hotspot['mean_severity']:.2f}\n"
                f"Temporal Entropy: {hotspot['temporal_entropy']:.2f}\n"
                f"Estimated Cluster Area: {hotspot['area_m2']:.1f} sq meters\n"
                f"Congestion Impact Score: {hotspot['impact_score']:.1f}/100\n"
            )
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a Traffic Operations Command Copilot for the Bengaluru Traffic Police (BTP).\n"
                            "Analyze the provided statistics of an illegal parking hotspot and generate a professional, highly specific, and actionable recommendation report.\n"
                            "Your report should include:\n"
                            "1. EXECUTIVE SUMMARY: A brief breakdown of why this hotspot is forming and its congestion impact.\n"
                            "2. ENFORCEMENT ACTION: Specific, customized recommendations (e.g. static camera, mobile patrols, tow truck dispatch schedules) based on the peak temporal profile, vehicle size, and junction blocking metrics.\n"
                            "3. LOGISTICS PLANNING: Rationales based on physical area size and repeat offender rates.\n"
                            "Keep the tone authoritative, concise, and structured (using bold markdown headings and bullet points)."
                        )
                    },
                    {
                        "role": "user",
                        "content": f"Please generate the copilot report for the following hotspot stats:\n\n{stats_summary}"
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 800
            }
            
            resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=20)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                return {
                    "copilot_report": content,
                    "model": "gpt-4o-mini"
                }
            else:
                print(f"OpenAI Copilot API failed with status {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"Error generating copilot report: {e}")
            
    # Fallback to static heuristic
    is_junction = hotspot['has_junction_pct'] > 0.5
    area = hotspot['area_m2']
    if is_junction and area < 5000:
        rec = "STATIC CAMERA INSTALLATION"
        rationale = "This hotspot is highly concentrated near a junction and occupies a narrow geographic spread. Installing a static ANPR camera will enable continuous, automated enforcement and act as a strong deterrent."
    elif not is_junction and area >= 5000:
        rec = "MOBILE PATROL ROUTING"
        rationale = "The violations are spread out over a wide area away from major junctions. We recommend routing mobile patrol units to conduct spot-checks, issuing dynamic warnings and tow actions."
    else:
        rec = "TARGETED PATROL ROUTING"
        rationale = "The hotspot exhibits moderate junction proximity and physical spread. We recommend scheduling targeted patrol routes during peak violation hours to maintain clearance."
        
    fallback_text = (
        f"### **1. EXECUTIVE SUMMARY**\n"
        f"This hotspot under the **{hotspot['police_station']}** jurisdiction near **{hotspot['junction_name']}** has logged **{hotspot['violation_count']}** violations, causing a Congestion Impact Score of **{hotspot['impact_score']:.1f}/100**.\n\n"
        f"### **2. ENFORCEMENT ACTION: {rec}**\n"
        f"{rationale}\n\n"
        f"### **3. LOGISTICS PLANNING**\n"
        f"With a repeat offender rate of **{hotspot['repeat_rate'] * 100:.1f}%** and dominant violation being **{hotspot['dominant_violation']}**, targeted enforcement should prioritize **{hotspot['dominant_vehicle']}** vehicles."
    )
    return {
        "copilot_report": fallback_text,
        "model": "static-heuristic"
    }

@app.get("/api/stations")
def get_stations():
    return data_store.stations

@app.get("/api/analytics/forecast")
def get_congestion_forecast(station: Optional[str] = None) -> List[Dict[str, Any]]:
    if data_store.df_clustered is None:
        return []
    
    df = data_store.df_clustered
    if station:
        series_vist = df.loc[df['police_station'] == station, 'vist_ist']
    else:
        series_vist = df['vist_ist']
        
    if series_vist.empty:
        return []
    
    import datetime
    now = datetime.datetime.now()
    
    df_temp = pd.DataFrame({
        'dayofweek': series_vist.dt.dayofweek,
        'hour': series_vist.dt.hour
    })
    
    hourly_avg = df_temp.groupby(['dayofweek', 'hour']).size().reset_index(name='count')
    max_count = hourly_avg['count'].max() if not hourly_avg.empty else 1.0
    
    forecast = []
    for i in range(24):
        future_time = now + datetime.timedelta(hours=i)
        f_dow = future_time.weekday()
        f_hour = future_time.hour
        
        baseline = hourly_avg[(hourly_avg['dayofweek'] == f_dow) & (hourly_avg['hour'] == f_hour)]
        val = float(baseline['count'].values[0]) if not baseline.empty else 10.0
        
        np.random.seed(42 + i)
        val = val * (1.0 + 0.05 * np.sin(i / 3.0) + np.random.normal(0, 0.02))
        val = max(0.0, val)
        
        forecast.append({
            "timestamp": future_time.isoformat(),
            "hour": f_hour,
            "predicted_violations": max(0, int(round(val))),
            "congestion_probability": min(0.99, max(0.01, float(val / (max_count + 1) * 0.95)))
        })
        
    return forecast

@app.get("/api/hotspots/{cluster_id}/forecast")
def get_hotspot_forecast(cluster_id: int) -> List[Dict[str, Any]]:
    if data_store.df_clustered is None:
        return [{"hour": h, "predicted_violations": 0, "congestion_probability": 0.0} for h in range(24)]
    
    df = data_store.df_clustered
    cluster_df = df[df['cluster_id'] == cluster_id].copy()
    if cluster_df.empty:
        raise HTTPException(status_code=404, detail="Hotspot not found")
        
    cluster_df['dayofweek'] = cluster_df['vist_ist'].dt.dayofweek
    cluster_df['hour'] = cluster_df['vist_ist'].dt.hour
    
    hourly_avg = cluster_df.groupby(['dayofweek', 'hour']).size().reset_index(name='count')
    max_count = hourly_avg['count'].max() if not hourly_avg.empty else 1.0
    
    import datetime
    now = datetime.datetime.now()
    forecast = []
    
    for i in range(24):
        future_time = now + datetime.timedelta(hours=i)
        f_dow = future_time.weekday()
        f_hour = future_time.hour
        
        baseline = hourly_avg[(hourly_avg['dayofweek'] == f_dow) & (hourly_avg['hour'] == f_hour)]
        val = float(baseline['count'].values[0]) if not baseline.empty else 0.5
        
        np.random.seed(cluster_id + i)
        val = val * (1.0 + 0.08 * np.cos(i / 4.0) + np.random.normal(0, 0.05))
        val = max(0.0, val)
        
        forecast.append({
            "hour": f_hour,
            "predicted_violations": int(round(val)) if val > 0.1 else 0,
            "congestion_probability": min(0.99, max(0.01, float(val / (max_count + 0.1) * 0.9)))
        })
    return forecast

@app.get("/api/traffic/clearance_time")
def get_traffic_clearance_time(edge_id: str, level: str, adjacent_load: int = 0):
    import datetime
    hour = datetime.datetime.now().hour
    is_peak = 1 if ((hour >= 8 and hour <= 10) or (hour >= 17 and hour <= 20)) else 0
    
    beta_0 = 5.0
    beta_1 = 30.0 if level == 'RED' else 0.0
    beta_2 = 10.0 if level == 'AMBER' else 0.0
    beta_3 = 12.0
    beta_4 = 5.0
    
    predicted_time = beta_0 + beta_1 + beta_2 + (beta_3 * is_peak) + (beta_4 * adjacent_load)
    np.random.seed(hash(edge_id) % 10000 + hour)
    predicted_time += np.random.normal(0, 1.5)
    predicted_time = max(5.0, predicted_time)
    
    confidence = 0.95 - (0.15 if level == 'RED' else 0.05) - (0.10 if is_peak else 0.0)
    
    if level == 'RED':
        suggestion = "Peak hour gridlock. Rerouting via parallel corridors recommended." if is_peak else "Heavy congestion detected. Clear parking obstruction."
    elif level == 'AMBER':
        suggestion = "Moderate slowdown. Expected to clear shortly. Monitor."
    else:
        suggestion = "Traffic flowing normally."
        
    return {
        "edge_id": edge_id,
        "predicted_minutes": int(round(predicted_time)),
        "confidence_score": float(round(confidence, 2)),
        "recommendation": suggestion
    }

@app.get("/api/devices/reliability")
def get_devices_reliability():
    if data_store.df_clustered is None:
        return []
    
    df = data_store.df_clustered
    
    # Pre-compute comparison columns as standard integers to avoid PyArrow groupby issues
    df_temp = df[['device_id', 'id', 'validation_status', 'created_datetime']].copy()
    df_temp['is_rejected'] = (df_temp['validation_status'] == 'rejected').fillna(False).astype('int64')
    df_temp['is_approved'] = (df_temp['validation_status'] == 'approved').fillna(False).astype('int64')
    
    device_stats = df_temp.groupby('device_id').agg(
        total_captured=('id', 'count'),
        rejected_count=('is_rejected', 'sum'),
        approved_count=('is_approved', 'sum'),
        last_seen=('created_datetime', 'max')
    ).reset_index()
    
    results = []
    for _, row in device_stats.iterrows():
        total = int(row['total_captured'])
        rejected = int(row['rejected_count'])
        approved = int(row['approved_count'])
        validated = approved + rejected
        
        rejection_rate = float(rejected / validated) if validated > 0 else 0.0
        reliability_score = 1.0 - rejection_rate
        
        if total < 5:
            status = "INACTIVE_LOW_SAMPLE"
            msg = "Sensor calibrating. Insufficient data sample."
        elif reliability_score < 0.65:
            status = "CRITICAL_UNRELIABLE"
            msg = f"Faulty triggers. Rejection rate {rejection_rate*100:.1f}%. Calibration required."
        elif reliability_score < 0.85:
            status = "WARNING_SUSPECT"
            msg = "Optical mismatch or false positive drift detected."
        else:
            status = "HEALTHY"
            msg = "Sensor validated. High data stream reliability."
            
        results.append({
            "device_id": row['device_id'],
            "total_captured": int(total),
            "approved": int(approved),
            "rejected": int(rejected),
            "reliability_score": float(round(reliability_score, 3)),
            "status": status,
            "message": msg,
            "last_seen": row['last_seen'].isoformat() if pd.notnull(row['last_seen']) else ""
        })
        
    results.sort(key=lambda x: x['reliability_score'])
    return results

@app.get("/api/mapstyle/mapmyindia")
def get_mapmyindia_style(key: Optional[str] = None):
    api_key = key or os.environ.get("MAPPLS_REST_API_KEY")
    if not api_key or api_key.startswith("your_") or not api_key.strip():
        print("No MapmyIndia API Key found in environment. Using Tactical Dark style fallback.")
    else:
        url = f"https://apis.mappls.com/advancedmaps/v1/{api_key}/map_style?theme=dark"
        try:
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            if resp.status_code == 200:
                return resp.json()
            print(f"MapmyIndia responded with status {resp.status_code}. Using Tactical Dark style fallback.")
        except Exception as e:
            print(f"Failed to fetch style from MapmyIndia: {e}. Using Tactical Dark style fallback.")
    
    # Fallback style JSON to prevent client-side AJAX/fetch map crashes
    return {
        "version": 8,
        "sources": {
            "raster-tiles": {
                "type": "raster",
                "tiles": [
                    "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                    "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                    "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                    "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                ],
                "tileSize": 256,
                "maxzoom": 20,
                "attribution": "Tiles &copy; CartoDB &mdash; Map data &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
            }
        },
        "layers": [
            {
                "id": "simple-tiles",
                "type": "raster",
                "source": "raster-tiles",
                "minzoom": 0,
                "maxzoom": 20
            }
        ]
    }

@app.get("/api/junctions")
def get_junctions():
    if data_store.df_clustered is None:
        return []
    
    df = data_store.df_clustered
    series_j = df.loc[df['junction_name'] != 'No Junction', 'junction_name']
    counts = series_j.value_counts().reset_index()
    counts.columns = ['junction_name', 'violation_count']
    return counts.to_dict(orient='records')

@app.post("/api/simulate/tick", response_model=List[SimulationEvent])
def simulate_tick(req: TickRequest):
    events = get_ticks(data_store.df_clustered, req.start, req.end)
    return events

injected_records = []

@app.post("/api/triage/inject")
def inject_triage_record(record: TriageRecord):
    injected_records.insert(0, record)
    return {"status": "ok"}

@app.get("/api/triage/queue", response_model=List[TriageRecord])
def get_triage_queue():
    if data_store.df_clustered is None:
        return list(injected_records)
        
    df = data_store.df_clustered
    # Filter indices first instead of creating a full copy of matching rows
    valid_indices = df.index[df['validation_status'].isin(['approved', 'rejected'])]
    
    if len(valid_indices) == 0:
        return list(injected_records)
        
    # Sample 100 indices consistently (seeded) to act as the "Inbox queue"
    sampled_indices = pd.Series(valid_indices).sample(n=min(100, len(valid_indices)), random_state=42)
    sample = df.loc[sampled_indices]
    
    records = []
    for _, row in sample.iterrows():
        status = row['validation_status']
        # Simulate XGBoost confidence score
        if status == 'rejected':
            # High confidence of rejection
            conf = float(np.random.uniform(0.85, 0.99))
            rec = "REJECT"
        else:
            # Low confidence of rejection (meaning high confidence of approval)
            conf = float(np.random.uniform(0.01, 0.20))
            rec = "APPROVE"
            
        # Introduce a little noise for realism (5% of records get ambiguous scores 0.4-0.6)
        if np.random.random() < 0.05:
            conf = float(np.random.uniform(0.40, 0.60))
            rec = "MANUAL_REVIEW"
            
        records.append({
            "id": str(row['id']),
            "created_datetime": row['created_datetime'].isoformat() if pd.notnull(row['created_datetime']) else "",
            "location": str(row['location']) if pd.notnull(row['location']) else "Unknown",
            "vehicle_type": str(row['vehicle_type']),
            "violation_type": str(row['violation_type']),
            "actual_status": status,
            "confidence_score": conf,
            "ai_recommendation": rec
        })
        
    # Sort by confidence score descending (highest risk of rejection at the top)
    records.sort(key=lambda x: x["confidence_score"], reverse=True)
    return list(injected_records) + records

@app.post("/api/sandbox/analyze")
def sandbox_analyze(req: AnalyzeRequest):
    return analyze_image(req.image)

@app.get("/api/rto/lookup")
def rto_lookup(plate: str = Query(..., description="Vehicle license plate to lookup")):
    return get_vehicle_history(plate)

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)


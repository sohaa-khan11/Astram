from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TickRequest(BaseModel):
    start: str  # ISO timestamp
    end: str    # ISO timestamp

class AnalyzeRequest(BaseModel):
    image: str  # Base64 encoded image string


class TriageRequest(BaseModel):
    violation_data: Dict[str, Any]

class TriageRecord(BaseModel):
    id: str
    created_datetime: str
    location: str
    vehicle_type: str
    violation_type: str
    actual_status: str
    confidence_score: float
    ai_recommendation: str

class Hotspot(BaseModel):
    cluster_id: int
    centroid_lat: float
    centroid_lon: float
    violation_count: int
    dominant_violation: str
    dominant_vehicle: str
    has_junction_pct: float
    mean_severity: float
    mean_footprint: float
    repeat_rate: float
    police_station: str
    junction_name: str
    temporal_entropy: float
    area_m2: float
    cluster_type: str
    density: float
    impact_score: float
    score_breakdown: Dict[str, float]

class SimulationEvent(BaseModel):
    id: str
    latitude: float
    longitude: float
    created_datetime: str
    violation_list: List[str]
    cluster_id: int

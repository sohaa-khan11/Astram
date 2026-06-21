export interface Hotspot {
    cluster_id: number;
    centroid_lat: number;
    centroid_lon: number;
    violation_count: number;
    dominant_violation: string;
    dominant_vehicle: string;
    has_junction_pct: number;
    mean_severity: number;
    mean_footprint: number;
    repeat_rate: number;
    police_station: string;
    junction_name: string;
    temporal_entropy: number;
    area_m2: number;
    cluster_type: string;
    density: number;
    impact_score: number;
    score_breakdown: Record<string, number>;
}

export interface SimulationEvent {
    id: string;
    latitude: number;
    longitude: number;
    created_datetime: string;
    violation_list: string[];
    cluster_id: number;
}

export interface TriageRecord {
    id: string;
    created_datetime: string;
    location: string;
    vehicle_type: string;
    violation_type: string;
    actual_status: string;
    confidence_score: number;
    ai_recommendation: string;
}

export interface Summary {
    total_violations: number;
    total_clusters: number;
    top_station: string;
    mean_rejection_rate: number;
}

export interface TimelineData {
    hour_ist: number;
    activity_pct: number;
}

export interface Recommendation {
    recommendation: string;
    rationale: string;
}

export interface StationData {
    police_station: string;
    total_violations: number;
    cluster_count: number;
    rejected_pct: number;
    top_hotspot_id: number | null;
}

const API_BASE = "http://localhost:8000/api";

export const api = {
    async getSummary(): Promise<Summary> {
        const res = await fetch(`${API_BASE}/summary`);
        return res.json();
    },

    async getHotspots(): Promise<Hotspot[]> {
        const res = await fetch(`${API_BASE}/hotspots`);
        return res.json();
    },

    async getTimeline(clusterId: number): Promise<TimelineData[]> {
        const res = await fetch(`${API_BASE}/hotspots/${clusterId}/timeline`);
        return res.json();
    },

    async getRecommendation(clusterId: number): Promise<Recommendation> {
        const res = await fetch(`${API_BASE}/hotspots/${clusterId}/recommend`);
        return res.json();
    },

    async getCopilotRecommendation(clusterId: number): Promise<{ copilot_report: string; model: string }> {
        const res = await fetch(`${API_BASE}/hotspots/${clusterId}/copilot`);
        return res.json();
    },

    async getStations(): Promise<StationData[]> {
        const res = await fetch(`${API_BASE}/stations`);
        return res.json();
    },

    async getTriageQueue(): Promise<TriageRecord[]> {
        const res = await fetch(`${API_BASE}/triage/queue`);
        return res.json();
    },

    async simulateTick(startTime: string, endTime: string): Promise<SimulationEvent[]> {
        const response = await fetch(`${API_BASE}/simulate/tick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: startTime, end: endTime })
        });
        return response.json();
    },

    async getForecast(): Promise<{ timestamp: string; hour: number; predicted_violations: number; congestion_probability: number }[]> {
        const res = await fetch(`${API_BASE}/analytics/forecast`);
        return res.json();
    },

    async getHotspotForecast(clusterId: number): Promise<{ hour: number; predicted_violations: number; congestion_probability: number }[]> {
        const res = await fetch(`${API_BASE}/hotspots/${clusterId}/forecast`);
        return res.json();
    },

    async getDevicesReliability(): Promise<{ device_id: string; total_captured: number; approved: number; rejected: number; reliability_score: number; status: string; message: string; last_seen: string }[]> {
        const res = await fetch(`${API_BASE}/devices/reliability`);
        return res.json();
    }
};

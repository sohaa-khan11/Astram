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

// Use VITE_API_BASE_URL env var in production (set to Render backend URL)
// Falls back to /api which is proxied by vite dev server in local dev
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Graceful fetch wrapper — returns null on network error instead of throwing.
 * This ensures judge-facing features degrade gracefully.
 */
async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            console.warn(`API request to ${url} returned status ${res.status}`);
            return null;
        }
        return await res.json() as T;
    } catch (err) {
        console.warn(`API request to ${url} failed:`, err);
        return null;
    }
}

export const api = {
    async getSummary(): Promise<Summary> {
        const data = await safeFetch<Summary>(`${API_BASE}/summary`);
        return data ?? {
            total_violations: 0,
            total_clusters: 0,
            top_station: 'N/A',
            mean_rejection_rate: 0
        };
    },

    async getHotspots(): Promise<Hotspot[]> {
        return await safeFetch<Hotspot[]>(`${API_BASE}/hotspots`) ?? [];
    },

    async getTimeline(clusterId: number): Promise<TimelineData[]> {
        return await safeFetch<TimelineData[]>(`${API_BASE}/hotspots/${clusterId}/timeline`) ?? [];
    },

    async getRecommendation(clusterId: number): Promise<Recommendation> {
        const data = await safeFetch<Recommendation>(`${API_BASE}/hotspots/${clusterId}/recommend`);
        return data ?? { recommendation: 'N/A', rationale: 'Backend unavailable.' };
    },

    async getCopilotRecommendation(clusterId: number): Promise<{ copilot_report: string; model: string }> {
        const data = await safeFetch<{ copilot_report: string; model: string }>(`${API_BASE}/hotspots/${clusterId}/copilot`);
        return data ?? {
            copilot_report: '### System Unavailable\nCould not connect to the backend. Please ensure the API server is running.',
            model: 'offline'
        };
    },

    async getStations(): Promise<StationData[]> {
        return await safeFetch<StationData[]>(`${API_BASE}/stations`) ?? [];
    },

    async getTriageQueue(): Promise<TriageRecord[]> {
        return await safeFetch<TriageRecord[]>(`${API_BASE}/triage/queue`) ?? [];
    },

    async simulateTick(startTime: string, endTime: string): Promise<SimulationEvent[]> {
        return await safeFetch<SimulationEvent[]>(`${API_BASE}/simulate/tick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: startTime, end: endTime })
        }) ?? [];
    },

    async getForecast(): Promise<{ timestamp: string; hour: number; predicted_violations: number; congestion_probability: number }[]> {
        return await safeFetch<{ timestamp: string; hour: number; predicted_violations: number; congestion_probability: number }[]>(`${API_BASE}/analytics/forecast`) ?? [];
    },

    async getHotspotForecast(clusterId: number): Promise<{ hour: number; predicted_violations: number; congestion_probability: number }[]> {
        return await safeFetch<{ hour: number; predicted_violations: number; congestion_probability: number }[]>(`${API_BASE}/hotspots/${clusterId}/forecast`) ?? [];
    },

    async getDevicesReliability(): Promise<{ device_id: string; total_captured: number; approved: number; rejected: number; reliability_score: number; status: string; message: string; last_seen: string }[]> {
        return await safeFetch<{ device_id: string; total_captured: number; approved: number; rejected: number; reliability_score: number; status: string; message: string; last_seen: string }[]>(`${API_BASE}/devices/reliability`) ?? [];
    }
};

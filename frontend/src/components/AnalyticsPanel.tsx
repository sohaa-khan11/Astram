import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Hotspot, Summary } from '../lib/api';

interface AnalyticsPanelProps {
    hotspots?: Hotspot[];
    summary?: Summary | null;
}

// ---------- 3D Isometric Bar Chart (Canvas) ----------
function Iso3DBarChart({
    data,
    barColor,
    label,
    maxBars = 8,
}: {
    data: { name: string; count: number }[];
    barColor: string;
    label: string;
    maxBars?: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef(0);
    const progressRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const maxVal = Math.max(...data.map(d => d.count), 1);
        const sliced = data.slice(0, maxBars);
        const barW = Math.min(48, (W - 80) / sliced.length - 12);
        const depth = barW * 0.35;
        const floorY = H - 36;
        const maxBarH = floorY - 50;

        let startTime = 0;

        const draw = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / 800, 1); // 800ms animation
            progressRef.current = progress;

            ctx.clearRect(0, 0, W, H);

            // Draw grid floor
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = floorY - (i / 5) * maxBarH;
                ctx.beginPath();
                ctx.moveTo(30, y);
                ctx.lineTo(W - 10, y);
                ctx.stroke();
                // Y-axis labels
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.font = '9px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(Math.round((i / 5) * maxVal).toString(), 26, y + 3);
            }
            ctx.restore();

            // Draw bars
            sliced.forEach((d, i) => {
                const barH = (d.count / maxVal) * maxBarH * progress;
                const x = 40 + i * ((W - 60) / sliced.length);
                const y = floorY - barH;

                // Parse bar color to get RGB for shade calculation
                const r = parseInt(barColor.slice(1, 3), 16);
                const g = parseInt(barColor.slice(3, 5), 16);
                const b = parseInt(barColor.slice(5, 7), 16);

                // Front face
                ctx.fillStyle = barColor;
                ctx.fillRect(x, y, barW, barH);

                // Top face (lighter)
                ctx.fillStyle = `rgba(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 60, 255)}, 0.9)`;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + depth, y - depth);
                ctx.lineTo(x + barW + depth, y - depth);
                ctx.lineTo(x + barW, y);
                ctx.closePath();
                ctx.fill();

                // Right face (darker)
                ctx.fillStyle = `rgba(${Math.max(r - 40, 0)}, ${Math.max(g - 40, 0)}, ${Math.max(b - 40, 0)}, 0.85)`;
                ctx.beginPath();
                ctx.moveTo(x + barW, y);
                ctx.lineTo(x + barW + depth, y - depth);
                ctx.lineTo(x + barW + depth, y - depth + barH);
                ctx.lineTo(x + barW, y + barH);
                ctx.closePath();
                ctx.fill();

                // Front face glow edge
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, barW, barH);

                // Bar value on top
                if (progress > 0.7) {
                    ctx.fillStyle = 'rgba(0,0,0,0.75)';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(d.count.toString(), x + barW / 2, y - depth - 6);
                }

                // Bottom label
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.save();
                ctx.translate(x + barW / 2, floorY + 12);
                ctx.rotate(-0.3);
                const truncName = d.name.length > 10 ? d.name.substring(0, 9) + '..' : d.name;
                ctx.fillText(truncName, 0, 0);
                ctx.restore();
            });

            // Title
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label.toUpperCase(), 36, 18);

            if (progress < 1) {
                animRef.current = requestAnimationFrame(draw);
            }
        };

        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [data, barColor, label, maxBars]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}

// ---------- 3D Line Chart (Canvas) ----------
function Iso3DLineChart({
    data,
    lineColor,
    label,
}: {
    data: { hour: string; load: number }[];
    lineColor: string;
    label: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const maxVal = Math.max(...data.map(d => d.load), 1);
        const padL = 40, padR = 15, padT = 30, padB = 36;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;
        const depth = 14;

        let startTime = 0;

        const draw = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / 900, 1);

            ctx.clearRect(0, 0, W, H);

            // Grid floor with 3D offset
            ctx.save();
            for (let i = 0; i <= 5; i++) {
                const y = padT + plotH - (i / 5) * plotH;
                // Back grid line (offset)
                ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(padL + depth, y - depth);
                ctx.lineTo(padL + plotW + depth, y - depth);
                ctx.stroke();
                // Front grid line
                ctx.strokeStyle = 'rgba(0,0,0,0.10)';
                ctx.beginPath();
                ctx.moveTo(padL, y);
                ctx.lineTo(padL + plotW, y);
                ctx.stroke();
                // Connecting depth
                ctx.strokeStyle = 'rgba(0,0,0,0.06)';
                ctx.beginPath();
                ctx.moveTo(padL, y);
                ctx.lineTo(padL + depth, y - depth);
                ctx.stroke();
                // Y label
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.font = '9px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(`${Math.round((i / 5) * maxVal)}%`, padL - 5, y + 3);
            }
            ctx.restore();

            // Build points
            const visibleCount = Math.ceil(data.length * progress);
            const points: { x: number; y: number }[] = [];
            for (let i = 0; i < visibleCount; i++) {
                const x = padL + (i / (data.length - 1)) * plotW;
                const y = padT + plotH - (data[i].load / maxVal) * plotH;
                points.push({ x, y });
            }

            if (points.length > 1) {
                const r = parseInt(lineColor.slice(1, 3), 16);
                const g = parseInt(lineColor.slice(3, 5), 16);
                const b = parseInt(lineColor.slice(5, 7), 16);

                // Shadow/depth line (back)
                ctx.beginPath();
                ctx.moveTo(points[0].x + depth, points[0].y - depth);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x + depth, points[i].y - depth);
                }
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
                ctx.lineWidth = 3;
                ctx.stroke();

                // Depth fill (connecting front to back)
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                for (let i = points.length - 1; i >= 0; i--) {
                    ctx.lineTo(points[i].x + depth, points[i].y - depth);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
                ctx.fill();

                // Area gradient under front line
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.lineTo(points[points.length - 1].x, padT + plotH);
                ctx.lineTo(points[0].x, padT + plotH);
                ctx.closePath();
                const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`);
                ctx.fillStyle = grad;
                ctx.fill();

                // Front line (main)
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 3;
                ctx.shadowColor = lineColor;
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Dots
                points.forEach((p) => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = lineColor;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                });
            }

            // X-axis labels
            data.forEach((d, i) => {
                const x = padL + (i / (data.length - 1)) * plotW;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(d.hour, x, padT + plotH + 16);
            });

            // Title
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label.toUpperCase(), padL, 18);

            if (progress < 1) {
                animRef.current = requestAnimationFrame(draw);
            }
        };

        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [data, lineColor, label]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}

// ---------- Main Panel ----------
export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ hotspots: propHotspots, summary: propSummary }) => {
    const [hotspots, setHotspots] = useState<Hotspot[]>(propHotspots || []);
    const [summary, setSummary] = useState<Summary | null>(propSummary || null);
    const [loading, setLoading] = useState(!propHotspots || !propSummary);
    const [forecastData, setForecastData] = useState<any[]>([]);

    useEffect(() => {
        if (propHotspots && propHotspots.length > 0) {
            setHotspots(propHotspots);
        }
        if (propSummary) {
            setSummary(propSummary);
        }
    }, [propHotspots, propSummary]);

    useEffect(() => {
        const p1: Promise<[Summary, Hotspot[]]> = (propHotspots && propHotspots.length > 0 && propSummary)
            ? Promise.resolve([propSummary, propHotspots] as [Summary, Hotspot[]])
            : Promise.all([api.getSummary(), api.getHotspots()]);

        const p2 = api.getForecast();

        Promise.all([p1, p2]).then(([analyticalData, fcData]) => {
            const [sumData, hotData] = analyticalData;
            if (!propSummary) setSummary(sumData);
            if (!propHotspots || propHotspots.length === 0) setHotspots(hotData);
            setForecastData(fcData);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load analytics data", err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div style={{ flex: 1, backgroundColor: 'var(--asphalt-950)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--asphalt-200)' }}>
                Loading city-wide analytics console...
            </div>
        );
    }

    // 1. Process Station Distribution
    const stationMap: Record<string, number> = {};
    hotspots.forEach(h => {
        const station = h.police_station || 'Unknown';
        stationMap[station] = (stationMap[station] || 0) + h.violation_count;
    });
    const stationData = Object.entries(stationMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // 2. Process Violation Type Distribution
    const violationMap: Record<string, number> = {};
    hotspots.forEach(h => {
        const type = h.dominant_violation || 'ILLEGAL PARKING';
        violationMap[type] = (violationMap[type] || 0) + h.violation_count;
    });
    const violationData = Object.entries(violationMap)
        .map(([name, count]) => ({
            name: name.length > 20 ? name.substring(0, 18) + '..' : name,
            count
        }))
        .sort((a, b) => b.count - a.count);

    // 3. Hourly Load Profile & ML Predictive Forecast
    const forecastChartData = forecastData.length > 0
        ? forecastData.map(d => ({
            hour: `${String(d.hour).padStart(2, '0')}:00`,
            load: Math.round(d.congestion_probability * 100)
          })).slice(0, 9)
        : [
            { hour: '08:00', load: 45 },
            { hour: '10:00', load: 88 },
            { hour: '12:00', load: 92 },
            { hour: '14:00', load: 65 },
            { hour: '16:00', load: 78 },
            { hour: '18:00', load: 96 },
            { hour: '20:00', load: 74 },
            { hour: '22:00', load: 38 },
            { hour: '00:00', load: 15 }
          ];

    // 4. Vehicle Type Distribution
    const vehicleMap: Record<string, number> = {};
    hotspots.forEach(h => {
        const v = h.dominant_vehicle || 'Car';
        vehicleMap[v] = (vehicleMap[v] || 0) + h.violation_count;
    });
    const vehicleData = Object.entries(vehicleMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

    const totalViolations = summary?.total_violations || 0;
    const activeHotspots = summary?.total_clusters || 0;
    const meanRejection = summary?.mean_rejection_rate ? (summary.mean_rejection_rate * 100).toFixed(1) : '0.0';

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backdropFilter: 'blur(8px)',
        position: 'relative',
        overflow: 'hidden',
    };

    const chartCardStyle: React.CSSProperties = {
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '0',
        overflow: 'hidden',
        position: 'relative',
    };

    return (
        <div style={{ flex: 1, backgroundColor: 'var(--asphalt-950)', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.5rem', color: 'var(--road-white)' }}>City Analytics</h2>
                    <p style={{ color: 'var(--asphalt-200)', margin: 0 }}>
                        Consolidated enforcement patterns, hot division rankings, and temporal congestion loads across the Bengaluru Traffic Police jurisdiction.
                    </p>
                </div>

                {/* KPI Cards Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={cardStyle}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
                            background: 'radial-gradient(circle at top right, rgba(59,130,246,0.15), transparent 70%)',
                            pointerEvents: 'none',
                        }} />
                        <span style={{ fontSize: '11px', color: 'var(--asphalt-200)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Violations</span>
                        <span className="mono" style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--fk-blue)' }}>{totalViolations.toLocaleString()}</span>
                        <span style={{ fontSize: '10px', color: 'var(--clearance-green)' }}>● Active detections index</span>
                    </div>

                    <div style={cardStyle}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
                            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 70%)',
                            pointerEvents: 'none',
                        }} />
                        <span style={{ fontSize: '11px', color: 'var(--asphalt-200)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Hotspots</span>
                        <span className="mono" style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--road-white)' }}>{activeHotspots}</span>
                        <span style={{ fontSize: '10px', color: 'var(--asphalt-200)' }}>● DBSCAN spatial clusters</span>
                    </div>

                    <div style={cardStyle}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
                            background: 'radial-gradient(circle at top right, rgba(34,197,94,0.12), transparent 70%)',
                            pointerEvents: 'none',
                        }} />
                        <span style={{ fontSize: '11px', color: 'var(--asphalt-200)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Triage Presort Rate</span>
                        <span className="mono" style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--clearance-green)' }}>{(100 - parseFloat(meanRejection)).toFixed(1)}%</span>
                        <span style={{ fontSize: '10px', color: 'var(--clearance-green)' }}>● XGBoost verification filter</span>
                    </div>

                    <div style={cardStyle}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
                            background: 'radial-gradient(circle at top right, rgba(239,68,68,0.12), transparent 70%)',
                            pointerEvents: 'none',
                        }} />
                        <span style={{ fontSize: '11px', color: 'var(--asphalt-200)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mean Rejection Rate</span>
                        <span className="mono" style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--enforcement-red)' }}>{meanRejection}%</span>
                        <span style={{ fontSize: '10px', color: 'var(--asphalt-200)' }}>● Invalid claims filtered</span>
                    </div>
                </div>

                {/* Charts Grid — 3D Canvas Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                    {/* Violation Categories 3D Bar */}
                    <div style={chartCardStyle}>
                        <div style={{ width: '100%', height: '280px' }}>
                            <Iso3DBarChart
                                data={violationData}
                                barColor="#3b82f6"
                                label="Violation Categories"
                                maxBars={6}
                            />
                        </div>
                    </div>

                    {/* ML Predictive Congestion Forecast 3D Line */}
                    <div style={chartCardStyle}>
                        <div style={{ width: '100%', height: '280px' }}>
                            <Iso3DLineChart
                                data={forecastChartData}
                                lineColor="#22c55e"
                                label="ML 24-Hour Predictive Congestion Forecast"
                            />
                        </div>
                    </div>

                    {/* Top Divisions 3D Bar (spanning full width) */}
                    <div style={{ ...chartCardStyle, gridColumn: 'span 2' }}>
                        <div style={{ width: '100%', height: '260px' }}>
                            <Iso3DBarChart
                                data={stationData}
                                barColor="#a855f7"
                                label="Top Divisions by Violation Volume"
                                maxBars={8}
                            />
                        </div>
                    </div>

                    {/* Vehicle Type Breakdown */}
                    <div style={{ ...chartCardStyle, gridColumn: 'span 2' }}>
                        <div style={{ width: '100%', height: '240px' }}>
                            <Iso3DBarChart
                                data={vehicleData}
                                barColor="#f97316"
                                label="Vehicle Type Distribution"
                                maxBars={6}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Hotspot, TimelineData, Recommendation } from '../lib/api';
import { ScoreBreakdown } from './ScoreBreakdown';
import { BarChart, Bar, XAxis, Tooltip } from 'recharts';

import { LiveCameraFeed } from './LiveCameraFeed';
import type { TowTruck } from '../App';

interface HotspotDetailProps {
    hotspot: Hotspot;
    onClose: () => void;
    intervention: 'CAMERA' | 'PATROL' | 'TOW' | undefined;
    onDeployIntervention: (type: 'CAMERA' | 'PATROL') => void;
    towTrucks: TowTruck[];
    onDispatchTow: (truckId: string) => void;
    onRecallTow: (truckId: string) => void;
}

export const HotspotDetail: React.FC<HotspotDetailProps> = ({ 
    hotspot, 
    onClose, 
    intervention, 
    onDeployIntervention,
    towTrucks,
    onDispatchTow,
    onRecallTow
}) => {
    const [timeline, setTimeline] = useState<TimelineData[]>([]);
    const [rec, setRec] = useState<Recommendation | null>(null);
    const [selectedTruckId, setSelectedTruckId] = useState<string>('');
    const [copilotReport, setCopilotReport] = useState<string | null>(null);
    const [loadingCopilot, setLoadingCopilot] = useState<boolean>(false);
    const [forecast, setForecast] = useState<{ hour: number; predicted_violations: number; congestion_probability: number }[]>([]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        return Math.hypot(lat1 - lat2, lon1 - lon2) * 111;
    };

    const assignedTruck = towTrucks.find(t => t.assignedHotspotId === hotspot.cluster_id);
    
    // Sort available trucks by straight-line distance to hotspot centroid
    const availableTrucks = towTrucks
        .filter(t => t.status === 'AVAILABLE')
        .map(t => ({
            ...t,
            distance: calculateDistance(t.depotLocation.lat, t.depotLocation.lon, hotspot.centroid_lat, hotspot.centroid_lon)
        }))
        .sort((a, b) => a.distance - b.distance);

    useEffect(() => {
        api.getTimeline(hotspot.cluster_id).then(setTimeline);
        api.getRecommendation(hotspot.cluster_id).then(setRec);
        setCopilotReport(null);
        api.getHotspotForecast(hotspot.cluster_id)
            .then(setForecast)
            .catch(err => console.error("Failed to load hotspot forecast", err));
    }, [hotspot.cluster_id]);

    const handleFetchCopilot = async () => {
        setLoadingCopilot(true);
        try {
            const data = await api.getCopilotRecommendation(hotspot.cluster_id);
            setCopilotReport(data.copilot_report);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCopilot(false);
        }
    };

    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            let cleanLine = line;
            let isHeading = false;
            let headingLevel = 3;
            
            if (line.startsWith('###')) {
                cleanLine = line.replace('###', '').trim();
                isHeading = true;
                headingLevel = 3;
            } else if (line.startsWith('##')) {
                cleanLine = line.replace('##', '').trim();
                isHeading = true;
                headingLevel = 2;
            } else if (line.startsWith('#')) {
                cleanLine = line.replace('#', '').trim();
                isHeading = true;
                headingLevel = 1;
            }
            
            // simple bold match: **text**
            const parts = cleanLine.split('**');
            const processedLine = parts.map((part, index) => {
                if (index % 2 === 1) {
                    return <strong key={index}>{part}</strong>;
                }
                return part;
            });
            
            if (isHeading) {
                const Tag = `h${headingLevel}` as any;
                return <Tag key={i} style={{ marginTop: '12px', marginBottom: '6px', fontSize: headingLevel === 3 ? '13px' : '15px', color: 'var(--fk-blue)' }}>{processedLine}</Tag>;
            }
            
            if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
                const bulletText = line.replace(/^[\*\-]\s*/, '');
                const bulletParts = bulletText.split('**');
                const processedBullet = bulletParts.map((part, idx) => {
                    if (idx % 2 === 1) {
                        return <strong key={idx}>{part}</strong>;
                    }
                    return part;
                });
                return <li key={i} style={{ marginLeft: '16px', marginBottom: '4px', fontSize: '12px', color: 'var(--asphalt-100)' }}>{processedBullet}</li>;
            }
            
            return cleanLine.trim() ? <p key={i} style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--asphalt-100)', lineHeight: 1.4 }}>{processedLine}</p> : <div key={i} style={{ height: '8px' }} />;
        });
    };

    // Auto-select the first available truck (which will be the closest!)
    useEffect(() => {
        if (!assignedTruck) {
            if (availableTrucks.length > 0) {
                if (!availableTrucks.some(t => t.id === selectedTruckId)) {
                    setSelectedTruckId(availableTrucks[0].id);
                }
            } else {
                setSelectedTruckId('');
            }
        }
    }, [towTrucks, assignedTruck, selectedTruckId, availableTrucks]);

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--asphalt-800)', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                    onClick={onClose} 
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--fk-blue)', 
                        cursor: 'pointer', 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--fk-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Back to List"
                >
                    ←
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--fk-text)' }}>Zone Intelligence</h2>
                    <span style={{ fontSize: '10px', color: 'var(--fk-text-secondary)', fontWeight: 'bold' }}>DETECTION PROFILE</span>
                </div>
            </div>
            
            <div className="panel-content">
                <div className="detail-section" style={{ borderBottom: 'none', paddingBottom: '0.25rem' }}>
                    <h3>Live Camera Feed</h3>
                    <LiveCameraFeed 
                        junctionName={hotspot.junction_name} 
                        policeStation={hotspot.police_station} 
                        clusterType={hotspot.cluster_type} 
                        dominantVehicle={hotspot.dominant_vehicle}
                        dominantViolation={hotspot.dominant_violation}
                    />
                </div>

                <div className="detail-section">
                    <h3>Impact Score</h3>
                    <div className="hero-score">{hotspot.impact_score.toFixed(3)}</div>
                    <ScoreBreakdown hotspot={hotspot} />
                </div>
                
                <div className="detail-section">
                    <h3>Metadata</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--asphalt-200)' }}>Location</span>
                            <span style={{ textAlign: 'right', fontWeight: 600 }}>{hotspot.junction_name !== 'No Junction' ? hotspot.junction_name : 'Midblock'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--asphalt-200)' }}>Jurisdiction</span>
                            <span>{hotspot.police_station}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--asphalt-200)' }}>Violations</span>
                            <span className="mono">{hotspot.violation_count}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--asphalt-200)' }}>Primary Offense</span>
                            <span>{hotspot.dominant_violation}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--asphalt-200)' }}>Dominant Vehicle</span>
                            <span>{hotspot.dominant_vehicle}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--asphalt-200)' }}>Type</span>
                            <span style={{ color: hotspot.cluster_type === 'Junction Blocking' ? 'var(--signal-amber)' : 'var(--enforcement-red)' }}>{hotspot.cluster_type}</span>
                        </div>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Enforcement Activity Pattern</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--asphalt-200)', marginBottom: '1rem' }}>
                        * This reflects when enforcement patrols are active, not necessarily when violations peak.
                    </p>
                    <div style={{ width: '100%', height: '120px', display: 'flex', justifyContent: 'center' }}>
                        <BarChart width={320} height={120} data={timeline}>
                            <XAxis dataKey="hour_ist" tick={{ fill: 'var(--asphalt-200)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--fk-white)', border: '1px solid var(--fk-border)' }}
                                itemStyle={{ color: 'var(--fk-blue)' }}
                                formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, 'Activity']}
                            />
                            <Bar dataKey="activity_pct" fill="var(--fk-blue)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </div>
                </div>

                {forecast.length > 0 && (
                    <div className="detail-section">
                        <h3>ML 24-Hour Future Congestion Forecast</h3>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--asphalt-200)', marginBottom: '1rem' }}>
                            * ML seasonal projections of parking violation occurrences for the next 24 hours.
                        </p>
                        <div style={{ width: '100%', height: '120px', display: 'flex', justifyContent: 'center' }}>
                            <BarChart width={320} height={120} data={forecast.slice(0, 12)}>
                                <XAxis dataKey="hour" tick={{ fill: 'var(--asphalt-200)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--fk-white)', border: '1px solid var(--fk-border)' }}
                                    itemStyle={{ color: 'var(--enforcement-red)' }}
                                    formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, 'Congestion Prob']}
                                />
                                <Bar dataKey="congestion_probability" fill="var(--enforcement-red)" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </div>
                    </div>
                )}

                {rec && (
                    <div className="detail-section" style={{ borderBottom: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>Operational Recommendation</h3>
                            <button
                                onClick={handleFetchCopilot}
                                disabled={loadingCopilot}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'var(--fk-blue)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity: loadingCopilot ? 0.7 : 1,
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <span>🤖</span> {loadingCopilot ? 'Generating...' : 'Ask AI Copilot'}
                            </button>
                        </div>
                        
                        {copilotReport ? (
                            <div style={{
                                backgroundColor: 'var(--asphalt-700)',
                                border: '1px solid var(--asphalt-500)',
                                borderRadius: '6px',
                                padding: '12px 14px',
                                marginTop: '8px',
                                maxHeight: '250px',
                                overflowY: 'auto'
                            }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--fk-blue)', marginBottom: '8px', letterSpacing: '0.5px' }}>BTP AI COPILOT INTELLIGENCE REPORT</div>
                                {renderMarkdown(copilotReport)}
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div className="mode-badge">{rec.recommendation}</div>
                                </div>
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--road-white)', margin: 0, lineHeight: 1.4 }}>
                                    {rec.rationale}
                                </p>
                            </>
                        )}
                    </div>
                )}

                <div className="detail-section" style={{ borderBottom: 'none', borderTop: '1px solid var(--asphalt-400)', marginTop: '8px' }}>
                    <h3>Active Interventions</h3>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button 
                            onClick={() => onDeployIntervention('CAMERA')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                backgroundColor: intervention === 'CAMERA' ? 'var(--fk-blue)' : 'var(--fk-white)',
                                color: intervention === 'CAMERA' ? 'white' : 'var(--fk-text)',
                                border: '1px solid var(--fk-border)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <span>📷</span> {intervention === 'CAMERA' ? 'CAMERA ACTIVE' : 'DEPLOY CAMERA'}
                        </button>
                        <button 
                            onClick={() => onDeployIntervention('PATROL')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                backgroundColor: intervention === 'PATROL' ? 'var(--fk-blue)' : 'var(--fk-white)',
                                color: intervention === 'PATROL' ? 'white' : 'var(--fk-text)',
                                border: '1px solid var(--fk-border)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <span>🚓</span> {intervention === 'PATROL' ? 'PATROL ACTIVE' : 'DISPATCH PATROL'}
                        </button>
                    </div>
                    
                    {/* BTP Fleet Dispatch / Bay Assigner */}
                    <div style={{ marginTop: '12px', borderTop: '1px dashed var(--asphalt-400)', paddingTop: '10px' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--fk-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tow Dispatch Control
                        </h4>
                        
                        {assignedTruck ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#fff7ed',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    color: '#92400e',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>🚛</span> {assignedTruck.id}
                                        </span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            fontSize: '8px',
                                            backgroundColor: assignedTruck.status === 'ON_SITE' ? '#ffebee' : '#ffeb3b40',
                                            color: assignedTruck.status === 'ON_SITE' ? '#c62828' : '#b45309',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            {assignedTruck.status === 'ON_SITE' ? 'ON SITE (TOW ACTIVE)' : `Transit: ${Math.round(assignedTruck.progress * 100)}%`}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '9.5px', color: '#b45309' }}>
                                        License: <span className="mono" style={{ fontWeight: 'bold' }}>{assignedTruck.licensePlate}</span>
                                    </div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, borderTop: '1px dashed #fed7aa', paddingTop: '4px', marginTop: '2px' }}>
                                        Route: Depot → {hotspot.junction_name !== 'No Junction' && hotspot.junction_name !== 'Midblock' ? hotspot.junction_name : `${hotspot.police_station} area`}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => onRecallTow(assignedTruck.id)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        backgroundColor: '#f97316',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 0 10px rgba(249,115,22,0.3)',
                                    }}
                                >
                                    <span>⚠️</span>
                                    <span>RECALL TOW TRUCK TO DEPOT</span>
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <select
                                        value={selectedTruckId}
                                        onChange={(e) => setSelectedTruckId(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            borderRadius: '4px',
                                            border: '1px solid var(--asphalt-400)',
                                            backgroundColor: 'var(--fk-white)',
                                            color: 'var(--fk-text)',
                                            cursor: availableTrucks.length > 0 ? 'pointer' : 'not-allowed'
                                        }}
                                        disabled={availableTrucks.length === 0}
                                    >
                                        {availableTrucks.length > 0 ? (
                                            availableTrucks.map((truck, idx) => (
                                                <option key={truck.id} value={truck.id}>
                                                    {truck.id.split('-').pop()} ({truck.depotName.replace(' Depot', '')} - {truck.distance.toFixed(1)} km){idx === 0 ? ' ⭐ RECOMMENDED' : ''}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">No Trucks in Bay</option>
                                        )}
                                    </select>
                                </div>
                                
                                <button 
                                    onClick={() => selectedTruckId && onDispatchTow(selectedTruckId)}
                                    disabled={!selectedTruckId}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: selectedTruckId ? 'pointer' : 'not-allowed',
                                        backgroundColor: selectedTruckId ? '#ea580c' : 'var(--fk-bg)',
                                        color: selectedTruckId ? 'white' : 'var(--fk-text-secondary)',
                                        border: `1.5px solid ${selectedTruckId ? '#ea580c' : 'var(--asphalt-400)'}`,
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s',
                                        opacity: selectedTruckId ? 1 : 0.6
                                    }}
                                >
                                    <span style={{ fontSize: '15px' }}>🚛</span>
                                    <span>DISPATCH ASSIGNED TOW</span>
                                </button>
                                
                                {availableTrucks.length === 0 && (
                                    <div style={{
                                        fontSize: '9.5px',
                                        color: 'var(--enforcement-red)',
                                        textAlign: 'center',
                                        backgroundColor: '#ffebee',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        border: '1.5px solid #ffcdd2'
                                    }}>
                                        ⚠️ All BTP Tow Trucks deployed. Recall a truck to free it up.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

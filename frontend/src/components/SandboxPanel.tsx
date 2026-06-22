import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, ShieldAlert, FileImage, Camera, Monitor } from 'lucide-react';
import type { TowTruck } from '../App';
import { API_BASE } from '../lib/api';

const CCTV_STREAMS = [
    { id: 'CCTV-01', name: 'Richmond Road Junction', url: '/car-detection.mp4', violation: 'DOUBLE PARKING', plate: 'KA-03-NP-1290', model: 'Hyundai Creta', owner: 'Ramesh Gowda', severity: 'Medium Obstruction' },
    { id: 'CCTV-02', name: 'Brigade Road Crossing', url: '/car-detection.mp4', violation: 'PARKING ON FOOTPATH', plate: 'KA-02-MH-4412', model: 'Honda Activa 6G', owner: 'Priya Sharma', severity: 'Pedestrian Hazard' },
    { id: 'CCTV-03', name: 'Indiranagar 100ft Road', url: '/car-detection.mp4', violation: 'JUNCTION BLOCKING', plate: 'KA-53-MC-8801', model: 'Maruti Suzuki Swift', owner: 'Anil Kumar', severity: 'High Congestion' }
];

interface SandboxPanelProps {
    towTrucks?: TowTruck[];
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({ towTrucks = [] }) => {
    const [activeTab, setActiveTab] = useState<'LIVE' | 'MANUAL'>('LIVE');
    
    // --- MANUAL UPLOAD STATES ---
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanDone, setScanDone] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [injected, setInjected] = useState(false);
    const [boundingBoxes, setBoundingBoxes] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
    const [injectedIds, setInjectedIds] = useState<Record<string, boolean>>({});

    // --- LIVE CCTV SIMULATOR STATES ---
    const [selectedCctv, setSelectedCctv] = useState(CCTV_STREAMS[0]);
    const [cctvTime, setCctvTime] = useState(0); // 0 to 12 second loop
    const [ocrText, setOcrText] = useState('');
    const [liveInjected, setLiveInjected] = useState(false);

    const [localDemoTow, setLocalDemoTow] = useState<{ status: 'AVAILABLE' | 'EN_ROUTE' | 'ON_SITE' | 'RETURNING' | 'AT_DEPOT'; progress: number; id: string } | null>(null);
    const [liveRtoInfo, setLiveRtoInfo] = useState<any | null>(null);
    const [loadingLiveRto, setLoadingLiveRto] = useState(false);

    // Local demo tow truck animation loop (when triggered inside Sandbox)
    useEffect(() => {
        if (!localDemoTow) return;

        const interval = setInterval(() => {
            setLocalDemoTow(prev => {
                if (!prev) return null;
                if (prev.status === 'EN_ROUTE') {
                    const nextProgress = Math.min(prev.progress + 0.05, 1.0);
                    if (nextProgress === 1.0) {
                        return { ...prev, status: 'ON_SITE', progress: 1.0 };
                    }
                    return { ...prev, progress: nextProgress };
                } else if (prev.status === 'ON_SITE') {
                    // Stays on site for 6 ticks (3 seconds) to load the vehicle
                    const ticks = (prev as any).ticks ?? 0;
                    if (ticks >= 6) {
                        return { ...prev, status: 'RETURNING', progress: 1.0, ticks: undefined };
                    }
                    return { ...prev, ticks: ticks + 1 } as any;
                } else if (prev.status === 'RETURNING') {
                    const nextProgress = Math.max(prev.progress - 0.05, 0.0);
                    if (nextProgress === 0.0) {
                        return null; // finished!
                    }
                    return { ...prev, progress: nextProgress };
                }
                return prev;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [localDemoTow]);

    const triggerLocalDemoTow = () => {
        setLocalDemoTow({
            id: 'BTP-DEMO-TOW',
            status: 'EN_ROUTE',
            progress: 0.0
        });
    };

    const matchedRealTow = towTrucks?.find(truck => {
        if (!truck.assignedHotspotId) return false;
        const name = (truck.assignedHotspotName || '').toLowerCase();
        if (selectedCctv.id === 'CCTV-01' && name.includes('richmond')) return true;
        if (selectedCctv.id === 'CCTV-02' && name.includes('brigade')) return true;
        if (selectedCctv.id === 'CCTV-03' && name.includes('indiranagar')) return true;
        return false;
    });

    const activeTow = matchedRealTow || localDemoTow;
    const isViolatorVisible = !activeTow || (activeTow.status !== 'RETURNING' && activeTow.status !== 'AT_DEPOT');

    const isEnRouteOrNoTow = !activeTow || activeTow.status === 'EN_ROUTE';
    const violatorLeftPercent = isEnRouteOrNoTow
        ? 32 + ((Math.max(4, cctvTime) - 4) / 8) * 26
        : 42.5;


    // Live simulator tick
    useEffect(() => {
        if (activeTab !== 'LIVE') return;
        
        const interval = setInterval(() => {
            setCctvTime(prev => {
                const next = (prev + 0.2) % 12;
                
                // OCR character typing simulation (between seconds 5 and 8)
                if (next >= 5 && next <= 8) {
                    const fullPlate = selectedCctv.plate;
                    const progress = (next - 5) / 3; // 0 to 1
                    const charsToShow = Math.floor(fullPlate.length * progress);
                    setOcrText(fullPlate.substring(0, charsToShow));
                } else if (next > 8) {
                    setOcrText(selectedCctv.plate);
                } else {
                    setOcrText('');
                }

                // Reset injected status when cycle wraps back to 0
                if (prev > 11.5 && next < 0.5) {
                    setLiveInjected(false);
                }

                return next;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [activeTab, selectedCctv]);

    // Restart simulator when selection changes
    useEffect(() => {
        setCctvTime(0);
        setOcrText('');
        setLiveInjected(false);
        setLocalDemoTow(null);
        setLiveRtoInfo(null);
        setLoadingLiveRto(false);
    }, [selectedCctv]);

    // Fetch live RTO details once OCR locks on (time >= 8)
    useEffect(() => {
        if (activeTab === 'LIVE' && cctvTime >= 8 && !liveRtoInfo && !loadingLiveRto) {
            setLoadingLiveRto(true);
            fetch(`${API_BASE}/rto/lookup?plate=${encodeURIComponent(selectedCctv.plate)}`)
                .then(res => {
                    if (!res.ok) throw new Error("RTO query failed");
                    return res.json();
                })
                .then(data => {
                    setLiveRtoInfo(data);
                    setLoadingLiveRto(false);
                })
                .catch(err => {
                    console.error("Error looking up live RTO details:", err);
                    setLoadingLiveRto(false);
                });
        }
    }, [activeTab, cctvTime, selectedCctv, liveRtoInfo, loadingLiveRto]);

    // --- MANUAL UPLOAD HANDLERS ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
            setScanning(false);
            setScanDone(false);
            setResults(null);
            setInjected(false);
        };
        reader.readAsDataURL(file);
    };

    const triggerAIScan = async () => {
        if (!imagePreview) return;
        setScanning(true);
        setScanDone(false);
        setResults(null);
        setBoundingBoxes([]);
        setInjected(false);
        setSelectedVehicle(null);
        setInjectedIds({});

        try {
            const scanDelay = new Promise(resolve => setTimeout(resolve, 2000));
            const apiCall = fetch(`${API_BASE}/sandbox/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imagePreview })
            });

            const [_, response] = await Promise.all([scanDelay, apiCall]);

            if (response.ok) {
                const data = await response.json();
                setResults(data.primary);
                setBoundingBoxes(data.boundingBoxes);
                setScanDone(true);
            } else {
                console.error("Failed to retrieve sandbox scan results");
            }
        } catch (e) {
            console.error("Error performing sandbox scan", e);
        } finally {
            setScanning(false);
        }
    };

    const injectIntoQueue = async () => {
        if (!results) return;
        await injectVehicleIntoQueue(results);
    };

    const injectVehicleIntoQueue = async (vehicle: any) => {
        if (!vehicle || vehicle.violation === 'NONE') return;
        
        try {
            const response = await fetch(`${API_BASE}/triage/inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: vehicle.id,
                    created_datetime: new Date().toISOString(),
                    location: vehicle.location,
                    vehicle_type: vehicle.vehicleType,
                    violation_type: vehicle.violation,
                    actual_status: 'approved',
                    confidence_score: vehicle.confidence / 100,
                    ai_recommendation: 'APPROVE'
                })
            });

            if (response.ok) {
                setInjectedIds(prev => ({ ...prev, [vehicle.id]: true }));
                if (results && vehicle.id === results.id) {
                    setInjected(true);
                }
            }
        } catch (e) {
            console.error("Failed to inject vehicle", e);
        }
    };

    // --- LIVE CCTV INJECTION ---
    const injectLiveViolation = async () => {
        try {
            const response = await fetch(`${API_BASE}/triage/inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: `LIVE-${selectedCctv.id}-${Date.now()}`,
                    created_datetime: new Date().toISOString(),
                    location: selectedCctv.name,
                    vehicle_type: selectedCctv.id === 'CCTV-02' ? 'TWO_WHEELER' : 'CAR',
                    violation_type: selectedCctv.violation,
                    actual_status: 'approved',
                    confidence_score: 0.98,
                    ai_recommendation: 'APPROVE'
                })
            });

            if (response.ok) {
                setLiveInjected(true);
            }
        } catch (e) {
            console.error("Failed to inject live violation", e);
        }
    };

    return (
        <div style={{ flex: 1, backgroundColor: 'var(--fk-bg)', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.5rem', color: 'var(--fk-text)' }}>Detection Sandbox</h2>
                        <p style={{ color: 'var(--fk-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
                            Scan surveillance feeds and photos using real-time computer vision and OCR plate matchers.
                        </p>
                    </div>

                    {/* Tab controls */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: 'var(--asphalt-400)',
                        padding: '4px',
                        borderRadius: '8px',
                        gap: '4px'
                    }}>
                        <button
                            onClick={() => setActiveTab('LIVE')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                backgroundColor: activeTab === 'LIVE' ? 'var(--fk-white)' : 'transparent',
                                color: activeTab === 'LIVE' ? 'var(--fk-blue)' : 'var(--fk-text-secondary)',
                                transition: 'all 0.15s'
                            }}
                        >
                            <Monitor size={14} /> Live CCTV Feeds
                        </button>
                        <button
                            onClick={() => setActiveTab('MANUAL')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                backgroundColor: activeTab === 'MANUAL' ? 'var(--fk-white)' : 'transparent',
                                color: activeTab === 'MANUAL' ? 'var(--fk-blue)' : 'var(--fk-text-secondary)',
                                transition: 'all 0.15s'
                            }}
                        >
                            <Upload size={14} /> Photo Upload
                        </button>
                    </div>
                </div>

                {/* TAB 1: LIVE CCTV SURVEILLANCE */}
                {activeTab === 'LIVE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem' }}>
                        
                        {/* Left Column: CCTV Monitor screen */}
                        <div style={{
                            backgroundColor: 'var(--fk-white)',
                            borderRadius: '12px',
                            border: '1px solid var(--fk-border)',
                            padding: '20px',
                            boxShadow: 'var(--fk-shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--fk-text)' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#e11d48', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                    LIVE CCTV MONITOR - {selectedCctv.id}
                                </h3>
                                <div style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', fontWeight: 600 }}>
                                    📍 {selectedCctv.name}
                                </div>
                            </div>

                            {/* Surveillance Feed Monitor */}
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                height: '340px',
                                backgroundColor: '#000',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '3px solid var(--asphalt-950)',
                                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
                            }}>
                                {/* Animated SVG Traffic Fallback / Underlay */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: '#0c101a',
                                    zIndex: 1
                                }}>
                                    {/* Road graphics */}
                                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                                        {/* Sidewalk outlines */}
                                        <line x1="0" y1="120" x2="100%" y2="120" stroke="#334155" strokeWidth="2" />
                                        <line x1="0" y1="260" x2="100%" y2="260" stroke="#334155" strokeWidth="2" />
                                        
                                        {/* Asphalt grid texture lines */}
                                        <line x1="0" y1="190" x2="100%" y2="190" stroke="#1e293b" strokeWidth="2" strokeDasharray="15 15" />
                                        
                                        {/* No Parking Red Zone box */}
                                        <rect x="40%" y="100" width="18%" height="60" fill="rgba(239, 68, 68, 0.08)" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" />
                                        <text x="49%" y="90" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">NO PARKING ZONE</text>
                                        
                                        {/* Lane Indicators */}
                                        <text x="5%" y="150" fill="#334155" fontSize="8" fontFamily="monospace">LANE A →</text>
                                        <text x="95%" y="235" fill="#334155" fontSize="8" fontFamily="monospace" textAnchor="end">← LANE B</text>
                                        
                                        {/* Landmark outline background based on area */}
                                        {selectedCctv.id === 'CCTV-01' && (
                                            <>
                                                {/* Richmond road junction backdrop */}
                                                <rect x="10%" y="20" width="80" height="70" fill="none" stroke="#1e293b" strokeWidth="1" />
                                                <rect x="15%" y="30" width="30" height="60" fill="none" stroke="#1e293b" strokeWidth="1" />
                                                <text x="12%" y="15" fill="#1e293b" fontSize="7" fontFamily="monospace">RICHMOND TOWER</text>
                                            </>
                                        )}
                                        {selectedCctv.id === 'CCTV-02' && (
                                            <>
                                                {/* Brigade Road Crossing backdrop */}
                                                <circle cx="85%" cy="60" r="30" fill="none" stroke="#1e293b" strokeWidth="1" />
                                                <text x="85%" y="63" fill="#1e293b" fontSize="7" fontFamily="monospace" textAnchor="middle">BANYAN TREE</text>
                                            </>
                                        )}
                                        {selectedCctv.id === 'CCTV-03' && (
                                            <>
                                                {/* Raymond shop street backdrop */}
                                                <rect x="70%" y="30" width="100" height="60" fill="none" stroke="#1e293b" strokeWidth="1" />
                                                <text x="75%" y="20" fill="#1e293b" fontSize="7" fontFamily="monospace">RAYMOND STORE</text>
                                            </>
                                        )}
                                    </svg>

                                    {/* Animated Vector Vehicle 1 (Car) moving left-to-right */}
                                    {cctvTime > 1 && cctvTime < 10 && (
                                        <div style={{
                                            position: 'absolute',
                                            left: `${20 + (cctvTime - 1) * 8}%`,
                                            top: '46%',
                                            width: '56px',
                                            height: '36px',
                                            backgroundColor: '#1b3a24',
                                            border: '2.5px solid #22c55e',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            boxShadow: '0 0 10px rgba(34,197,94,0.4)',
                                            transition: 'left 0.2s linear'
                                        }}>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#22c55e' }}>🚗</span>
                                            {/* Headlight beams */}
                                            <div style={{
                                                position: 'absolute',
                                                right: '-25px',
                                                top: '6px',
                                                width: '25px',
                                                height: '20px',
                                                background: 'linear-gradient(90deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0) 100%)',
                                                clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0 70%)'
                                            }} />
                                        </div>
                                    )}

                                    {/* Animated Vector Vehicle 2 (Motorcycle) moving right-to-left */}
                                    {cctvTime > 3 && cctvTime < 12 && (
                                        <div style={{
                                            position: 'absolute',
                                            right: `${15 + (cctvTime - 3) * 7}%`,
                                            top: '62%',
                                            width: '45px',
                                            height: '25px',
                                            backgroundColor: '#172554',
                                            border: '2.5px solid #3b82f6',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            boxShadow: '0 0 10px rgba(59,130,246,0.4)',
                                            transition: 'right 0.2s linear'
                                        }}>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#3b82f6' }}>🛵</span>
                                            {/* Headlight beams */}
                                            <div style={{
                                                position: 'absolute',
                                                left: '-25px',
                                                top: '3px',
                                                width: '25px',
                                                height: '18px',
                                                background: 'linear-gradient(-90deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0) 100%)',
                                                clipPath: 'polygon(100% 30%, 0 0, 0 100%, 100% 70%)'
                                            }} />
                                        </div>
                                    )}

                                    {/* Animated Stationary Violator Car (Sedan) parked */}
                                    {cctvTime >= 4 && isViolatorVisible && (
                                        <div style={{
                                            position: 'absolute',
                                            left: `${violatorLeftPercent}%`,
                                            top: '29%',
                                            width: '90px',
                                            height: '60px',
                                            backgroundColor: '#451a1a',
                                            border: '2.5px solid #ef4444',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '4px 0',
                                            boxShadow: '0 0 12px rgba(239,68,68,0.5)',
                                            boxSizing: 'border-box'
                                        }}>
                                            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}>
                                                {selectedCctv.id === 'CCTV-02' ? '🛵' : '🚙'}
                                            </span>
                                            {/* Mock license plate box on vehicle */}
                                            <div style={{
                                                width: '45px',
                                                height: '14px',
                                                backgroundColor: '#000',
                                                border: '1px solid #ff9800',
                                                borderRadius: '2px',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                fontSize: '7.5px',
                                                fontFamily: 'monospace',
                                                color: '#ff9800',
                                                fontWeight: 'bold'
                                            }}>
                                                {ocrText || 'KA-XX-XX'}
                                            </div>
                                        </div>
                                    )}

                                    {/* BTP Tow Truck entering/on-site/returning */}
                                    {activeTow && (
                                        <div style={{
                                            position: 'absolute',
                                            left: `${activeTow.status === 'EN_ROUTE' 
                                                ? -30 + activeTow.progress * 60 
                                                : activeTow.status === 'ON_SITE' 
                                                    ? 30 
                                                    : 30 + (1.0 - activeTow.progress) * 85}%`,
                                            top: '24%',
                                            width: '95px',
                                            height: '75px',
                                            zIndex: 12,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            pointerEvents: 'none',
                                            transition: 'left 0.2s linear'
                                        }}>
                                            {/* Flashing Amber Warning Light */}
                                            {(activeTow.status === 'ON_SITE' || activeTow.status === 'RETURNING') && (
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    backgroundColor: '#ff9800',
                                                    borderRadius: '50%',
                                                    margin: '0 auto 2px auto',
                                                    boxShadow: '0 0 10px #ff9800, 0 0 20px #ff9800',
                                                    animation: 'pulse 0.4s infinite'
                                                }} />
                                            )}
                                            
                                            {/* Towed vehicle on back if returning */}
                                            {activeTow.status === 'RETURNING' && (
                                                <div style={{
                                                    width: '56px',
                                                    height: '32px',
                                                    backgroundColor: '#451a1a',
                                                    border: '1.5px solid #ef4444',
                                                    borderRadius: '4px',
                                                    position: 'absolute',
                                                    left: '5px',
                                                    top: '18px',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    opacity: 0.85
                                                }}>
                                                    <span style={{ fontSize: '7px' }}>{selectedCctv.id === 'CCTV-02' ? '🛵' : '🚙'}</span>
                                                </div>
                                            )}

                                            {/* Truck body */}
                                            <div style={{
                                                width: '100%',
                                                height: '36px',
                                                backgroundColor: '#1e293b',
                                                border: '2.5px solid #475569',
                                                borderRadius: '4px 10px 4px 4px',
                                                boxShadow: '0 0 10px rgba(71,85,105,0.4)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0 6px',
                                                boxSizing: 'border-box'
                                            }}>
                                                <span style={{ fontSize: '7.5px', color: '#ff9800', fontWeight: 'bold', fontFamily: 'monospace' }}>BTP TOW</span>
                                                <span style={{ fontSize: '12px' }}>🚛</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tow hook line */}
                                    {activeTow && activeTow.status === 'ON_SITE' && (
                                        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 11 }}>
                                            <line x1="39%" y1="165" x2="43%" y2="165" stroke="#ff9800" strokeWidth="2" strokeDasharray="3 3" />
                                        </svg>
                                    )}
                                </div>



                                {/* CRT scanlines filter overlay */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                                    backgroundSize: '100% 4px, 6px 100%',
                                    pointerEvents: 'none',
                                    zIndex: 5
                                }} />

                                {/* Moving Vehicle 1: Green Box */}
                                {cctvTime > 1 && cctvTime < 10 && (
                                    <div style={{
                                        position: 'absolute',
                                        left: `${20 + (cctvTime - 1) * 8}%`,
                                        top: '45%',
                                        width: '60px',
                                        height: '50px',
                                        border: '2px solid #22c55e',
                                        boxSizing: 'border-box',
                                        zIndex: 10,
                                        pointerEvents: 'none'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '-14px',
                                            left: '-2px',
                                            backgroundColor: '#22c55e',
                                            color: '#fff',
                                            fontSize: '8px',
                                            fontWeight: 'bold',
                                            padding: '1px 4px',
                                            whiteSpace: 'nowrap',
                                            borderRadius: '2px'
                                        }}>
                                            CAR | 45 km/h
                                        </div>
                                    </div>
                                )}

                                {/* Moving Vehicle 2: Green Box */}
                                {cctvTime > 3 && cctvTime < 12 && (
                                    <div style={{
                                        position: 'absolute',
                                        right: `${15 + (cctvTime - 3) * 7}%`,
                                        top: '60%',
                                        width: '50px',
                                        height: '45px',
                                        border: '2px solid #22c55e',
                                        boxSizing: 'border-box',
                                        zIndex: 10,
                                        pointerEvents: 'none'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '-14px',
                                            left: '-2px',
                                            backgroundColor: '#22c55e',
                                            color: '#fff',
                                            fontSize: '8px',
                                            fontWeight: 'bold',
                                            padding: '1px 4px',
                                            whiteSpace: 'nowrap',
                                            borderRadius: '2px'
                                        }}>
                                            MOTO | 38 km/h
                                        </div>
                                    </div>
                                )}

                                {/* Stationary Violator: Red Box appears from second 4 */}
                                {cctvTime >= 4 && isViolatorVisible && (
                                    <div style={{
                                        position: 'absolute',
                                        left: `${violatorLeftPercent - 0.5}%`,
                                        top: '28%',
                                        width: '95px',
                                        height: '80px',
                                        border: '3px solid #ef4444',
                                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)',
                                        boxSizing: 'border-box',
                                        zIndex: 15,
                                        pointerEvents: 'none',
                                        animation: 'pulse 1s infinite'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '-18px',
                                            left: '-3px',
                                            backgroundColor: '#ef4444',
                                            color: '#fff',
                                            fontSize: '8.5px',
                                            fontWeight: 'bold',
                                            padding: '2px 6px',
                                            whiteSpace: 'nowrap',
                                            borderRadius: '2px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}>
                                            ⚠️ INFRACTION: {selectedCctv.violation} {isEnRouteOrNoTow ? ' (MOVING @ 12 km/h)' : ' (STOPPED)'}
                                        </div>

                                        {/* Horizontal Laser Scanning Bar (between seconds 5 and 8) */}
                                        {cctvTime >= 5 && cctvTime <= 8 && (
                                            <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                width: '100%',
                                                height: '4px',
                                                backgroundColor: '#f97316', // Neon orange laser
                                                boxShadow: '0 0 10px #f97316, 0 0 20px #f97316',
                                                animation: 'scanAnimation 1.5s infinite linear'
                                            }} />
                                        )}
                                    </div>
                                )}

                                {/* HUD Cam Metadata */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    fontFamily: 'monospace',
                                    color: '#22c55e',
                                    fontSize: '9px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                }}>
                                    <span>REC ● PLAY</span>
                                    <span>FPS: 30.00</span>
                                    <span>CAM: {selectedCctv.id}</span>
                                </div>

                                <div style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    right: '12px',
                                    fontFamily: 'monospace',
                                    color: '#22c55e',
                                    fontSize: '9px',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                }}>
                                    {new Date().toISOString().substring(0, 19).replace('T', ' ')} IST
                                </div>
                            </div>

                            {/* Feed stream controllers */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {CCTV_STREAMS.map(stream => (
                                    <button
                                        key={stream.id}
                                        onClick={() => setSelectedCctv(stream)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            border: `1.5px solid ${selectedCctv.id === stream.id ? 'var(--fk-blue)' : 'var(--asphalt-400)'}`,
                                            backgroundColor: selectedCctv.id === stream.id ? '#f0f4ff' : 'var(--fk-white)',
                                            color: selectedCctv.id === stream.id ? 'var(--fk-blue)' : 'var(--fk-text)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <Camera size={12} /> {stream.name.split(' ')[0]} Feeds
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: CCTV AI Scan Metrics */}
                        <div style={{
                            backgroundColor: 'var(--fk-white)',
                            borderRadius: '12px',
                            border: '1px solid var(--fk-border)',
                            padding: '24px',
                            boxShadow: 'var(--fk-shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '430px'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 14px 0', borderBottom: '1px solid var(--fk-border)', paddingBottom: '8px', color: 'var(--fk-text)' }}>
                                    OCR SURVEILLANCE INTEL
                                </h3>

                                {cctvTime < 4 ? (
                                    <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--fk-text-secondary)' }}>
                                        <Monitor size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5, animation: 'pulse 2s infinite' }} />
                                        <h4 style={{ margin: '0 0 4px 0', color: 'var(--fk-text)' }}>Monitoring Traffic...</h4>
                                        <p style={{ fontSize: '11.5px', margin: 0 }}>Scanning street corridor. Waiting for stationary parking violations to lock-on.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {/* Status header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                                backgroundColor: '#ffebee',
                                                color: '#c62828',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                textTransform: 'uppercase',
                                                border: '1px solid #ffcdcd'
                                            }}>
                                                ⚠️ {selectedCctv.violation}
                                            </span>
                                            
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: cctvTime >= 8 ? '#2e7d32' : '#b45309' }}>
                                                {cctvTime >= 8 ? '● OCR LOCKED' : '⚡ OCR SCANNING...'}
                                            </span>
                                        </div>

                                        {/* Scanning box */}
                                        <div style={{
                                            padding: '12px',
                                            backgroundColor: 'var(--asphalt-950)',
                                            border: '2px solid var(--asphalt-400)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{ fontSize: '8px', color: 'var(--asphalt-200)', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Plate OCR Buffer</span>
                                            <div style={{
                                                fontSize: '22px',
                                                fontWeight: 'bold',
                                                fontFamily: 'monospace',
                                                color: cctvTime >= 8 ? '#4caf50' : '#f97316',
                                                letterSpacing: '2px',
                                                textShadow: cctvTime >= 8 ? '0 0 10px rgba(76,175,80,0.4)' : '0 0 10px rgba(249,115,22,0.4)',
                                                minHeight: '33px'
                                            }}>
                                                {ocrText || '_ _ _ _ _ _ _ _ _ _'}
                                            </div>
                                        </div>

                                        {/* Vehicle stats */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f0f0f0', paddingBottom: '4px' }}>
                                                <span style={{ color: 'var(--fk-text-secondary)' }}>Registered Owner:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--fk-text)' }}>{cctvTime >= 8 ? selectedCctv.owner : 'Pending OCR...'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f0f0f0', paddingBottom: '4px' }}>
                                                <span style={{ color: 'var(--fk-text-secondary)' }}>Vehicle Model:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--fk-text)' }}>{cctvTime >= 8 ? selectedCctv.model : 'Pending OCR...'}</span>
                                            </div>
                                            {liveRtoInfo && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f0f0f0', paddingBottom: '4px' }}>
                                                    <span style={{ color: 'var(--fk-text-secondary)' }}>Registration Date:</span>
                                                    <span style={{ fontWeight: 'bold', color: 'var(--fk-text)' }}>{liveRtoInfo.registrationDate}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f0f0f0', paddingBottom: '4px' }}>
                                                <span style={{ color: 'var(--fk-text-secondary)' }}>Infraction Severity:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--enforcement-red)' }}>{selectedCctv.severity}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: liveRtoInfo ? '1px dashed #f0f0f0' : 'none', paddingBottom: liveRtoInfo ? '4px' : '0' }}>
                                                <span style={{ color: 'var(--fk-text-secondary)' }}>System Confidence:</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--clearance-green)' }}>{cctvTime >= 8 ? '98.4%' : 'Estimating...'}</span>
                                            </div>
                                        </div>

                                        {/* Live RTO Past Violations History */}
                                        {liveRtoInfo && (
                                            <div style={{ 
                                                borderTop: '1px solid var(--fk-border)', 
                                                paddingTop: '12px',
                                                marginTop: '8px'
                                            }}>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--fk-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    RTO Past Violations History
                                                </div>
                                                {liveRtoInfo.pastViolations && liveRtoInfo.pastViolations.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                                                        {liveRtoInfo.pastViolations.map((v: any, idx: number) => (
                                                            <div key={idx} style={{
                                                                backgroundColor: 'var(--asphalt-700)',
                                                                border: '1px solid var(--asphalt-500)',
                                                                borderRadius: '6px',
                                                                padding: '6px 8px',
                                                                fontSize: '11px',
                                                                color: 'var(--road-white)'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2px' }}>
                                                                    <span style={{ color: '#ef4444' }}>{v.type}</span>
                                                                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{v.date}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85, fontSize: '10px' }}>
                                                                    <span>📍 {v.location}</span>
                                                                    <span style={{ fontWeight: 'bold', color: v.status.includes('Pending') ? '#ff9800' : '#42a5f5' }}>
                                                                        {v.status} ({v.fine})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ 
                                                        fontSize: '12px', 
                                                        color: 'var(--clearance-green)', 
                                                        fontStyle: 'italic',
                                                        padding: '4px 0'
                                                    }}>
                                                        ✓ No prior violations found in RTO registry.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Ingestion triggers */}
                            {cctvTime >= 8 && (
                                <div style={{ marginTop: '16px' }}>
                                    {!liveInjected ? (
                                        <button
                                            onClick={injectLiveViolation}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'var(--fk-blue)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 4px 10px rgba(30,98,208,0.2)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <ShieldAlert size={16} />
                                            INJECT LIVE VIOLATION INTO QUEUE
                                        </button>
                                    ) : (
                                        <div style={{
                                            backgroundColor: '#e8f5e9',
                                            border: '1.5px solid var(--clearance-green)',
                                            color: 'var(--clearance-green)',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            fontSize: '12.5px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                            <CheckCircle2 size={16} />
                                            VIOLATION SENT TO ENFORCEMENT QUEUE
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BTP Tow Fleet Control in Sandbox */}
                            <div style={{ marginTop: '16px', borderTop: '1px solid var(--fk-border)', paddingTop: '16px' }}>
                                {!activeTow ? (
                                    <button
                                        onClick={triggerLocalDemoTow}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: '#374151',
                                            color: '#fff',
                                            border: '1px solid #4b5563',
                                            borderRadius: '6px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <span>🚛</span> DEMO TOW TRUCK DISPATCH
                                    </button>
                                ) : (
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: activeTow.status === 'EN_ROUTE' ? '#fffbeb' : activeTow.status === 'ON_SITE' ? '#ffebee' : '#e8f5e9',
                                        border: `1.5px solid ${activeTow.status === 'EN_ROUTE' ? '#fef3c7' : activeTow.status === 'ON_SITE' ? '#ffcdcd' : '#a7f3d0'}`,
                                        borderRadius: '6px',
                                        fontSize: '12.5px',
                                        color: activeTow.status === 'EN_ROUTE' ? '#b45309' : activeTow.status === 'ON_SITE' ? '#b71c1c' : '#047857',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>🚛</span> TOW DISPATCH ACTIVE: {activeTow.status.replace('_', ' ')}
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b', textAlign: 'center' }}>
                                            {activeTow.status === 'EN_ROUTE' && `En Route to site (ETA: ${Math.ceil((1.0 - activeTow.progress) * 25)}s)`}
                                            {activeTow.status === 'ON_SITE' && 'Towing vehicle (securing to bed)...'}
                                            {activeTow.status === 'RETURNING' && `Returning to yard (transit progress: ${Math.round((1.0 - activeTow.progress) * 100)}%)`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: MANUAL PHOTO UPLOAD (Original features preserved) */}
                {activeTab === 'MANUAL' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        
                        {/* Left Column: Upload area */}
                        <div style={{
                            backgroundColor: 'var(--fk-white)',
                            borderRadius: '12px',
                            border: '1px solid var(--fk-border)',
                            padding: '24px',
                            boxShadow: 'var(--fk-shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            position: 'relative'
                        }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>INPUT SOURCE</h3>
                            
                            {!imagePreview ? (
                                <label style={{
                                    flex: 1,
                                    minHeight: '260px',
                                    border: '2px dashed var(--fk-border)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#fcfcfd'
                                }}>
                                    <Upload size={36} color="var(--fk-blue)" />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>Upload Street Photo</span>
                                    <span style={{ fontSize: '11px', color: 'var(--fk-text-secondary)' }}>Supports JPG, PNG</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                </label>
                            ) : (
                                <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--fk-border)' }}>
                                    <img src={imagePreview} alt="Upload Preview" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '340px', objectFit: 'contain', backgroundColor: '#000' }} />
                                    
                                    {/* Scanning line animation */}
                                    {scanning && (
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            width: '100%',
                                            height: '4px',
                                            backgroundColor: '#4CAF50',
                                            boxShadow: '0 0 12px #4CAF50',
                                            animation: 'scanAnimation 2s infinite linear'
                                        }} />
                                    )}

                                    {/* Dynamic Bounding Boxes (Click to open Popup Modal) */}
                                    {scanDone && boundingBoxes.map((box, index) => (
                                        <div 
                                            key={box.id || index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedVehicle(box.details);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: box.top,
                                                left: box.left,
                                                width: box.width,
                                                height: box.height,
                                                border: box.isViolator ? '3px solid #ff3b30' : '2px solid #4CAF50',
                                                boxSizing: 'border-box',
                                                boxShadow: box.isViolator ? '0 0 8px rgba(255, 59, 48, 0.6)' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease-in-out',
                                                zIndex: 10
                                            }}
                                            title="Click to view details"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderWidth = box.isViolator ? '4px' : '3px';
                                                e.currentTarget.style.boxShadow = box.isViolator ? '0 0 14px rgba(255, 59, 48, 0.8)' : '0 0 10px rgba(76, 175, 80, 0.8)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderWidth = box.isViolator ? '3px' : '2px';
                                                e.currentTarget.style.boxShadow = box.isViolator ? '0 0 8px rgba(255, 59, 48, 0.6)' : 'none';
                                            }}
                                        >
                                            <div style={{
                                                backgroundColor: box.isViolator ? 'rgba(255, 59, 48, 0.95)' : 'rgba(76, 175, 80, 0.95)',
                                                color: '#fff',
                                                padding: '2px 6px',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: box.isViolator ? '10px' : '8px',
                                                fontWeight: 'bold',
                                                position: 'absolute',
                                                top: box.isViolator ? '-20px' : '-16px',
                                                left: '-3px',
                                                whiteSpace: 'nowrap',
                                                borderRadius: '2px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                            }}>
                                                {box.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                {imagePreview && (
                                    <button 
                                        onClick={() => setImagePreview(null)}
                                        style={{
                                            padding: '10px 16px',
                                            border: '1px solid var(--fk-border)',
                                            backgroundColor: '#fff',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        CLEAR
                                    </button>
                                )}
                                <button 
                                    onClick={triggerAIScan}
                                    disabled={!imagePreview || scanning}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        border: 'none',
                                        backgroundColor: !imagePreview || scanning ? '#e0e0e0' : 'var(--fk-blue)',
                                        color: '#fff',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        cursor: !imagePreview || scanning ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {scanning ? 'SCANNING IMAGE...' : 'RUN VEHICLE SCAN'}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: AI Outputs */}
                        <div style={{
                            backgroundColor: 'var(--fk-white)',
                            borderRadius: '12px',
                            border: '1px solid var(--fk-border)',
                            padding: '24px',
                            boxShadow: 'var(--fk-shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            {!scanDone && !scanning && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fk-text-secondary)' }}>
                                    <FileImage size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--fk-text)' }}>Awaiting Scan</h4>
                                    <p style={{ fontSize: '12px', margin: 0 }}>Upload a street parking image and trigger the scanner to view details.</p>
                                </div>
                            )}

                            {scanning && (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div className="spinner" style={{
                                        width: '40px',
                                        height: '40px',
                                        border: '3px solid #f3f3f3',
                                        borderTop: '3px solid var(--fk-blue)',
                                        borderRadius: '50%',
                                        margin: '0 auto 16px auto',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <h4 style={{ margin: '0 0 6px 0' }}>Scan in Progress...</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--fk-text-secondary)', margin: 0 }}>Detecting vehicles, reading license plates...</p>
                                </div>
                            )}

                            {scanDone && results && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ borderBottom: '1px solid var(--fk-border)', paddingBottom: '12px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 16px 0' }}>DETECTION METRICS</h3>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{
                                                backgroundColor: 'var(--enforcement-red)',
                                                color: '#fff',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {results.violation}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--fk-text-secondary)' }}>Detected Plate:</span>
                                            <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{results.plate}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--fk-text-secondary)' }}>Vehicle Class:</span>
                                            <span style={{ fontWeight: 'bold' }}>{results.vehicleType}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--fk-text-secondary)' }}>Offense Severity:</span>
                                            <span style={{ fontWeight: 'bold', color: 'var(--enforcement-red)' }}>{results.severity}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--fk-text-secondary)' }}>Certainty Score:</span>
                                            <span style={{ fontWeight: 'bold', color: 'var(--clearance-green)' }}>{results.confidence.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--fk-text-secondary)' }}>Detection Mode:</span>
                                            <span style={{ fontWeight: 'bold', color: 'var(--fk-blue)' }}>Multi-Object Bounding Overlay</span>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {!injected ? (
                                            <button 
                                                onClick={injectIntoQueue}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    backgroundColor: 'var(--fk-blue)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <ShieldAlert size={16} />
                                                INJECT VIOLATION
                                            </button>
                                        ) : (
                                            <div style={{
                                                backgroundColor: '#E8F5E9',
                                                border: '1px solid var(--clearance-green)',
                                                color: 'var(--clearance-green)',
                                                borderRadius: '4px',
                                                padding: '12px',
                                                fontSize: '13px',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}>
                                                <CheckCircle2 size={16} />
                                                VIOLATION SENT TO OFFICER INBOX
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Keyframe scan animations */}
                <style>{`
                    @keyframes scanAnimation {
                        0% { top: 0%; }
                        50% { top: 96%; }
                        100% { top: 0%; }
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 0.9; }
                        50% { transform: scale(1.05); opacity: 1; }
                    }
                `}</style>

            </div>

            {/* Vehicle Detail Popup Modal overlay for photo upload */}
            {selectedVehicle && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(3px)',
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setSelectedVehicle(null)}>
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '520px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideUp 0.2s ease-out'
                    }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{
                            backgroundColor: selectedVehicle.violation !== 'NONE' ? 'var(--enforcement-red)' : 'var(--fk-blue)',
                            color: '#fff',
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                                Vehicle Intel: {selectedVehicle.plate}
                            </h3>
                            <button 
                                onClick={() => setSelectedVehicle(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    padding: '4px'
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', display: 'block', marginBottom: '4px' }}>VEHICLE TYPE</label>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>{selectedVehicle.vehicleType}</span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', display: 'block', marginBottom: '4px' }}>MODEL</label>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>{selectedVehicle.vehicleModel}</span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', display: 'block', marginBottom: '4px' }}>REGISTERED OWNER</label>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>{selectedVehicle.ownerName}</span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', display: 'block', marginBottom: '4px' }}>REGISTRATION DATE</label>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>{selectedVehicle.registrationDate}</span>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', display: 'block', marginBottom: '4px' }}>SPOTTED AREA</label>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>{selectedVehicle.location}</span>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--fk-text-secondary)', display: 'block', marginBottom: '4px' }}>SPOTTED TIME WINDOW</label>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)' }}>{selectedVehicle.timeFromTo}</span>
                                </div>
                            </div>

                            <div style={{ 
                                borderTop: '1px solid var(--fk-border)', 
                                paddingTop: '16px',
                                marginTop: '8px',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '10px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--fk-text-secondary)' }}>Offense Severity:</span>
                                    <span style={{ 
                                        fontSize: '13px', 
                                        fontWeight: 'bold', 
                                        color: selectedVehicle.violation !== 'NONE' ? 'var(--enforcement-red)' : 'var(--clearance-green)' 
                                    }}>
                                        {selectedVehicle.severity}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--fk-text-secondary)' }}>Certainty Score:</span>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--clearance-green)' }}>
                                        {selectedVehicle.confidence.toFixed(1)}%
                                    </span>
                                </div>

                                {selectedVehicle.violation !== 'NONE' && (
                                    <div style={{ 
                                        backgroundColor: '#FFEBEE', 
                                        border: '1px solid #FFCDD2',
                                        borderRadius: '6px', 
                                        padding: '10px 12px',
                                        marginTop: '4px'
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--enforcement-red)', marginBottom: '2px' }}>DETECTED INFRACTION</div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#B71C1C' }}>{selectedVehicle.violation}</div>
                                    </div>
                                )}

                                {/* RTO Past Violations History */}
                                <div style={{ 
                                    borderTop: '1px solid var(--fk-border)', 
                                    paddingTop: '12px',
                                    marginTop: '8px'
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--fk-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        RTO Past Violations History
                                    </div>
                                    {selectedVehicle.pastViolations && selectedVehicle.pastViolations.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                                            {selectedVehicle.pastViolations.map((v: any, idx: number) => (
                                                <div key={idx} style={{
                                                    backgroundColor: 'var(--asphalt-700)',
                                                    border: '1px solid var(--asphalt-500)',
                                                    borderRadius: '6px',
                                                    padding: '8px',
                                                    fontSize: '11.5px',
                                                    color: 'var(--road-white)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2px' }}>
                                                        <span style={{ color: '#ef4444' }}>{v.type}</span>
                                                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{v.date}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85, fontSize: '10.5px' }}>
                                                        <span>📍 {v.location}</span>
                                                        <span style={{ fontWeight: 'bold', color: v.status.includes('Pending') ? '#ff9800' : '#42a5f5' }}>
                                                            {v.status} ({v.fine})
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: 'var(--clearance-green)', 
                                            fontStyle: 'italic',
                                            padding: '4px 0'
                                        }}>
                                            ✓ No prior violations found in RTO registry.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ 
                            padding: '16px 20px', 
                            backgroundColor: '#f8f9fa', 
                            borderTop: '1px solid var(--fk-border)',
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end'
                        }}>
                            <button 
                                onClick={() => setSelectedVehicle(null)}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid var(--fk-border)',
                                    backgroundColor: '#fff',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                CLOSE
                            </button>

                            {selectedVehicle.violation !== 'NONE' && (
                                !injectedIds[selectedVehicle.id] ? (
                                    <button 
                                        onClick={() => injectVehicleIntoQueue(selectedVehicle)}
                                        style={{
                                            padding: '8px 16px',
                                            border: 'none',
                                            backgroundColor: 'var(--fk-blue)',
                                            color: '#fff',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ShieldAlert size={14} />
                                        INJECT VIOLATION
                                    </button>
                                ) : (
                                    <div style={{
                                        backgroundColor: '#E8F5E9',
                                        border: '1px solid var(--clearance-green)',
                                        color: 'var(--clearance-green)',
                                        borderRadius: '4px',
                                        padding: '8px 16px',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <CheckCircle2 size={14} />
                                        INJECTED
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

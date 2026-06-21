import React, { useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import { mapProvider } from '../lib/mapProvider';
import type { Hotspot } from '../lib/api';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { TowTruck } from '../App';
import { NETWORK_NODES, NETWORK_EDGES, EDGE_ROAD_NAMES } from '../App';

interface Map3DProps {
    hotspots: Hotspot[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
    interventions: Map<number, 'CAMERA' | 'PATROL' | 'TOW'>;
    towTrucks: TowTruck[];
    congestionLevels: Record<string, 'GREEN' | 'AMBER' | 'RED'>;
    minImpactScore: number;
    onMinImpactScoreChange: (val: number) => void;
    isSidebarCollapsed: boolean;
    defaultBasemap?: 'LIGHT' | 'DARK' | 'SATELLITE' | 'MAPMYINDIA';
    showTrafficOnly?: boolean;
    showDispatchOnly?: boolean;
    selectedEdgeId?: string | null;
    onSelectEdge?: (edgeId: string | null) => void;
}

// Depots listed for rendering
const DEPOT_LIST = [
    { id: 'central', name: 'BTP HQ Depot', lat: 12.9716, lon: 77.5946, color: '#f97316', label: 'HQ' },
    { id: 'indiranagar', name: 'Indiranagar Depot', lat: 12.9784, lon: 77.6408, color: '#06b6d4', label: 'IND' },
    { id: 'koramangala', name: 'Koramangala Depot', lat: 12.9348, lon: 77.6189, color: '#8b5cf6', label: 'KOR' },
    { id: 'richmond', name: 'Richmond Depot', lat: 12.9600, lon: 77.6010, color: '#ec4899', label: 'RCH' }
];

export const Map3D: React.FC<Map3DProps> = ({ 
    hotspots, 
    selectedId, 
    onSelect, 
    interventions, 
    towTrucks, 
    congestionLevels,
    minImpactScore,
    onMinImpactScoreChange,
    isSidebarCollapsed,
    defaultBasemap = 'DARK',
    showTrafficOnly = false,
    showDispatchOnly = false,
    selectedEdgeId = null,
    onSelectEdge
}) => {
    const [hoverInfo, setHoverInfo] = useState<Hotspot | null>(null);
    const [hoverCoords, setHoverCoords] = useState<{ x: number, y: number } | null>(null);

    // GIS Layer and Basemap States
    const [mapStyleType, setMapStyleType] = useState<'LIGHT' | 'DARK' | 'SATELLITE' | 'MAPMYINDIA'>(defaultBasemap);
    const [mapmyindiaError, setMapmyindiaError] = useState(false);
    const [showTraffic, setShowTraffic] = useState(true);
    const [showDepots, setShowDepots] = useState(true);
    const [showRoutes, setShowRoutes] = useState(true);
    const [showCameras, setShowCameras] = useState(true);

    const effectiveMapStyle = (showTrafficOnly || showDispatchOnly) ? 'DARK' : mapStyleType;
    const effectiveShowTraffic = showDispatchOnly ? false : (showTrafficOnly ? true : showTraffic);
    const effectiveShowDepots = (showTrafficOnly || showDispatchOnly) ? false : showDepots;
    const effectiveShowRoutes = showDispatchOnly ? true : (showTrafficOnly ? false : showRoutes);
    const effectiveShowCameras = (showTrafficOnly || showDispatchOnly) ? false : showCameras;

    const getVehicleEmoji = (type: string) => {
        const t = type.toUpperCase();
        if (t.includes('SUV')) return '🚙';
        if (t.includes('SCOOTER') || t.includes('TWO')) return '🛵';
        if (t.includes('AUTO') || t.includes('THREE')) return '🛺';
        if (t.includes('BUS')) return '🚌';
        if (t.includes('TRUCK')) return '🚛';
        return '🚗';
    };

    const getPinColor = (type: string) => {
        if (type === 'Junction Blocking') {
            return 'var(--signal-amber)';
        }
        return 'var(--enforcement-red)';
    };

    // Helper to calculate the coordinate along a multi-segment route
    const getCoordAlongRoute = (route: [number, number][], progress: number): { lat: number; lon: number } => {
        if (!route || route.length === 0) return { lat: 0, lon: 0 };
        if (route.length === 1) return { lat: route[0][1], lon: route[0][0] };
        
        const totalSegments = route.length - 1;
        const scaledProgress = progress * totalSegments;
        const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
        const segmentProgress = scaledProgress - segmentIndex;
        
        const startPt = route[segmentIndex];
        const endPt = route[segmentIndex + 1];
        
        const lon = startPt[0] + (endPt[0] - startPt[0]) * segmentProgress;
        const lat = startPt[1] + (endPt[1] - startPt[1]) * segmentProgress;
        
        return { lat, lon };
    };

    // Build tow route GeoJSON for all active BTP tow truck dispatches
    const activeTowTrucks = towTrucks.filter(t => t.assignedHotspotId !== null && t.route && t.route.length > 0);

    // Always keep Source & Layer mounted with valid GeoJSON to prevent Maplibre style crashes.
    const routeGeoJSON: any = {
        type: 'FeatureCollection',
        features: activeTowTrucks.map(t => ({
            type: 'Feature' as const,
            properties: { truckId: t.id, status: t.status },
            geometry: {
                type: 'LineString' as const,
                coordinates: t.route
            }
        }))
    };

    // Calculate moving truck coordinates along their paths
    const movingTrucks = activeTowTrucks
        .filter(t => t.status === 'EN_ROUTE' || t.status === 'RETURNING')
        .map(t => {
            const pos = getCoordAlongRoute(t.route, t.progress);
            return {
                id: t.id,
                lat: pos.lat,
                lon: pos.lon,
                status: t.status
            };
        });

    // Build the dynamic traffic network GeoJSON colored by congestion levels
    const trafficGridGeoJSON: any = {
        type: 'FeatureCollection',
        features: NETWORK_EDGES.map(e => {
            const fromNode = NETWORK_NODES[e.from];
            const toNode = NETWORK_NODES[e.to];
            const level = congestionLevels[e.id] || 'GREEN';

            // Build coordinates: from → waypoints → to
            const coordinates: [number, number][] = [
                [fromNode.lon, fromNode.lat],
                ...(e.waypoints || []),
                [toNode.lon, toNode.lat]
            ];

            return {
                type: 'Feature',
                properties: { id: e.id, congestion: level },
                geometry: {
                    type: 'LineString',
                    coordinates
                }
            };
        })
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Map
                initialViewState={mapProvider.DEFAULT_VIEWPORT as any}
                mapStyle={mapProvider.getMapStyle(effectiveMapStyle) as any}
                reuseMaps
                onError={(e) => {
                    console.error("Map style loading error:", e);
                    if (mapStyleType === 'MAPMYINDIA') {
                        setMapStyleType('DARK');
                        setMapmyindiaError(true);
                    }
                }}
            >
                {/* Dynamic Traffic Grid Network — Google Maps style thick colored roads */}
                {effectiveShowTraffic && (
                    <>
                        {/* Outer glow layer for heatmap-like effect */}
                        <Source id="traffic-glow" type="geojson" data={trafficGridGeoJSON}>
                            <Layer
                                id="traffic-glow-line"
                                type="line"
                                paint={{
                                    'line-color': [
                                        'match',
                                        ['get', 'congestion'],
                                        'RED', '#ef4444',
                                        'AMBER', '#f59e0b',
                                        '#10b981'
                                    ],
                                    'line-width': [
                                        'match',
                                        ['get', 'congestion'],
                                        'RED', 18,
                                        'AMBER', 14,
                                        8
                                    ],
                                    'line-opacity': [
                                        'match',
                                        ['get', 'congestion'],
                                        'RED', 0.25,
                                        'AMBER', 0.2,
                                        0.1
                                    ],
                                    'line-blur': 6
                                }}
                            />
                        </Source>
                        {/* Main road color layer — thick and visible */}
                        <Source id="traffic-network" type="geojson" data={trafficGridGeoJSON}>
                            <Layer
                                id="traffic-lines"
                                type="line"
                                paint={{
                                    'line-color': [
                                        'match',
                                        ['get', 'congestion'],
                                        'RED', '#ef4444',
                                        'AMBER', '#f59e0b',
                                        '#22c55e'
                                    ],
                                    'line-width': [
                                        'case',
                                        ['==', ['get', 'id'], selectedEdgeId || ''],
                                        12,
                                        [
                                            'match',
                                            ['get', 'congestion'],
                                            'RED', 8,
                                            'AMBER', 6,
                                            4
                                        ]
                                    ],
                                    'line-opacity': [
                                        'case',
                                        ['==', ['get', 'id'], selectedEdgeId || ''],
                                        1.0,
                                        [
                                            'match',
                                            ['get', 'congestion'],
                                            'RED', 0.9,
                                            'AMBER', 0.8,
                                            0.6
                                        ]
                                    ]
                                }}
                                layout={{
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                }}
                            />
                        </Source>
                    </>
                )}

                {/* Tow Route Lines — using native maplibre layers, always mounted */}
                {effectiveShowRoutes && (
                    <>
                        <Source id="tow-routes-glow" type="geojson" data={routeGeoJSON}>
                            <Layer
                                id="tow-route-glow"
                                type="line"
                                paint={{
                                    'line-color': [
                                        'match',
                                        ['get', 'status'],
                                        'RETURNING', '#94a3b8',
                                        '#f97316'
                                    ],
                                    'line-width': 8,
                                    'line-opacity': 0.15,
                                    'line-blur': 4,
                                }}
                            />
                        </Source>
                        <Source id="tow-routes" type="geojson" data={routeGeoJSON}>
                            <Layer
                                id="tow-route-line"
                                type="line"
                                paint={{
                                    'line-color': [
                                        'match',
                                        ['get', 'status'],
                                        'RETURNING', '#64748b',
                                        '#f97316'
                                    ],
                                    'line-width': 3,
                                    'line-dasharray': [3, 2],
                                }}
                            />
                        </Source>
                    </>
                )}

                {/* 4 Divisional BTP Depots markers */}
                {effectiveShowDepots && DEPOT_LIST.map(depot => (
                    <Marker
                        key={`depot-${depot.id}`}
                        longitude={depot.lon}
                        latitude={depot.lat}
                        anchor="bottom"
                    >
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <div className="tow-depot-pin" style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: '#fff7ed',
                                border: `3px solid ${depot.color}`,
                                borderRadius: '50%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '18px',
                                boxShadow: `0 0 12px ${depot.color}60, 0 4px 8px rgba(0,0,0,0.25)`,
                                position: 'relative',
                                zIndex: 200,
                            }}>
                                🏢
                                <div style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-24px',
                                    backgroundColor: depot.color,
                                    color: '#fff',
                                    fontSize: '6.5px',
                                    fontWeight: 'bold',
                                    borderRadius: '5px',
                                    padding: '1.5px 4px',
                                    whiteSpace: 'nowrap',
                                    border: '1px solid #fff',
                                    letterSpacing: '0.5px',
                                }}>
                                    {depot.label} DEPOT
                                </div>
                            </div>
                            <div style={{
                                width: '3px',
                                height: '14px',
                                background: `linear-gradient(to top, ${depot.color}, rgba(255,255,255,0.1))`,
                                marginTop: '-1px',
                            }} />
                            <div style={{
                                width: '10px',
                                height: '4px',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                borderRadius: '50%',
                                filter: 'blur(1px)',
                                marginTop: '-2px',
                            }} />
                        </div>
                    </Marker>
                ))}

                {/* Tow Truck markers (animated along route) */}
                {effectiveShowRoutes && movingTrucks.map(truck => (
                    <Marker
                        key={`tow-truck-${truck.id}`}
                        longitude={truck.lon}
                        latitude={truck.lat}
                        anchor="center"
                    >
                        <div className="tow-truck-marker" style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: truck.status === 'RETURNING' ? '#475569' : '#f97316',
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '18px',
                            boxShadow: truck.status === 'RETURNING'
                                ? '0 0 12px rgba(71,85,105,0.6)'
                                : '0 0 16px #f97316, 0 0 32px rgba(249,115,22,0.3)',
                            border: '2px solid #fff',
                            zIndex: 300,
                            transition: 'background-color 0.3s'
                        }}>
                            🚛
                        </div>
                    </Marker>
                ))}

                {/* Static Surveillance Cameras Overlay */}
                {effectiveShowCameras && Object.entries(NETWORK_NODES).map(([id, node]) => (
                    <Marker
                        key={`camera-node-${id}`}
                        longitude={node.lon}
                        latitude={node.lat}
                        anchor="center"
                    >
                        <div style={{
                            width: '18px',
                            height: '18px',
                            backgroundColor: 'rgba(30, 98, 208, 0.25)',
                            border: '1.5px solid rgba(30, 98, 208, 0.7)',
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '9px',
                            color: 'var(--fk-blue)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            zIndex: 99
                        }}
                        title={`BTP Surveillance Cam ${id.toUpperCase()}`}
                        >
                            📹
                        </div>
                    </Marker>
                ))}

                {/* Hotspot markers */}
                {!showTrafficOnly && !showDispatchOnly && hotspots.map((h) => {
                    const isSelected = selectedId === h.cluster_id;
                    const isHovered = hoverInfo?.cluster_id === h.cluster_id;

                    const stemHeight = Math.max(24, Math.min(120, h.impact_score * 35));
                    const pinColor = getPinColor(h.cluster_type);
                    const isTowed = interventions.get(h.cluster_id) === 'TOW';

                    return (
                        <Marker
                            key={h.cluster_id}
                            longitude={h.centroid_lon}
                            latitude={h.centroid_lat}
                            anchor="bottom"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                onSelect(isSelected ? null : h.cluster_id);
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transform: isHovered || isSelected ? 'scale(1.15)' : 'scale(1.0)',
                                    transition: 'transform 0.15s ease-out',
                                    zIndex: isSelected ? 100 : isHovered ? 90 : 10
                                }}
                                onMouseEnter={(e) => {
                                    setHoverInfo(h);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                    if (parentRect) {
                                        setHoverCoords({
                                            x: rect.left - parentRect.left + rect.width / 2,
                                            y: rect.top - parentRect.top
                                        });
                                    }
                                }}
                                onMouseLeave={() => {
                                    setHoverInfo(null);
                                    setHoverCoords(null);
                                }}
                            >
                                {/* Floating Badge containing the vehicle icon */}
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    backgroundColor: isSelected ? '#E3F2FD' : isTowed ? '#fff7ed' : 'var(--fk-white)',
                                    border: `3px solid ${isTowed ? '#f97316' : isSelected ? 'var(--fk-blue)' : pinColor}`,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxShadow: isTowed
                                        ? '0 0 14px #f97316, 0 4px 10px rgba(0,0,0,0.3)'
                                        : isSelected
                                        ? '0 0 14px var(--fk-blue), 0 4px 10px rgba(0,0,0,0.3)'
                                        : '0 4px 8px rgba(0,0,0,0.25)',
                                    fontSize: '20px',
                                    position: 'relative',
                                    zIndex: 2,
                                    transition: 'background-color 0.15s'
                                }}>
                                    {getVehicleEmoji(h.dominant_vehicle)}

                                    {/* Count badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        backgroundColor: isTowed ? '#f97316' : pinColor,
                                        color: '#fff',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        borderRadius: '8px',
                                        padding: '1px 5px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        border: '1.5px solid #fff'
                                    }}>
                                        {h.violation_count}
                                    </div>

                                    {/* Deployed intervention icon overlay (bottom-left) */}
                                    {interventions.get(h.cluster_id) && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-6px',
                                            left: '-6px',
                                            backgroundColor: 'var(--fk-white)',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            fontSize: '11px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                                            border: `1.5px solid ${isTowed ? '#f97316' : 'var(--fk-blue)'}`,
                                            zIndex: 5
                                        }}>
                                            {interventions.get(h.cluster_id) === 'CAMERA' ? '📷' : interventions.get(h.cluster_id) === 'TOW' ? '🚛' : '🚓'}
                                        </div>
                                    )}
                                </div>

                                {/* Vertical 3D Pin Stem */}
                                <div style={{
                                    width: '4px',
                                    height: `${stemHeight}px`,
                                    background: `linear-gradient(to top, ${isTowed ? '#f97316' : pinColor}, rgba(255,255,255,0.15))`,
                                    boxShadow: `0 0 4px ${isTowed ? '#f97316' : pinColor}`,
                                    position: 'relative',
                                    marginTop: '-1px',
                                    zIndex: 1
                                }} />

                                {/* 3D Base Shadow on map floor */}
                                <div style={{
                                    width: '12px',
                                    height: '5px',
                                    backgroundColor: 'rgba(0,0,0,0.35)',
                                    borderRadius: '50%',
                                    filter: 'blur(1px)',
                                    marginTop: '-2px',
                                    zIndex: 0
                                }} />
                            </div>
                        </Marker>
                    );
                })}

                {/* Road name labels at congested midpoints — Google Maps style */}
                {showTrafficOnly && NETWORK_EDGES.map(e => {
                    const level = congestionLevels[e.id] || 'GREEN';
                    if (level !== 'RED' && level !== 'AMBER') return null;

                    const fromNode = NETWORK_NODES[e.from];
                    const toNode = NETWORK_NODES[e.to];
                    const lat = (fromNode.lat + toNode.lat) / 2;
                    const lon = (fromNode.lon + toNode.lon) / 2;
                    const isSelected = selectedEdgeId === e.id;
                    const roadName = EDGE_ROAD_NAMES[e.id] || e.id;
                    const levelColor = level === 'RED' ? '#ef4444' : '#f59e0b';

                    return (
                        <Marker
                            key={`label-${e.id}`}
                            longitude={lon}
                            latitude={lat}
                            anchor="center"
                            onClick={(event) => {
                                event.originalEvent.stopPropagation();
                                onSelectEdge?.(isSelected ? null : e.id);
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'transform 0.15s',
                                    zIndex: isSelected ? 500 : level === 'RED' ? 200 : 150,
                                }}
                            >
                                {/* Road name pill */}
                                <div style={{
                                    backgroundColor: 'rgba(10,10,14,0.9)',
                                    backdropFilter: 'blur(8px)',
                                    border: `1.5px solid ${levelColor}`,
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: `0 0 12px ${levelColor}40`,
                                    whiteSpace: 'nowrap',
                                }}>
                                    <div style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        backgroundColor: levelColor,
                                        boxShadow: `0 0 4px ${levelColor}`,
                                        animation: level === 'RED' ? 'traffic-blink 1.5s ease-in-out infinite' : 'none',
                                    }} />
                                    <span style={{
                                        fontSize: '9px', fontWeight: 700,
                                        color: 'rgba(255,255,255,0.9)',
                                        letterSpacing: '0.2px',
                                    }}>
                                        {roadName}
                                    </span>
                                    <span style={{
                                        fontSize: '8px', fontWeight: 700,
                                        color: levelColor,
                                    }}>
                                        {level === 'RED' ? '⬤' : '●'}
                                    </span>
                                </div>
                            </div>
                        </Marker>
                    );
                })}
            </Map>

            {/* Tooltip Overlay */}
            {hoverInfo && hoverCoords && (
                <div
                    className="map-tooltip"
                    style={{
                        position: 'absolute',
                        left: hoverCoords.x + 15,
                        top: hoverCoords.y - 120,
                        zIndex: 1000,
                        pointerEvents: 'none'
                    }}
                >
                    <h4>{hoverInfo.junction_name === 'Midblock' ? hoverInfo.police_station + ' Midblock' : hoverInfo.junction_name}</h4>
                    <div className="tooltip-row">
                        <span>Congestion Score:</span>
                        <span className="mono" style={{ fontWeight: 'bold', color: 'var(--fk-blue)' }}>
                            {hoverInfo.impact_score.toFixed(3)}
                        </span>
                    </div>
                    <div className="tooltip-row">
                        <span>Total Offenses:</span>
                        <span className="mono" style={{ fontWeight: 'bold', color: 'var(--fk-text)' }}>
                            {hoverInfo.violation_count}
                        </span>
                    </div>
                    <div className="tooltip-row">
                        <span>Dominant Vehicle:</span>
                        <span style={{ fontWeight: 'bold' }}>{hoverInfo.dominant_vehicle}</span>
                    </div>
                    <div className="tooltip-row">
                        <span>Enforcement Class:</span>
                        <span className="type-badge" style={{
                            backgroundColor: hoverInfo.cluster_type === 'Junction Blocking' ? 'var(--signal-amber-dim)' : '#FFEBEE',
                            color: hoverInfo.cluster_type === 'Junction Blocking' ? 'var(--signal-amber)' : 'var(--enforcement-red)',
                            border: `1px solid ${hoverInfo.cluster_type === 'Junction Blocking' ? 'var(--signal-amber)' : 'var(--enforcement-red)'}30`
                        }}>{hoverInfo.cluster_type}</span>
                    </div>
                </div>
            )}

            {/* Live Traffic Legend — hidden in dispatch mode */}
            {!showDispatchOnly && <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                bottom: 'auto',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '6px 10px',
                borderRadius: '6px',
                color: 'white',
                fontSize: '9.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 10
            }}>
                <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2px', marginBottom: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🚦</span> LIVE TRAFFIC INDEX
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '3px', backgroundColor: '#10b981', borderRadius: '1px' }} />
                    <span>Clear (1.0x)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '3px', backgroundColor: '#f59e0b', borderRadius: '1px' }} />
                    <span>Moderate (1.8x)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '3px', backgroundColor: '#ef4444', borderRadius: '1px' }} />
                    <span>Gridlock (3.5x)</span>
                </div>
            </div>}

            {/* GIS Layer Manager HUD */}
            {!showTrafficOnly && !showDispatchOnly && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: isSidebarCollapsed ? '20px' : '440px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10,
                    width: '180px',
                    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px' }}>
                        <span>🗺️</span> GIS LAYER MANAGER
                    </div>
                    
                    {/* Basemap Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '9.5px', fontWeight: 'bold', textTransform: 'uppercase' }}>Basemap Layer</span>
                        <select
                            value={mapStyleType}
                            onChange={(e) => {
                                setMapStyleType(e.target.value as any);
                                setMapmyindiaError(false);
                            }}
                            style={{
                                padding: '4px 6px',
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '10.5px',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="LIGHT">Surveillance Light</option>
                            <option value="DARK">Tactical Dark</option>
                            <option value="SATELLITE">Satellite Terrain</option>
                            <option value="MAPMYINDIA">MapmyIndia (Mappls)</option>
                        </select>
                        {mapmyindiaError && (
                            <div style={{ color: '#f87171', fontSize: '9px', marginTop: '4px', fontWeight: 'bold', lineHeight: '1.2' }}>
                                ⚠️ MapmyIndia styling failed (CORS / restriction). Reverted to Tactical Dark.
                            </div>
                        )}
                    </div>

                    {/* Layer Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '6px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '9.5px', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Overlays</span>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showTraffic} onChange={(e) => setShowTraffic(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--fk-blue)' }} />
                            <span>Traffic Grid Load</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showDepots} onChange={(e) => setShowDepots(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--fk-blue)' }} />
                            <span>BTP Fleet Depots</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--fk-blue)' }} />
                            <span>Tow Transit Routes</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showCameras} onChange={(e) => setShowCameras(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--fk-blue)' }} />
                            <span>Surveillance Cameras</span>
                        </label>
                    </div>
                </div>
            )}

            {/* Severity Filter HUD */}
            {!showTrafficOnly && !showDispatchOnly && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: isSidebarCollapsed ? '20px' : '440px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10,
                    width: '180px',
                    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px' }}>
                        <span>🔍</span> SEVERITY FILTER
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Min Score:</span>
                        <span className="mono" style={{ fontWeight: 'bold', color: 'var(--fk-blue)' }}>
                            {minImpactScore.toFixed(2)}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="0.8" 
                        step="0.05"
                        value={minImpactScore}
                        onChange={(e) => onMinImpactScoreChange(parseFloat(e.target.value))}
                        style={{ 
                            width: '100%', 
                            cursor: 'pointer',
                            accentColor: 'var(--fk-blue)'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                        <span>All</span>
                        <span>Critical</span>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes tow-pulse {
                    0%, 100% { box-shadow: 0 0 12px #f97316, 0 0 24px #f9731640; }
                    50% { box-shadow: 0 0 24px #f97316, 0 0 48px #f9731660; }
                }
                @keyframes traffic-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .tow-truck-marker {
                    animation: tow-pulse 1.5s ease-in-out infinite;
                }
                .tow-depot-pin {
                    animation: tow-pulse 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

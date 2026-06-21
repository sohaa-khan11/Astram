import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { Hotspot, Summary, TriageRecord } from './lib/api';
import { useRoute, navigate } from './router';
import { Sidebar } from './components/Sidebar';
import { PresentMapPage } from './pages/PresentMapPage';
import { HistoricalMapPage } from './pages/HistoricalMapPage';
import { DispatchTrackingPage } from './pages/DispatchTrackingPage';
import { TrafficDispatchPage } from './pages/TrafficDispatchPage';
import { HotspotPrioritiesPage } from './pages/HotspotPrioritiesPage';
import { TowFleetPage } from './pages/TowFleetPage';
import { TriagePage } from './pages/TriagePage';
import { SandboxPage } from './pages/SandboxPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import './tokens.css';

// 4 Divisional BTP Depots
export const DEPOTS = {
    CENTRAL: { name: 'BTP HQ Depot', lat: 12.9716, lon: 77.5946, color: '#f97316' },
    INDIRANAGAR: { name: 'Indiranagar Depot', lat: 12.9784, lon: 77.6408, color: '#06b6d4' },
    KORAMANGALA: { name: 'Koramangala Depot', lat: 12.9348, lon: 77.6189, color: '#8b5cf6' },
    RICHMOND: { name: 'Richmond Town Depot', lat: 12.9600, lon: 77.6010, color: '#ec4899' }
};

export interface TowTruck {
    id: string; // "BTP-TOW-01" to "BTP-TOW-08"
    licensePlate: string; // e.g. "KA-03-G-1021"
    status: 'AVAILABLE' | 'EN_ROUTE' | 'ON_SITE' | 'RETURNING' | 'AT_DEPOT';
    assignedHotspotId: number | null;
    assignedHotspotName: string | null;
    assignedEdgeId?: string | null;
    progress: number; // 0 to 1
    route: [number, number][]; // coordinates [[lon, lat], ...]
    pickupTicks?: number; // ticks spent on site loading
    depotName: string;
    depotLocation: { lat: number; lon: number };
    recalled?: boolean;
}

const INITIAL_TOW_TRUCKS: TowTruck[] = [
    { id: 'BTP-TOW-01', licensePlate: 'KA-03-G-1021', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.CENTRAL.name, depotLocation: DEPOTS.CENTRAL },
    { id: 'BTP-TOW-02', licensePlate: 'KA-03-G-1022', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.CENTRAL.name, depotLocation: DEPOTS.CENTRAL },
    { id: 'BTP-TOW-03', licensePlate: 'KA-03-G-1023', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.INDIRANAGAR.name, depotLocation: DEPOTS.INDIRANAGAR },
    { id: 'BTP-TOW-04', licensePlate: 'KA-03-G-1024', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.INDIRANAGAR.name, depotLocation: DEPOTS.INDIRANAGAR },
    { id: 'BTP-TOW-05', licensePlate: 'KA-03-M-4412', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.KORAMANGALA.name, depotLocation: DEPOTS.KORAMANGALA },
    { id: 'BTP-TOW-06', licensePlate: 'KA-03-M-4413', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.KORAMANGALA.name, depotLocation: DEPOTS.KORAMANGALA },
    { id: 'BTP-TOW-07', licensePlate: 'KA-02-H-8801', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.RICHMOND.name, depotLocation: DEPOTS.RICHMOND },
    { id: 'BTP-TOW-08', licensePlate: 'KA-02-H-8802', status: 'AVAILABLE', assignedHotspotId: null, assignedHotspotName: null, assignedEdgeId: null, progress: 0, route: [], depotName: DEPOTS.RICHMOND.name, depotLocation: DEPOTS.RICHMOND },
];

export interface NetworkNode {
    id: string;
    name: string;
    lat: number;
    lon: number;
}

export interface NetworkEdge {
    id: string;
    from: string;
    to: string;
    /** Intermediate GPS waypoints [lon, lat] so the road curves realistically */
    waypoints?: [number, number][];
}

// 16 real Bengaluru major intersections
export const NETWORK_NODES: Record<string, NetworkNode> = {
    n1:  { id: 'n1',  name: 'Hebbal Junction',       lat: 13.0358, lon: 77.5970 },
    n2:  { id: 'n2',  name: 'Mekhri Circle',          lat: 13.0070, lon: 77.5830 },
    n3:  { id: 'n3',  name: 'Yeshwanthpur Circle',    lat: 13.0220, lon: 77.5510 },
    n4:  { id: 'n4',  name: 'Rajajinagar',             lat: 12.9920, lon: 77.5540 },
    n5:  { id: 'n5',  name: 'Majestic / KR Circle',   lat: 12.9767, lon: 77.5713 },
    n6:  { id: 'n6',  name: 'Shivajinagar',            lat: 12.9857, lon: 77.6050 },
    n7:  { id: 'n7',  name: 'Cubbon Park',             lat: 12.9763, lon: 77.5929 },
    n8:  { id: 'n8',  name: 'MG Road / Trinity',       lat: 12.9750, lon: 77.6190 },
    n9:  { id: 'n9',  name: 'Ulsoor',                  lat: 12.9820, lon: 77.6210 },
    n10: { id: 'n10', name: 'Indiranagar 100ft Road',  lat: 12.9784, lon: 77.6408 },
    n11: { id: 'n11', name: 'Koramangala',              lat: 12.9352, lon: 77.6245 },
    n12: { id: 'n12', name: 'Silk Board Junction',     lat: 12.9172, lon: 77.6227 },
    n13: { id: 'n13', name: 'Jayanagar 4th Block',     lat: 12.9256, lon: 77.5833 },
    n14: { id: 'n14', name: 'Basavanagudi',             lat: 12.9430, lon: 77.5730 },
    n15: { id: 'n15', name: 'BTM Layout',               lat: 12.9166, lon: 77.6101 },
    n16: { id: 'n16', name: 'KR Puram',                 lat: 13.0070, lon: 77.6960 }
};

// 24 edges tracing real Bengaluru road corridors with GPS waypoints
export const NETWORK_EDGES: NetworkEdge[] = [
    // ── Bellary Road (NH-44) ──
    { id: 'e1', from: 'n1', to: 'n2', waypoints: [
        [77.5950, 13.0280], [77.5900, 13.0190], [77.5860, 13.0120]
    ]},
    // ── Palace Road / Sankey Road ──
    { id: 'e2', from: 'n2', to: 'n6', waypoints: [
        [77.5870, 13.0010], [77.5920, 12.9950], [77.5980, 12.9900]
    ]},
    // ── Tumkur Road ──
    { id: 'e3', from: 'n3', to: 'n4', waypoints: [
        [77.5510, 13.0140], [77.5520, 13.0060]
    ]},
    // ── Rajajinagar Main Road ──
    { id: 'e4', from: 'n4', to: 'n5', waypoints: [
        [77.5580, 12.9870], [77.5640, 12.9810]
    ]},
    // ── JC Road / Infantry Road ──
    { id: 'e5', from: 'n5', to: 'n6', waypoints: [
        [77.5780, 12.9790], [77.5870, 12.9810], [77.5950, 12.9830]
    ]},
    // ── Cubbon Road ──
    { id: 'e6', from: 'n6', to: 'n7', waypoints: [
        [77.6010, 12.9830], [77.5970, 12.9800]
    ]},
    // ── Kasturba Road ──
    { id: 'e7', from: 'n7', to: 'n8', waypoints: [
        [77.5980, 12.9760], [77.6050, 12.9755], [77.6120, 12.9750]
    ]},
    // ── MG Road (towards Ulsoor) ──
    { id: 'e8', from: 'n8', to: 'n9', waypoints: [
        [77.6200, 12.9780]
    ]},
    // ── Old Madras Road start ──
    { id: 'e9', from: 'n9', to: 'n10', waypoints: [
        [77.6270, 12.9800], [77.6340, 12.9790]
    ]},
    // ── Hosur Road / Intermediate Ring Road ──
    { id: 'e10', from: 'n8', to: 'n11', waypoints: [
        [77.6200, 12.9680], [77.6210, 12.9580], [77.6230, 12.9470]
    ]},
    // ── Hosur Road (Koramangala → Silk Board) ──
    { id: 'e11', from: 'n11', to: 'n12', waypoints: [
        [77.6240, 12.9290], [77.6235, 12.9230]
    ]},
    // ── Hosur Road / Bannerghatta connector ──
    { id: 'e12', from: 'n12', to: 'n15', waypoints: [
        [77.6190, 12.9170], [77.6140, 12.9168]
    ]},
    // ── Bannerghatta Road (BTM → Jayanagar) ──
    { id: 'e13', from: 'n15', to: 'n13', waypoints: [
        [77.6050, 12.9180], [77.5960, 12.9200], [77.5890, 12.9230]
    ]},
    // ── South End Road ──
    { id: 'e14', from: 'n13', to: 'n14', waypoints: [
        [77.5830, 12.9310], [77.5780, 12.9370]
    ]},
    // ── KR Road ──
    { id: 'e15', from: 'n14', to: 'n5', waypoints: [
        [77.5720, 12.9520], [77.5710, 12.9600], [77.5713, 12.9680]
    ]},
    // ── Chord Road (Mekhri → Rajajinagar) ──
    { id: 'e16', from: 'n2', to: 'n4', waypoints: [
        [77.5770, 13.0020], [77.5680, 12.9980], [77.5600, 12.9960]
    ]},
    // ── Outer Ring Road North (Hebbal → KR Puram) ──
    { id: 'e17', from: 'n1', to: 'n16', waypoints: [
        [77.6100, 13.0380], [77.6300, 13.0350], [77.6520, 13.0280],
        [77.6700, 13.0180], [77.6850, 13.0110]
    ]},
    // ── Old Madras Road (KR Puram → Indiranagar) ──
    { id: 'e18', from: 'n16', to: 'n10', waypoints: [
        [77.6880, 12.9980], [77.6750, 12.9900], [77.6600, 12.9830], [77.6500, 12.9800]
    ]},
    // ── Inner Ring Road (Indiranagar → Koramangala) ──
    { id: 'e19', from: 'n10', to: 'n11', waypoints: [
        [77.6400, 12.9700], [77.6380, 12.9580], [77.6320, 12.9450]
    ]},
    // ── Nrupathunga Road ──
    { id: 'e20', from: 'n7', to: 'n5', waypoints: [
        [77.5890, 12.9765], [77.5810, 12.9766]
    ]},
    // ── Shivajinagar–Ulsoor Road ──
    { id: 'e21', from: 'n6', to: 'n9', waypoints: [
        [77.6090, 12.9850], [77.6140, 12.9840], [77.6180, 12.9830]
    ]},
    // ── BEL Road / Tumkur Road (Yeshwanthpur → Hebbal) ──
    { id: 'e22', from: 'n3', to: 'n1', waypoints: [
        [77.5580, 13.0280], [77.5680, 13.0340], [77.5800, 13.0370]
    ]},
    // ── Hosur Road connector (Jayanagar → Koramangala) ──
    { id: 'e23', from: 'n13', to: 'n11', waypoints: [
        [77.5900, 12.9260], [77.5990, 12.9280], [77.6100, 12.9310]
    ]},
    // ── Lalbagh Road (Basavanagudi → Cubbon) ──
    { id: 'e24', from: 'n14', to: 'n7', waypoints: [
        [77.5750, 12.9500], [77.5790, 12.9570], [77.5830, 12.9650],
        [77.5870, 12.9710], [77.5900, 12.9740]
    ]}
];

export const EDGE_ROAD_NAMES: Record<string, string> = {
    e1: 'Bellary Road (NH-44)',
    e2: 'Palace Road / Sankey Road',
    e3: 'Tumkur Road',
    e4: 'Rajajinagar Main Road',
    e5: 'Infantry Road',
    e6: 'Cubbon Road',
    e7: 'Kasturba Road',
    e8: 'MG Road',
    e9: 'Old Madras Road',
    e10: 'Hosur Road',
    e11: 'Hosur Road (South)',
    e12: 'Silk Board – BTM Connector',
    e13: 'Bannerghatta Road',
    e14: 'South End Road',
    e15: 'KR Road',
    e16: 'Chord Road',
    e17: 'Outer Ring Road (North)',
    e18: 'Old Madras Road (East)',
    e19: 'Inner Ring Road',
    e20: 'Nrupathunga Road',
    e21: 'Shivajinagar–Ulsoor Road',
    e22: 'BEL Road',
    e23: 'Hosur Road Connector',
    e24: 'Lalbagh Road'
};

export const getEdgeMidpoint = (edgeId: string): { lat: number; lon: number } => {
    const edge = NETWORK_EDGES.find(e => e.id === edgeId);
    if (!edge) return { lat: 12.9716, lon: 77.5946 };

    // If the edge has waypoints, use the middle waypoint
    if (edge.waypoints && edge.waypoints.length > 0) {
        const midIdx = Math.floor(edge.waypoints.length / 2);
        return { lat: edge.waypoints[midIdx][1], lon: edge.waypoints[midIdx][0] };
    }

    const fromNode = NETWORK_NODES[edge.from];
    const toNode = NETWORK_NODES[edge.to];
    return {
        lat: (fromNode.lat + toNode.lat) / 2,
        lon: (fromNode.lon + toNode.lon) / 2
    };
};

export const getEdgeWeight = (status: 'GREEN' | 'AMBER' | 'RED'): number => {
    if (status === 'RED') return 3.5;
    if (status === 'AMBER') return 1.8;
    return 1.0;
};

// Dijkstra Shortest Path Finder
export const findShortestPath = (
    startCoord: { lat: number; lon: number },
    endCoord: { lat: number; lon: number },
    congestion: Record<string, 'GREEN' | 'AMBER' | 'RED'>
): [number, number][] => {
    // Find nearest network node to startCoord
    let startNodeId = 'n6';
    let minStartDist = Infinity;
    for (const [id, node] of Object.entries(NETWORK_NODES)) {
        const dist = Math.hypot(node.lat - startCoord.lat, node.lon - startCoord.lon);
        if (dist < minStartDist) {
            minStartDist = dist;
            startNodeId = id;
        }
    }

    // Find nearest network node to endCoord
    let endNodeId = 'n7';
    let minEndDist = Infinity;
    for (const [id, node] of Object.entries(NETWORK_NODES)) {
        const dist = Math.hypot(node.lat - endCoord.lat, node.lon - endCoord.lon);
        if (dist < minEndDist) {
            minEndDist = dist;
            endNodeId = id;
        }
    }

    if (startNodeId === endNodeId) {
        return [[startCoord.lon, startCoord.lat], [endCoord.lon, endCoord.lat]];
    }

    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const queue = new Set<string>();

    for (const id of Object.keys(NETWORK_NODES)) {
        distances[id] = Infinity;
        previous[id] = null;
        queue.add(id);
    }
    distances[startNodeId] = 0;

    while (queue.size > 0) {
        let u: string | null = null;
        let minDist = Infinity;
        for (const id of queue) {
            if (distances[id] < minDist) {
                minDist = distances[id];
                u = id;
            }
        }

        if (u === null || u === endNodeId) break;
        queue.delete(u);

        const nodeU = NETWORK_NODES[u];
        const edges = NETWORK_EDGES.filter(e => e.from === u || e.to === u);

        for (const edge of edges) {
            const neighborId = edge.from === u ? edge.to : edge.from;
            if (!queue.has(neighborId)) continue;

            const nodeNeigh = NETWORK_NODES[neighborId];
            const baseDist = Math.hypot(nodeU.lat - nodeNeigh.lat, nodeU.lon - nodeNeigh.lon);
            const edgeWeight = getEdgeWeight(congestion[edge.id] || 'GREEN');
            const alt = distances[u] + (baseDist * edgeWeight);

            if (alt < distances[neighborId]) {
                distances[neighborId] = alt;
                previous[neighborId] = u;
            }
        }
    }

    const pathNodes: string[] = [];
    let curr: string | null = endNodeId;
    while (curr !== null) {
        pathNodes.unshift(curr);
        curr = previous[curr];
    }

    if (pathNodes.length === 0 || pathNodes[0] !== startNodeId) {
        return [[startCoord.lon, startCoord.lat], [endCoord.lon, endCoord.lat]];
    }

    const routeCoords: [number, number][] = [];
    routeCoords.push([startCoord.lon, startCoord.lat]);
    for (const nodeId of pathNodes) {
        const node = NETWORK_NODES[nodeId];
        routeCoords.push([node.lon, node.lat]);
    }
    routeCoords.push([endCoord.lon, endCoord.lat]);

    return routeCoords;
};

function App() {
    const { route, params } = useRoute();
    const [hotspots, setHotspots] = useState<Hotspot[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);

    const [interventions, setInterventions] = useState<Map<number, 'CAMERA' | 'PATROL' | 'TOW'>>(new Map());
    const [towTrucks, setTowTrucks] = useState<TowTruck[]>(INITIAL_TOW_TRUCKS);
    const [resolvedHotspots, setResolvedHotspots] = useState<Set<number>>(new Set());

    // Lifted Triage & Dispute States
    const [triageQueue, setTriageQueue] = useState<TriageRecord[]>([]);
    const [disputeStatuses, setDisputeStatuses] = useState<Record<number, 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'>>({});

    // Collapsible Layout & Density Filter States
    const [minImpactScore] = useState(0.0);

    // Live Congestion State (updated every 15s)
    const [congestionLevels, setCongestionLevels] = useState<Record<string, 'GREEN' | 'AMBER' | 'RED'>>({
        e1: 'GREEN', e2: 'GREEN', e3: 'AMBER',
        e4: 'GREEN', e5: 'RED', e6: 'GREEN',
        e7: 'AMBER', e8: 'GREEN', e9: 'GREEN',
        e10: 'GREEN', e11: 'GREEN', e12: 'RED',
        e13: 'GREEN', e14: 'AMBER', e15: 'GREEN',
        e16: 'GREEN', e17: 'GREEN', e18: 'GREEN',
        e19: 'RED', e20: 'GREEN', e21: 'GREEN',
        e22: 'GREEN', e23: 'AMBER', e24: 'GREEN'
    });

    useEffect(() => {
        api.getSummary().then(setSummary);
        api.getHotspots().then(setHotspots);
        api.getTriageQueue().then(setTriageQueue);
    }, []);

    // Traffic congestion updates timer (15 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setCongestionLevels(prev => {
                const next = { ...prev };
                const edgeIds = Object.keys(prev);
                const count = 3 + Math.floor(Math.random() * 2);
                
                // Keep track of edges currently targeted by tow trucks
                const targetedEdges = new Set(
                    towTrucks
                        .filter(t => t.status !== 'AVAILABLE' && t.assignedEdgeId)
                        .map(t => t.assignedEdgeId)
                );

                for (let i = 0; i < count; i++) {
                    const randomEdge = edgeIds[Math.floor(Math.random() * edgeIds.length)];
                    if (targetedEdges.has(randomEdge)) continue; // skip updating congested edges being cleared!
                    
                    const choices: ('GREEN' | 'AMBER' | 'RED')[] = ['GREEN', 'AMBER', 'RED'];
                    next[randomEdge] = choices[Math.floor(Math.random() * choices.length)];
                }
                return next;
            });
        }, 15000);
        return () => clearInterval(interval);
    }, [towTrucks]);

    // Animation interval for BTP tow trucks transit progress
    useEffect(() => {
        const interval = setInterval(() => {
            setTowTrucks(prevTrucks => {
                let hasChanges = false;
                const nextTrucks = prevTrucks.map(truck => {
                    if (truck.status === 'EN_ROUTE') {
                        hasChanges = true;
                        const nextProgress = Math.min(truck.progress + 0.003, 1.0);
                        const nextStatus = (nextProgress === 1.0 ? 'ON_SITE' : 'EN_ROUTE') as TowTruck['status'];
                        return {
                            ...truck,
                            progress: nextProgress,
                            status: nextStatus
                        };
                    } else if (truck.status === 'ON_SITE') {
                        hasChanges = true;
                        const currentTicks = truck.pickupTicks ?? 0;
                        
                        // If truck just arrived on site at a congested road segment, clear the congestion immediately!
                        if (currentTicks === 0 && truck.assignedEdgeId) {
                            setCongestionLevels(prev => ({
                                ...prev,
                                [truck.assignedEdgeId!]: 'GREEN'
                            }));
                        }

                        if (currentTicks >= 30) { // 30 ticks of 200ms = 6.0 seconds pickup
                            return {
                                ...truck,
                                status: 'RETURNING' as TowTruck['status'],
                                progress: 1.0,
                                pickupTicks: undefined
                            };
                        } else {
                            return {
                                ...truck,
                                pickupTicks: currentTicks + 1
                            };
                        }
                    } else if (truck.status === 'RETURNING') {
                        hasChanges = true;
                        const nextProgress = Math.max(truck.progress - 0.003, 0.0);
                        let nextStatus: TowTruck['status'] = 'RETURNING';
                        let assignedHotspotId = truck.assignedHotspotId;
                        let assignedHotspotName = truck.assignedHotspotName;
                        let assignedEdgeId = truck.assignedEdgeId;
                        let route = truck.route;

                        if (nextProgress === 0.0) {
                            // Check if this hotspot was paid / resolved OR if the truck was recalled OR if it was dispatched to an edge
                            const isResolved = truck.assignedHotspotId !== null && resolvedHotspots.has(truck.assignedHotspotId);
                            if (isResolved || truck.recalled || assignedEdgeId) {
                                nextStatus = 'AVAILABLE';
                                assignedHotspotId = null;
                                assignedHotspotName = null;
                                assignedEdgeId = null;
                                route = [];
                            } else {
                                nextStatus = 'AT_DEPOT'; // At depot, unpaid
                            }
                        }

                        return {
                            ...truck,
                            progress: nextProgress,
                            status: nextStatus,
                            assignedHotspotId,
                            assignedHotspotName,
                            assignedEdgeId,
                            route,
                            recalled: nextProgress === 0.0 ? undefined : truck.recalled
                        };
                    }
                    return truck;
                });
                return hasChanges ? nextTrucks : prevTrucks;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [resolvedHotspots]);



    const handleDeployIntervention = (clusterId: number, type: 'CAMERA' | 'PATROL') => {
        setInterventions(prev => {
            const next = new Map(prev);
            if (next.get(clusterId) === type) {
                next.delete(clusterId);
            } else {
                next.set(clusterId, type);
            }
            return next;
        });
    };

    const handleDispatchTowTruck = (clusterId: number, truckId: string) => {
        const hotspot = hotspots.find(h => h.cluster_id === clusterId);
        if (!hotspot) return;

        setTowTrucks(prev => prev.map(truck => {
            if (truck.id === truckId) {
                const route = findShortestPath(
                    truck.depotLocation, 
                    { lat: hotspot.centroid_lat, lon: hotspot.centroid_lon }, 
                    congestionLevels
                );
                return {
                    ...truck,
                    status: 'EN_ROUTE',
                    assignedHotspotId: clusterId,
                    assignedHotspotName: hotspot.junction_name !== 'No Junction' && hotspot.junction_name !== 'Midblock' 
                        ? hotspot.junction_name 
                        : `${hotspot.police_station} area`,
                    progress: 0,
                    route: route
                };
            }
            return truck;
        }));

        setInterventions(prev => {
            const next = new Map(prev);
            next.set(clusterId, 'TOW');
            return next;
        });

        // Remove from resolved if we redeploy
        setResolvedHotspots(prev => {
            const next = new Set(prev);
            next.delete(clusterId);
            return next;
        });

        // Redirect to Dispatch Tracking
        navigate('dispatch-tracking', { truckId });
    };

    const handleDispatchTowTruckToEdge = (edgeId: string, truckId: string) => {
        const midpoint = getEdgeMidpoint(edgeId);
        const roadName = EDGE_ROAD_NAMES[edgeId] || `Segment ${edgeId}`;

        setTowTrucks(prev => prev.map(truck => {
            if (truck.id === truckId) {
                const route = findShortestPath(
                    truck.depotLocation, 
                    midpoint, 
                    congestionLevels
                );
                return {
                    ...truck,
                    status: 'EN_ROUTE',
                    assignedHotspotId: null,
                    assignedEdgeId: edgeId,
                    assignedHotspotName: roadName,
                    progress: 0,
                    route: route
                };
            }
            return truck;
        }));

        // Redirect to Traffic Dispatch Tracking
        navigate('traffic-dispatch', { truckId });
    };

    // Citizen dispute submission handler
    const handleDisputeViolation = (
        clusterId: number, 
        reason: string, 
        explanation: string, 
        attachmentName: string
    ) => {
        const hotspot = hotspots.find(h => h.cluster_id === clusterId);
        const truck = towTrucks.find(t => t.assignedHotspotId === clusterId);
        if (!hotspot || !truck) return;

        setDisputeStatuses(prev => ({
            ...prev,
            [clusterId]: 'UNDER_REVIEW'
        }));

        // Inject dispute citation into triage queue
        const newRecord: TriageRecord = {
            id: `disp-${clusterId}-${Date.now()}`,
            created_datetime: new Date().toISOString(),
            location: hotspot.junction_name !== 'No Junction' ? hotspot.junction_name : `${hotspot.police_station} area`,
            vehicle_type: hotspot.dominant_vehicle || 'CAR',
            violation_type: hotspot.dominant_violation || 'ILLEGAL PARKING',
            actual_status: 'disputed',
            confidence_score: 0.98,
            ai_recommendation: 'MANUAL_REVIEW'
        };

        const extendedRecord = {
            ...newRecord,
            isDisputed: true,
            disputeReason: reason,
            disputeExplanation: explanation,
            disputeAttachment: attachmentName,
            clusterId: clusterId
        } as any;

        setTriageQueue(prev => [extendedRecord, ...prev]);
    };

    // Lifted Triage Action Handler (handles standard & disputed items)
    const handleTriageAction = (id: string, action: string) => {
        setTriageQueue(prev => prev.filter(r => r.id !== id));

        if (id.startsWith('disp-')) {
            const parts = id.split('-');
            const clusterId = parseInt(parts[1], 10);

            if (action === 'WAIVE') {
                // Wave the fine!
                setDisputeStatuses(prev => ({
                    ...prev,
                    [clusterId]: 'APPROVED'
                }));
                setResolvedHotspots(prev => {
                    const next = new Set(prev);
                    next.add(clusterId);
                    return next;
                });
                setTowTrucks(prev => prev.map(t => {
                    if (t.assignedHotspotId === clusterId) {
                        return {
                            ...t,
                            status: 'AVAILABLE' as TowTruck['status'],
                            assignedHotspotId: null,
                            assignedHotspotName: null,
                            route: [],
                            progress: 0
                        };
                    }
                    return t;
                }));
            } else if (action === 'REJECT_DISPUTE') {
                // Reject dispute, require payment
                setDisputeStatuses(prev => ({
                    ...prev,
                    [clusterId]: 'REJECTED'
                }));
            }
        }
    };

    const handleRecallTowTruck = (truckId: string) => {
        let assignedHotspotId: number | null = null;
        
        setTowTrucks(prev => {
            const truck = prev.find(t => t.id === truckId);
            if (truck) {
                assignedHotspotId = truck.assignedHotspotId;
            }
            return prev.map(t => {
                if (t.id === truckId) {
                    if (t.status === 'AVAILABLE' || t.status === 'RETURNING') return t;
                    return {
                        ...t,
                        status: 'RETURNING',
                        recalled: true
                    };
                }
                return t;
            });
        });

        if (assignedHotspotId !== null) {
            setInterventions(prev => {
                const next = new Map(prev);
                next.delete(assignedHotspotId!);
                return next;
            });
        }
    };

    // Use live hotspots or filtered replay hotspots, then apply intervention reduction factors
    const rawHotspots = hotspots;

    const displayHotspots = rawHotspots.map(h => {
        if (resolvedHotspots.has(h.cluster_id)) {
            return {
                ...h,
                impact_score: h.impact_score * 0.10 // 90% resolution
            };
        }

        const inter = interventions.get(h.cluster_id);
        let factor = 1.0;
        if (inter === 'CAMERA') factor = 0.65; // 35% reduction
        else if (inter === 'PATROL') factor = 0.40; // 60% reduction
        else if (inter === 'TOW') {
            const assignedTruck = towTrucks.find(t => t.assignedHotspotId === h.cluster_id);
            if (assignedTruck && assignedTruck.status === 'ON_SITE') {
                factor = 0.20; // 80% reduction — vehicle removed
            } else {
                factor = 0.90; // Subtle 10% reduction while in transit
            }
        }
        return {
            ...h,
            impact_score: h.impact_score * factor
        };
    }).filter(h => h.impact_score >= minImpactScore);

    return (
        <div className="app-container">
            <Sidebar active={route} towTrucks={towTrucks} />
            <main className="page-viewport">
                {route === 'present-map' && (
                    <PresentMapPage 
                        towTrucks={towTrucks}
                        congestionLevels={congestionLevels}
                        handleRecallTowTruck={handleRecallTowTruck}
                        handleDispatchTowTruckToEdge={handleDispatchTowTruckToEdge}
                        selectedEdgeId={params.get('selected')}
                    />
                )}
                {route === 'historical-map' && (
                    <HistoricalMapPage 
                        hotspots={hotspots}
                        selectedHotspotId={params.get('selected')}
                    />
                )}
                {route === 'dispatch-tracking' && (
                    <DispatchTrackingPage 
                        towTrucks={towTrucks}
                        hotspots={hotspots}
                        congestionLevels={congestionLevels}
                        disputeStatuses={disputeStatuses}
                        handleRecallTowTruck={handleRecallTowTruck}
                        handleDisputeViolation={handleDisputeViolation}
                        setResolvedHotspots={setResolvedHotspots}
                        setTowTrucks={setTowTrucks}
                        truckId={params.get('truckId')}
                    />
                )}
                {route === 'traffic-dispatch' && (
                    <TrafficDispatchPage 
                        towTrucks={towTrucks}
                        congestionLevels={congestionLevels}
                        handleRecallTowTruck={handleRecallTowTruck}
                        setCongestionLevels={setCongestionLevels}
                        truckId={params.get('truckId')}
                    />
                )}
                {route === 'hotspots' && (
                    <HotspotPrioritiesPage 
                        hotspots={displayHotspots}
                        towTrucks={towTrucks}
                        interventions={interventions}
                        handleDeployIntervention={handleDeployIntervention}
                        handleDispatchTowTruck={handleDispatchTowTruck}
                        handleRecallTowTruck={handleRecallTowTruck}
                        summary={summary}
                        selectedHotspotId={params.get('id')}
                    />
                )}
                {route === 'tow-fleet' && (
                    <TowFleetPage 
                        towTrucks={towTrucks}
                        onRecall={handleRecallTowTruck}
                        highlightTruckId={params.get('highlight')}
                    />
                )}
                {route === 'triage' && (
                    <TriagePage 
                        queue={triageQueue}
                        onAction={handleTriageAction}
                    />
                )}
                {route === 'sandbox' && (
                    <SandboxPage 
                        towTrucks={towTrucks}
                    />
                )}
                {route === 'analytics' && (
                    <AnalyticsPage 
                        hotspots={hotspots}
                        summary={summary}
                    />
                )}
            </main>
        </div>
    );
}

export default App;


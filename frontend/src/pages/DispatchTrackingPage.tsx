import React from 'react';
import { Map3D } from '../components/Map3D';
import { CitizenAlertPhone } from '../components/CitizenAlertPhone';
import { navigate } from '../router';
import type { Hotspot } from '../lib/api';
import type { TowTruck } from '../App';
import { getEdgeMidpoint } from '../App';

interface DispatchTrackingPageProps {
  towTrucks: TowTruck[];
  hotspots: Hotspot[];
  congestionLevels: Record<string, 'GREEN' | 'AMBER' | 'RED'>;
  disputeStatuses: Record<number, 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'>;
  handleRecallTowTruck: (truckId: string) => void;
  handleDisputeViolation: (
    clusterId: number,
    reason: string,
    explanation: string,
    attachmentName: string
  ) => void;
  setResolvedHotspots: React.Dispatch<React.SetStateAction<Set<number>>>;
  setTowTrucks: React.Dispatch<React.SetStateAction<TowTruck[]>>;
  truckId: string | null;
}



export const DispatchTrackingPage: React.FC<DispatchTrackingPageProps> = ({
  towTrucks,
  hotspots,
  congestionLevels,
  disputeStatuses,
  handleRecallTowTruck,
  handleDisputeViolation,
  setResolvedHotspots,
  setTowTrucks,
  truckId
}) => {
  const truck = towTrucks.find(t => t.id === truckId);
  let hotspot = hotspots.find(h => h.cluster_id === truck?.assignedHotspotId);

  if (!hotspot && truck?.assignedEdgeId) {
    const midpoint = getEdgeMidpoint(truck.assignedEdgeId);
    hotspot = {
      cluster_id: -999,
      centroid_lat: midpoint.lat,
      centroid_lon: midpoint.lon,
      violation_count: 1,
      dominant_violation: 'ROAD BLOCKAGE / GRIDLOCK CAUSE',
      dominant_vehicle: 'CAR',
      has_junction_pct: 100,
      mean_severity: 0.9,
      mean_footprint: 12.5,
      repeat_rate: 0.1,
      police_station: 'BTP Traffic Control',
      junction_name: truck.assignedHotspotName || 'Bottleneck Area',
      temporal_entropy: 0.5,
      area_m2: 50,
      cluster_type: 'Traffic Bottleneck',
      density: 1.0,
      impact_score: 0.8,
      score_breakdown: {}
    };
  }




  if (!truck || !hotspot) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        color: 'var(--asphalt-200)',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'var(--asphalt-950)'
      }}>
        <span style={{ fontSize: '48px', marginBottom: '1rem' }}>🚛</span>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--road-white)' }}>No Active Dispatch Tracked</h3>
        <p style={{ maxWidth: '400px', fontSize: '13px', margin: '0 0 1.5rem 0' }}>
          Select an active BTP tow truck from the Tow Fleet Bay to monitor its transit route, communicate with the violator, and triage active disputes.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('tow-fleet')}>
          Go to Tow Fleet Bay
        </button>
      </div>
    );
  }

  // Filter map down to only target hotspot and truck path
  const focusedHotspots = [hotspot];
  const focusedInterventions = new Map([[hotspot.cluster_id, 'TOW' as const]]);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>

      {/* Left Column: Mini Map & SMS Warning Chat Terminal */}
      <div style={{
        flex: 1.4,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--asphalt-400)',
        height: '100%'
      }}>
        {/* Focused Mini Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Map3D
            hotspots={focusedHotspots}
            selectedId={hotspot.cluster_id}
            onSelect={() => { }}
            interventions={focusedInterventions}
            towTrucks={[truck]}
            congestionLevels={congestionLevels}
            minImpactScore={0.0}
            onMinImpactScoreChange={() => { }}
            isSidebarCollapsed={true}
          />
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 10
          }}>
            📍 ACTIVE ROUTE TRACKING: DEPOT → {hotspot.junction_name !== 'No Junction' ? hotspot.junction_name : 'TARGET'}
          </div>
        </div>
      </div>

      {/* Right Column: Citizen Alert Phone Interface */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--asphalt-950)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--road-white)', fontWeight: 'bold' }}>
              📲 Violator Cellular Device Screen
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--asphalt-200)' }}>
              Simulates live interface rendered on the citizen's phone via SMS link
            </span>
          </div>

          <CitizenAlertPhone
            style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none', opacity: 1, pointerEvents: 'auto', margin: '0 auto' }}
            truck={truck}
            onRecall={handleRecallTowTruck}
            disputeStatus={disputeStatuses[hotspot.cluster_id]}
            isCollapsed={false}
            onToggleCollapse={() => { }}
            onDispute={(reason, explanation, attachmentName) => {
              handleDisputeViolation(
                hotspot.cluster_id,
                reason,
                explanation,
                attachmentName
              );
            }}
            onActionCompleted={(_truckId, action) => {
              if (action === 'PAID') {
                setResolvedHotspots(prev => {
                  const next = new Set(prev);
                  next.add(hotspot.cluster_id);
                  return next;
                });
                setTowTrucks(prev => prev.map(t => {
                  if (t.id === _truckId && t.status === 'AT_DEPOT') {
                    return {
                      ...t,
                      status: 'AVAILABLE' as TowTruck['status'],
                      assignedHotspotId: null,
                      assignedHotspotName: null,
                      route: []
                    };
                  }
                  return t;
                }));
              }
            }}
          />
        </div>
      </div>

    </div>
  );
};

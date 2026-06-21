import React from 'react';
import { PriorityList } from '../components/PriorityList';
import { HotspotDetail } from '../components/HotspotDetail';
import { navigate } from '../router';
import type { Hotspot, Summary } from '../lib/api';
import type { TowTruck } from '../App';

interface HotspotPrioritiesPageProps {
  hotspots: Hotspot[];
  towTrucks: TowTruck[];
  interventions: Map<number, 'CAMERA' | 'PATROL' | 'TOW'>;
  handleDeployIntervention: (clusterId: number, type: 'CAMERA' | 'PATROL') => void;
  handleDispatchTowTruck: (clusterId: number, truckId: string) => void;
  handleRecallTowTruck: (truckId: string) => void;
  summary: Summary | null;
  selectedHotspotId: string | null;
}

export const HotspotPrioritiesPage: React.FC<HotspotPrioritiesPageProps> = ({
  hotspots,
  towTrucks,
  interventions,
  handleDeployIntervention,
  handleDispatchTowTruck,
  handleRecallTowTruck,
  summary,
  selectedHotspotId
}) => {
  const selectedId = selectedHotspotId ? parseInt(selectedHotspotId, 10) : null;
  const selectedHotspot = hotspots.find(h => h.cluster_id === selectedId);

  const handleSelect = (id: number | null) => {
    if (id === null) {
      navigate('hotspots');
    } else {
      navigate('hotspots', { id });
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Left side: Priorities list */}
      <div style={{
        width: '360px',
        backgroundColor: 'var(--asphalt-800)',
        borderRight: '1px solid var(--asphalt-400)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <div className="panel-header">
          <h2>Enforcement Priorities</h2>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--asphalt-200)', marginTop: '0.25rem' }}>
            Ranked by Contextual Impact Score
          </div>
        </div>

        {summary && (
          <div style={{ 
            padding: '12px 24px', 
            borderBottom: '1px solid var(--asphalt-400)',
            backgroundColor: '#f8f9fa',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--fk-text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Violations</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)', fontFamily: 'var(--font-mono)' }}>
                {summary.total_violations.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--fk-border)', paddingLeft: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--fk-text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Hotspots</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)', fontFamily: 'var(--font-mono)' }}>
                {summary.total_clusters.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--fk-border)', paddingLeft: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--fk-text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Rejection</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--fk-text)', fontFamily: 'var(--font-mono)' }}>
                {(summary.mean_rejection_rate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PriorityList 
            hotspots={hotspots}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Right side: Detailed intelligence */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedHotspot ? (
          <HotspotDetail 
            hotspot={selectedHotspot}
            onClose={() => handleSelect(null)}
            intervention={interventions.get(selectedHotspot.cluster_id)}
            onDeployIntervention={(type) => handleDeployIntervention(selectedHotspot.cluster_id, type)}
            towTrucks={towTrucks}
            onDispatchTow={(truckId) => handleDispatchTowTruck(selectedHotspot.cluster_id, truckId)}
            onRecallTow={handleRecallTowTruck}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--asphalt-200)',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--fk-bg)'
          }}>
            <span style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</span>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--fk-text)' }}>No Hotspot Selected</h3>
            <p style={{ maxWidth: '400px', fontSize: '13px', margin: 0 }}>
              Select a parking cluster zone from the left sidebar priority list to view live camera feeds, impact score breakdowns, AI Copilot reports, and deploy interventions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

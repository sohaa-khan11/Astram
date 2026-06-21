import React, { useState, useEffect } from 'react';
import { Map3D } from '../components/Map3D';
import { HotspotDetail } from '../components/HotspotDetail';
import { navigate } from '../router';
import type { Hotspot } from '../lib/api';

interface HistoricalMapPageProps {
  hotspots: Hotspot[];
  selectedHotspotId: string | null;
}

export const HistoricalMapPage: React.FC<HistoricalMapPageProps> = ({
  hotspots,
  selectedHotspotId
}) => {
  const selectedId = selectedHotspotId ? parseInt(selectedHotspotId, 10) : null;
  const [minImpactScore, setMinImpactScore] = useState(0.0);

  const handleSelect = (id: number | null) => {
    if (id === null) {
      navigate('historical-map');
    } else {
      navigate('historical-map', { selected: id });
    }
  };

  const selectedHotspot = hotspots.find(h => h.cluster_id === selectedId);

  // Auto-close detail drawer if selected hotspot is no longer in visible list
  useEffect(() => {
    if (selectedId !== null) {
      const stillVisible = hotspots.some(h => h.cluster_id === selectedId);
      if (!stillVisible) {
        handleSelect(null);
      }
    }
  }, [hotspots, selectedId]);

  return (
    <div style={{ display: 'flex', flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Live Map Area */}
      <div className="map-container" style={{ position: 'relative', flex: 1, height: '100%' }}>
        <Map3D 
          hotspots={hotspots} 
          selectedId={selectedId} 
          onSelect={handleSelect} 
          interventions={new Map()} // No active live interventions shown
          towTrucks={[]} // Empty tow trucks (no active tracking)
          congestionLevels={{}} // Clean traffic grid
          minImpactScore={minImpactScore}
          onMinImpactScoreChange={setMinImpactScore}
          isSidebarCollapsed={selectedId === null}
        />
      </div>

      {/* Slide-out Sidebar Drawer for Read-Only Analysis */}
      <aside className={`side-panel`} style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: '420px',
        transform: selectedId !== null ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        backgroundColor: 'var(--asphalt-800)'
      }}>
        {selectedHotspot && (
          <>
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid var(--neu-shadow-dark)', 
              backgroundColor: 'var(--neu-bg-secondary)', 
              display: 'flex', 
              justifyContent: 'center',
              zIndex: 10
            }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neu-text-secondary)', textTransform: 'uppercase' }}>
                📂 Historical Database Record
              </span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <HotspotDetail 
                hotspot={selectedHotspot} 
                onClose={() => handleSelect(null)} 
                intervention={undefined}
                onDeployIntervention={() => {}}
                towTrucks={[]} // No dispatches allowed
                onDispatchTow={() => {}}
                onRecallTow={() => {}}
              />
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

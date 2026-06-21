import React, { useState, useEffect } from 'react';
import { Map3D } from '../components/Map3D';
import { ReplayControls } from '../components/ReplayControls';
import { CitizenAlertPhone } from '../components/CitizenAlertPhone';
import { HotspotDetail } from '../components/HotspotDetail';
import { navigate } from '../router';
import type { Hotspot } from '../lib/api';
import type { TowTruck } from '../App';

interface OperationsMapPageProps {
  hotspots: Hotspot[];
  towTrucks: TowTruck[];
  congestionLevels: Record<string, 'GREEN' | 'AMBER' | 'RED'>;
  interventions: Map<number, 'CAMERA' | 'PATROL' | 'TOW'>;
  minImpactScore: number;
  setMinImpactScore: (val: number) => void;
  isReplaying: boolean;
  setIsReplaying: (val: boolean) => void;
  handleReplayTick: (events: any[]) => void;
  handleRecallTowTruck: (truckId: string) => void;
  disputeStatuses: Record<number, 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'>;
  handleDisputeViolation: (
    clusterId: number, 
    reason: string, 
    explanation: string, 
    attachmentName: string
  ) => void;
  setResolvedHotspots: React.Dispatch<React.SetStateAction<Set<number>>>;
  setTowTrucks: React.Dispatch<React.SetStateAction<TowTruck[]>>;
  handleDeployIntervention: (clusterId: number, type: 'CAMERA' | 'PATROL') => void;
  handleDispatchTowTruck: (clusterId: number, truckId: string) => void;
}

export const OperationsMapPage: React.FC<OperationsMapPageProps> = ({
  hotspots,
  towTrucks,
  congestionLevels,
  interventions,
  minImpactScore,
  setMinImpactScore,
  isReplaying,
  setIsReplaying,
  handleReplayTick,
  handleRecallTowTruck,
  disputeStatuses,
  handleDisputeViolation,
  setResolvedHotspots,
  setTowTrucks,
  handleDeployIntervention,
  handleDispatchTowTruck,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPhoneCollapsed, setIsPhoneCollapsed] = useState(false);

  // Auto-restore phone display on selection change
  useEffect(() => {
    setIsPhoneCollapsed(false);
  }, [selectedId]);

  const selectedHotspot = hotspots.find(h => h.cluster_id === selectedId);

  // Auto-close detail drawer if selected hotspot is no longer in visible hotspots list
  useEffect(() => {
    if (selectedId !== null) {
      const stillVisible = hotspots.some(h => h.cluster_id === selectedId);
      if (!stillVisible) {
        setSelectedId(null);
      }
    }
  }, [hotspots, selectedId]);

  return (
    <div style={{ display: 'flex', flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div className="map-container" style={{ position: 'relative', flex: 1, height: '100%' }}>
        <Map3D 
          hotspots={hotspots} 
          selectedId={selectedId} 
          onSelect={setSelectedId} 
          interventions={interventions}
          towTrucks={towTrucks}
          congestionLevels={congestionLevels}
          minImpactScore={minImpactScore}
          onMinImpactScoreChange={setMinImpactScore}
          isSidebarCollapsed={selectedId === null}
        />

        {/* Floating Pulsing Badge for Minimized Phone */}
        {selectedHotspot && (() => {
          const activeTruck = towTrucks.find(t => t.assignedHotspotId === selectedHotspot.cluster_id);
          return activeTruck && (
            activeTruck.status === 'EN_ROUTE' || 
            activeTruck.status === 'ON_SITE' || 
            activeTruck.status === 'RETURNING' || 
            activeTruck.status === 'AT_DEPOT'
          ) && isPhoneCollapsed ? (
            <div 
              onClick={() => setIsPhoneCollapsed(false)}
              style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                backgroundColor: '#0f172a',
                color: 'white',
                border: '2.5px solid var(--fk-blue)',
                borderRadius: '24px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 110,
                fontSize: '11px',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                animation: 'phone-pulse-glowing 2s infinite'
              }}
              title="Expand Citizen Alert"
            >
              <span style={{ fontSize: '14px' }}>💬</span>
              <span>Citizen Active ({activeTruck.id})</span>
            </div>
          ) : null;
        })()}
      </div>

      {/* Citizen Alert Device Overlay */}
      {selectedHotspot && (() => {
        const activeTruck = towTrucks.find(t => t.assignedHotspotId === selectedHotspot.cluster_id);
        return activeTruck && (
          activeTruck.status === 'EN_ROUTE' || 
          activeTruck.status === 'ON_SITE' || 
          activeTruck.status === 'RETURNING' || 
          activeTruck.status === 'AT_DEPOT'
        ) ? (
          <CitizenAlertPhone 
            key={`${activeTruck.id}-${activeTruck.assignedHotspotId}`}
            truck={activeTruck}
            onRecall={handleRecallTowTruck}
            disputeStatus={disputeStatuses[selectedHotspot.cluster_id]}
            isCollapsed={isPhoneCollapsed}
            onToggleCollapse={setIsPhoneCollapsed}
            onDispute={(reason, explanation, attachmentName) => {
              handleDisputeViolation(
                selectedHotspot.cluster_id, 
                reason, 
                explanation, 
                attachmentName
              );
            }}
            onActionCompleted={(_truckId, action) => {
              if (action === 'PAID') {
                setResolvedHotspots(prev => {
                  const next = new Set(prev);
                  next.add(selectedHotspot.cluster_id);
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
        ) : null;
      })()}

      {/* Right Drawer Sliding Panel */}
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
        flexDirection: 'column'
      }}>
        {selectedHotspot && (
          <>
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid var(--asphalt-400)', 
              backgroundColor: '#f0f4ff', 
              display: 'flex', 
              justifyContent: 'center',
              zIndex: 10
            }}>
              <button 
                onClick={() => navigate('hotspots', { id: selectedId! })}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '12px', padding: '8px', justifyContent: 'center' }}
              >
                Open Full Zone Details →
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <HotspotDetail 
                hotspot={selectedHotspot} 
                onClose={() => setSelectedId(null)} 
                intervention={interventions.get(selectedHotspot.cluster_id)}
                onDeployIntervention={(type) => handleDeployIntervention(selectedHotspot.cluster_id, type)}
                towTrucks={towTrucks}
                onDispatchTow={(truckId) => handleDispatchTowTruck(selectedHotspot.cluster_id, truckId)}
                onRecallTow={handleRecallTowTruck}
              />
            </div>
          </>
        )}
      </aside>

      {/* Replay Controls & Bottom Bar */}
      {isReplaying ? (
        <ReplayControls 
          onTick={handleReplayTick} 
          onStatusChange={setIsReplaying} 
        />
      ) : (
        <div className="bottom-bar" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', justifyContent: 'center', zIndex: 10 }}>
          <button className="btn btn-primary" onClick={() => setIsReplaying(true)}>
            ENTER REPLAY MODE
          </button>
        </div>
      )}
    </div>
  );
};

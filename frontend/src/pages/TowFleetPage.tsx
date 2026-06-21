import React, { useState } from 'react';
import { navigate } from '../router';
import type { TowTruck } from '../App';

interface TowFleetPageProps {
  towTrucks: TowTruck[];
  onRecall: (truckId: string) => void;
  highlightTruckId: string | null;
}

export const TowFleetPage: React.FC<TowFleetPageProps> = ({
  towTrucks,
  onRecall,
  highlightTruckId
}) => {
  const [confirmRecallId, setConfirmRecallId] = useState<string | null>(null);

  const handleRecallClick = (truckId: string) => {
    setConfirmRecallId(truckId);
  };

  const handleConfirmRecall = (truckId: string) => {
    onRecall(truckId);
    setConfirmRecallId(null);
  };

  const handleCancelRecall = () => {
    setConfirmRecallId(null);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.5rem', color: 'var(--neu-text-primary)' }}>
            🚛 BTP Tow Fleet Control
          </h2>
          <p style={{ color: 'var(--neu-text-secondary)', margin: 0 }}>
            Real-time tracking and operations monitoring for Divisional BTP Tow Trucks.
          </p>
        </div>

        {/* 8-Bay Fixed Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {towTrucks.map((truck) => {
            const isAvailable = truck.status === 'AVAILABLE';
            const isEnRoute = truck.status === 'EN_ROUTE';
            const isOnSite = truck.status === 'ON_SITE';
            const isReturning = truck.status === 'RETURNING';
            const isAtDepot = truck.status === 'AT_DEPOT';

            let statusColor = '#10b981';
            let statusBg = 'rgba(16, 185, 129, 0.15)';
            let statusText = 'Available';

            if (isEnRoute) {
              statusColor = '#f59e0b';
              statusBg = 'rgba(245, 158, 11, 0.15)';
              statusText = `En Route (${Math.round(truck.progress * 100)}%)`;
            } else if (isOnSite) {
              statusColor = '#ef4444';
              statusBg = 'rgba(239, 68, 68, 0.15)';
              statusText = 'On Site (Towing)';
            } else if (isReturning) {
              statusColor = '#3b82f6';
              statusBg = 'rgba(59, 130, 246, 0.15)';
              statusText = `Returning (${Math.round(truck.progress * 100)}%)`;
            } else if (isAtDepot) {
              statusColor = '#a855f7';
              statusBg = 'rgba(168, 85, 247, 0.15)';
              statusText = 'At Depot (Unpaid)';
            }

            const isHighlighted = highlightTruckId === truck.id;
            const isConfirming = confirmRecallId === truck.id;

            return (
              <div
                key={truck.id}
                className="card"
                style={{
                  border: isHighlighted ? '2px solid var(--neu-primary)' : undefined,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: isHighlighted ? '0 0 12px var(--neu-primary)' : undefined,
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 'var(--text-lg)', color: 'var(--neu-text-primary)' }}>
                    {truck.id}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    color: statusColor,
                    backgroundColor: statusBg
                  }}>
                    {statusText}
                  </span>
                </div>

                {/* Subtitle */}
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neu-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  License: {truck.licensePlate}
                </div>

                {/* Info block */}
                <div style={{ 
                  flex: 1, 
                  borderTop: '1px solid var(--neu-shadow-dark)', 
                  paddingTop: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: 'var(--text-sm)'
                }}>
                  <div>
                    <span style={{ color: 'var(--neu-text-secondary)' }}>Home Depot:</span><br/>
                    <strong style={{ color: 'var(--neu-text-primary)' }}>{truck.depotName}</strong>
                  </div>

                  {truck.assignedHotspotId !== null && (
                    <div>
                      <span style={{ color: 'var(--neu-text-secondary)' }}>Assigned Hotspot:</span><br/>
                      <span 
                        onClick={() => navigate('hotspots', { id: truck.assignedHotspotId! })}
                        style={{ 
                          color: 'var(--neu-primary)', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        📍 {truck.assignedHotspotName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action button */}
                {!isAvailable && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {isConfirming ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleConfirmRecall(truck.id)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            backgroundColor: 'var(--enforcement-red)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          CONFIRM
                        </button>
                        <button
                          onClick={handleCancelRecall}
                          style={{
                            flex: 1,
                            padding: '6px',
                            backgroundColor: 'var(--neu-shadow-dark)',
                            color: 'var(--neu-text-primary)',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRecallClick(truck.id)}
                        disabled={isReturning}
                        className="btn btn-outline"
                        style={{
                          width: '100%',
                          padding: '8px',
                          color: 'var(--enforcement-red)',
                          fontWeight: 'bold',
                          fontSize: 'var(--text-xs)',
                          cursor: isReturning ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {isReturning ? 'RETURNING TO DEPOT' : '⚠️ RECALL TO DEPOT'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

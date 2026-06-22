import React, { useEffect, useState, useMemo } from 'react';
import { Map3D } from '../components/Map3D';
import type { TowTruck } from '../App';
import { NETWORK_EDGES, NETWORK_NODES, EDGE_ROAD_NAMES } from '../App';
import { API_BASE } from '../lib/api';

interface PresentMapPageProps {
  towTrucks: TowTruck[];
  congestionLevels: Record<string, 'GREEN' | 'AMBER' | 'RED'>;
  handleRecallTowTruck: (truckId: string) => void;
  handleDispatchTowTruckToEdge: (edgeId: string, truckId: string) => void;
  selectedEdgeId: string | null;
}

// AI clearing time estimation based on congestion level + time of day + adjacent load
const estimateClearingTime = (
  edgeId: string,
  level: 'GREEN' | 'AMBER' | 'RED',
  congestionLevels: Record<string, 'GREEN' | 'AMBER' | 'RED'>
): { minutes: number; confidence: number; suggestion: string } => {
  const hour = new Date().getHours();
  const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);

  // Count adjacent congested segments
  const edge = NETWORK_EDGES.find(e => e.id === edgeId);
  let adjacentLoad = 0;
  if (edge) {
    const adjEdges = NETWORK_EDGES.filter(e =>
      e.id !== edgeId &&
      (e.from === edge.from || e.to === edge.from || e.from === edge.to || e.to === edge.to)
    );
    adjacentLoad = adjEdges.filter(e => {
      const l = congestionLevels[e.id];
      return l === 'RED' || l === 'AMBER';
    }).length;
  }

  let baseMinutes = level === 'RED' ? 35 : level === 'AMBER' ? 15 : 5;
  if (isPeakHour) baseMinutes = Math.round(baseMinutes * 1.6);
  baseMinutes += adjacentLoad * 5;

  const confidence = level === 'RED' ? (isPeakHour ? 62 : 74) : (isPeakHour ? 78 : 88);

  let suggestion = '';
  if (level === 'RED') {
    suggestion = isPeakHour
      ? 'Peak hour gridlock. Consider rerouting via parallel corridors. Signal override recommended.'
      : 'Heavy congestion detected. Incident likely — dispatch clearance unit to verify.';
  } else if (level === 'AMBER') {
    suggestion = adjacentLoad > 1
      ? 'Spillover risk from adjacent corridors. Monitor closely for escalation.'
      : 'Moderate slowdown. Likely clears naturally within estimated window.';
  } else {
    suggestion = 'Traffic flowing normally. No action required.';
  }

  return { minutes: baseMinutes, confidence, suggestion };
};

export const PresentMapPage: React.FC<PresentMapPageProps> = ({
  towTrucks,
  congestionLevels,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [clearanceTimes, setClearanceTimes] = useState<Record<string, { minutes: number; confidence: number; suggestion: string }>>({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch clearance times from backend ML-style estimator
  useEffect(() => {
    const activeEdges = Object.entries(congestionLevels).filter(([_, lvl]) => lvl === 'RED' || lvl === 'AMBER');
    if (activeEdges.length === 0) return;
    
    Promise.all(activeEdges.map(([id, lvl]) => {
      const edge = NETWORK_EDGES.find(e => e.id === id);
      let adjacentLoad = 0;
      if (edge) {
        const adjEdges = NETWORK_EDGES.filter(e =>
          e.id !== id &&
          (e.from === edge.from || e.to === edge.from || e.from === edge.to || e.to === edge.to)
        );
        adjacentLoad = adjEdges.filter(e => {
          const l = congestionLevels[e.id];
          return l === 'RED' || l === 'AMBER';
        }).length;
      }
      
      return fetch(`${API_BASE}/traffic/clearance_time?edge_id=${id}&level=${lvl}&adjacent_load=${adjacentLoad}`)
        .then(res => res.json())
        .then(data => ({
          id,
          clearing: {
            minutes: data.predicted_minutes,
            confidence: Math.round(data.confidence_score * 100),
            suggestion: data.recommendation
          }
        }))
        .catch(() => ({
          id,
          clearing: estimateClearingTime(id, lvl, congestionLevels)
        }));
    })).then(results => {
      const mapping: typeof clearanceTimes = {};
      results.forEach(r => {
        mapping[r.id] = r.clearing;
      });
      setClearanceTimes(prev => ({ ...prev, ...mapping }));
    });
  }, [congestionLevels]);

  // Live stats
  const totalSegments = Object.keys(congestionLevels).length;
  const redCount = Object.values(congestionLevels).filter(v => v === 'RED').length;
  const amberCount = Object.values(congestionLevels).filter(v => v === 'AMBER').length;
  const greenCount = Object.values(congestionLevels).filter(v => v === 'GREEN').length;
  const congestionPct = totalSegments > 0
    ? Math.round(((redCount * 1.0 + amberCount * 0.5) / totalSegments) * 100)
    : 0;

  // Build highlighted areas list — only RED + AMBER segments with AI clearing data
  const highlightedAreas = useMemo(() => {
    return Object.entries(congestionLevels)
      .filter(([_, level]) => level === 'RED' || level === 'AMBER')
      .map(([id, level]) => {
        const roadName = EDGE_ROAD_NAMES[id] || `Segment ${id}`;
        const clearing = clearanceTimes[id] || estimateClearingTime(id, level, congestionLevels);
        // Get the midpoint for popup positioning
        const edge = NETWORK_EDGES.find(e => e.id === id);
        let lat = 12.97, lon = 77.59;
        if (edge) {
          const from = NETWORK_NODES[edge.from];
          const to = NETWORK_NODES[edge.to];
          lat = (from.lat + to.lat) / 2;
          lon = (from.lon + to.lon) / 2;
        }
        return { id, level, roadName, clearing, lat, lon };
      })
      .sort((a, b) => {
        if (a.level === b.level) return b.clearing.minutes - a.clearing.minutes;
        return a.level === 'RED' ? -1 : 1;
      });
  }, [congestionLevels, clearanceTimes]);

  const overallStatus = redCount > 3 ? 'HEAVY' : redCount > 0 || amberCount > 3 ? 'MODERATE' : 'SMOOTH';
  const statusColor = overallStatus === 'HEAVY' ? '#ef4444' : overallStatus === 'MODERATE' ? '#f59e0b' : '#10b981';

  return (
    <div style={{ display: 'flex', flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Full-screen Map */}
      <div className="map-container" style={{ position: 'relative', flex: 1, height: '100%' }}>
        <Map3D
          hotspots={[]}
          selectedId={null}
          onSelect={() => {}}
          interventions={new Map()}
          towTrucks={towTrucks}
          congestionLevels={congestionLevels}
          minImpactScore={0}
          onMinImpactScoreChange={() => {}}
          isSidebarCollapsed={true}
          showTrafficOnly={true}
          selectedEdgeId={selectedSegment}
          onSelectEdge={(id) => setSelectedSegment(id)}
        />
      </div>

      {/* ── TOP-LEFT: Live Status Badge ── */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(10,10,14,0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '7px 12px',
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981',
            display: 'inline-block', animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, letterSpacing: '0.8px' }}>
            LIVE
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>
            {currentTime.toLocaleTimeString()}
          </span>
        </div>

        <div style={{
          backgroundColor: 'rgba(10,10,14,0.88)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${statusColor}25`,
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: statusColor }}>{congestionPct}%</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px', fontWeight: 600 }}>
              CITY CONGESTION
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontSize: '8px', fontWeight: 700, padding: '1px 5px',
                borderRadius: '3px', backgroundColor: `${statusColor}20`, color: statusColor,
              }}>
                {overallStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM-LEFT: Road Segments Summary ── */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '14px',
        zIndex: 200,
        backgroundColor: 'rgba(10,10,14,0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '10px 14px',
        pointerEvents: 'none',
        minWidth: '140px',
      }}>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px', fontWeight: 600, marginBottom: '8px' }}>
          ROAD SEGMENTS
        </div>
        {[
          { label: 'Free Flow', count: greenCount, color: '#10b981' },
          { label: 'Slow', count: amberCount, color: '#f59e0b' },
          { label: 'Gridlock', count: redCount, color: '#ef4444' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '18px', height: '4px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', flex: 1 }}>{label}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color }}>{count}</span>
          </div>
        ))}
      </div>

      {/* ── RIGHT: High Traffic Areas Panel ── */}
      <div style={{
        position: 'absolute',
        top: '14px',
        right: '14px',
        bottom: '14px',
        width: '340px',
        zIndex: 200,
        backgroundColor: 'rgba(10,10,14,0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Panel Header */}
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🔴</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.3px' }}>
                HIGH TRAFFIC ZONES
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                AI-estimated clearing times
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '9px', fontWeight: 700, padding: '2px 8px',
            borderRadius: '8px', backgroundColor: highlightedAreas.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            color: highlightedAreas.length > 0 ? '#f87171' : '#10b981',
          }}>
            {highlightedAreas.length} ACTIVE
          </span>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {highlightedAreas.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: '8px',
              color: 'rgba(255,255,255,0.3)',
            }}>
              <span style={{ fontSize: '28px' }}>✅</span>
              <span style={{ fontSize: '11px' }}>All roads flowing freely</span>
            </div>
          ) : (
            highlightedAreas.map((area) => {
              const isSelected = selectedSegment === area.id;
              const levelColor = area.level === 'RED' ? '#ef4444' : '#f59e0b';

              return (
                <div key={area.id} style={{ marginBottom: '6px' }}>
                  {/* Card */}
                  <div
                    onClick={() => setSelectedSegment(isSelected ? null : area.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? `${levelColor}12` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? `${levelColor}40` : 'rgba(255,255,255,0.04)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Top row: road name + severity */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                          {area.roadName}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                          Segment {area.id.toUpperCase()}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '8px', fontWeight: 700, padding: '2px 6px',
                        borderRadius: '4px', backgroundColor: `${levelColor}20`, color: levelColor,
                        letterSpacing: '0.3px', flexShrink: 0, marginLeft: '8px',
                      }}>
                        {area.level === 'RED' ? 'HEAVY' : 'MODERATE'}
                      </span>
                    </div>

                    {/* Clearing time bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Est. Clear:</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: levelColor }}>
                        ~{area.clearing.minutes} min
                      </span>
                      <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)' }}>
                        ({area.clearing.confidence}% conf.)
                      </span>
                    </div>

                    {/* Progress bar visual */}
                    <div style={{
                      height: '3px', borderRadius: '2px',
                      backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: `${Math.min(100, area.clearing.minutes * 2)}%`,
                        background: `linear-gradient(90deg, ${levelColor}, ${levelColor}80)`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>

                    {/* Expanded detail when selected */}
                    {isSelected && (
                      <div style={{
                        marginTop: '10px', paddingTop: '10px',
                        borderTop: `1px solid ${levelColor}20`,
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '6px',
                          fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5',
                        }}>
                          <span style={{ fontSize: '12px', flexShrink: 0 }}>🤖</span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '2px', fontSize: '9px', letterSpacing: '0.3px' }}>
                              AI ANALYSIS
                            </div>
                            {area.clearing.suggestion}
                          </div>
                        </div>

                        {/* Coordinates */}
                        <div style={{
                          marginTop: '8px', fontSize: '9px',
                          color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace',
                        }}>
                          📍 {area.lat.toFixed(4)}°N, {area.lon.toFixed(4)}°E
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel footer */}
        <div style={{
          padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '8px', color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          flexShrink: 0,
        }}>
          Data refreshes every 15s · AI predictions are estimates
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

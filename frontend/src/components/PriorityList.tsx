import React from 'react';
import type { Hotspot } from '../lib/api';

interface PriorityListProps {
    hotspots: Hotspot[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
}

export const PriorityList: React.FC<PriorityListProps> = ({ hotspots, selectedId, onSelect }) => {
    return (
        <div className="panel-content">
            {hotspots.slice(0, 100).map((h, i) => (
                <div 
                    key={h.cluster_id} 
                    className={`priority-item ${selectedId === h.cluster_id ? 'active' : ''} ${i < 3 ? 'top-ranked' : ''}`}
                    onClick={() => onSelect(h.cluster_id)}
                >
                    <div className="rank-badge">#{i + 1}</div>
                    <div className="item-details">
                        <div className="item-loc">
                            {h.junction_name !== 'No Junction' && h.junction_name !== 'Midblock' 
                                ? h.junction_name 
                                : `${h.police_station} Midblock`}
                        </div>
                        <div className="item-meta">
                            <span className={`type-badge ${h.cluster_type === 'Junction Blocking' ? 'junction' : ''}`}>
                                {h.cluster_type === 'Junction Blocking' ? 'Junction' : 'Midblock'}
                            </span>
                            <span className="mono">{h.violation_count} hits</span>
                        </div>
                        <div className="score-bar-container">
                            <div 
                                className="score-bar-fill" 
                                style={{ 
                                    width: `${h.impact_score * 100}%`,
                                    backgroundColor: h.cluster_type === 'Junction Blocking' ? 'var(--signal-amber)' : 'var(--enforcement-red)'
                                }} 
                            />
                        </div>
                    </div>
                    <div className="item-score mono" style={{ color: i < 3 ? 'var(--signal-amber)' : 'var(--road-white)' }}>
                        {h.impact_score.toFixed(3)}
                    </div>
                </div>
            ))}
        </div>
    );
};

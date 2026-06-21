import React from 'react';
import type { Hotspot } from '../lib/api';

interface ScoreBreakdownProps {
    hotspot: Hotspot;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ hotspot }) => {
    const bd = hotspot.score_breakdown;
    
    // Sort components by magnitude
    const sorted = Object.entries(bd).sort((a, b) => b[1] - a[1]);
    
    // Map to colors
    const colors: Record<string, string> = {
        density: '#B83C2A',      // enforcement-red
        repeat: '#8A919E',       // asphalt-200
        footprint: '#4A5060',    // asphalt-400
        severity: '#E67300',     // signal-amber
        junction: '#7A3D00',     // signal-amber-dim
        temporal: '#4A8FBF'      // junction-blue
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                {sorted.map(([key, val]) => (
                    val > 0.001 && (
                        <div 
                            key={key} 
                            style={{ 
                                width: `${(val / hotspot.impact_score) * 100}%`, 
                                backgroundColor: colors[key] || '#fff'
                            }} 
                            title={`${key}: ${val.toFixed(3)}`}
                        />
                    )
                ))}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sorted.map(([key, val]) => {
                    if (val <= 0.001) return null;
                    return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[key] }} />
                                <span style={{ textTransform: 'capitalize', fontSize: 'var(--text-sm)' }}>{key}</span>
                            </div>
                            <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--asphalt-200)' }}>
                                +{val.toFixed(3)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

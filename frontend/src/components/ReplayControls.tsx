import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { api } from '../lib/api';
import type { SimulationEvent } from '../lib/api';

interface ReplayControlsProps {
    onTick: (events: SimulationEvent[]) => void;
    onStatusChange: (isReplaying: boolean) => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({ onTick, onStatusChange }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState<number>(50000); // Faster default speed
    const [currentDate, setCurrentDate] = useState<Date>(new Date('2024-01-01T00:00:00Z'));
    const dateRef = useRef<Date>(new Date('2024-01-01T00:00:00Z'));
    const endDate = new Date('2024-04-30T00:00:00Z');
    const timerRef = useRef<number | null>(null);

    // Sync dateRef when user manually drags the slider
    useEffect(() => {
        dateRef.current = currentDate;
    }, [currentDate]);

    useEffect(() => {
        if (isPlaying) {
            timerRef.current = window.setInterval(async () => {
                const current = dateRef.current;
                const nextDate = new Date(current.getTime() + (1000 * speed)); // Advance clock
                if (nextDate >= endDate) {
                    setIsPlaying(false);
                    return;
                }
                
                try {
                    const events = await api.simulateTick(current.toISOString(), nextDate.toISOString());
                    if (events.length > 0) {
                        onTick(events);
                    }
                } catch (e) {
                    console.error("Tick error", e);
                }
                
                dateRef.current = nextDate; // Update the ref immediately for the next tick
                setCurrentDate(nextDate); // Update UI
            }, 1000); // Poll every second of real time
        } else if (timerRef.current) {
            window.clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [isPlaying, speed, endDate, onStatusChange, onTick]);

    return (
        <div className="bottom-bar">
            <button 
                className="btn btn-primary" 
                onClick={() => {
                    const nextVal = !isPlaying;
                    setIsPlaying(nextVal);
                    onStatusChange(nextVal);
                }}
            >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? "PAUSE REPLAY" : "START REPLAY"}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--asphalt-400)', paddingLeft: '1rem' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--asphalt-200)', textTransform: 'uppercase' }}>Speed</span>
                <select 
                    value={speed} 
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    style={{ background: 'var(--asphalt-600)', color: 'var(--fk-text)', border: '1px solid var(--fk-border)', padding: '4px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}
                >
                    <option value={100}>100x</option>
                    <option value={1000}>1000x</option>
                    <option value={10000}>10000x</option>
                </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, marginLeft: '2rem' }}>
                <span className="mono" style={{ color: 'var(--fk-text-secondary)' }}>{currentDate.toISOString().split('T')[0]}</span>
                <input 
                    type="range" 
                    min={new Date('2024-01-01T00:00:00Z').getTime()} 
                    max={endDate.getTime()} 
                    value={currentDate.getTime()}
                    onChange={(e) => setCurrentDate(new Date(Number(e.target.value)))}
                    style={{ flex: 1 }}
                />
                <span className="mono" style={{ color: 'var(--fk-text-secondary)' }}>{endDate.toISOString().split('T')[0]}</span>
            </div>
        </div>
    );
};

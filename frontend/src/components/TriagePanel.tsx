import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import type { TriageRecord } from '../lib/api';

interface ExtendedTriageRecord extends TriageRecord {
    isDisputed?: boolean;
    disputeReason?: string;
    disputeExplanation?: string;
    disputeAttachment?: string;
    clusterId?: number;
}

interface TriagePanelProps {
    queue?: ExtendedTriageRecord[];
    onAction?: (id: string, action: string) => void;
}

export const TriagePanel: React.FC<TriagePanelProps> = ({ queue: propsQueue, onAction: propsOnAction }) => {
    const [localQueue, setLocalQueue] = useState<ExtendedTriageRecord[]>([]);
    const [loading, setLoading] = useState(!propsQueue);
    const [actioned, setActioned] = useState<Set<string>>(new Set());
    const [selectedCitation, setSelectedCitation] = useState<ExtendedTriageRecord | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [viewMode, setViewMode] = useState<'QUEUE' | 'DEVICES'>('QUEUE');
    const [devices, setDevices] = useState<any[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(false);

    useEffect(() => {
        if (viewMode === 'DEVICES' && devices.length === 0) {
            setLoadingDevices(true);
            api.getDevicesReliability()
                .then((data) => {
                    setDevices(data);
                    setLoadingDevices(false);
                })
                .catch((err) => {
                    console.error("Failed to load device reliability:", err);
                    setLoadingDevices(false);
                });
        }
    }, [viewMode]);

    useEffect(() => {
        if (!propsQueue) {
            api.getTriageQueue().then((data) => {
                setLocalQueue(data);
                setLoading(false);
            });
        }
    }, [propsQueue]);

    const displayQueue = propsQueue || localQueue;

    const handleAction = (id: string, action: string) => {
        setActioned(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
        if (propsOnAction) {
            propsOnAction(id, action);
        }
    };

    const getRecommendationColor = (rec: string) => {
        if (rec === 'REJECT') return 'var(--enforcement-red)';
        if (rec === 'APPROVE') return 'var(--clearance-green)';
        return 'var(--signal-amber)';
    };

    const getRecommendationIcon = (rec: string) => {
        if (rec === 'REJECT') return <XCircle size={16} />;
        if (rec === 'APPROVE') return <CheckCircle2 size={16} />;
        return <AlertTriangle size={16} />;
    };

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.5rem', color: 'var(--neu-text-primary)' }}>Triage Queue</h2>
                        <p style={{ color: 'var(--neu-text-secondary)', margin: 0 }}>
                            Automated pre-sorting to reduce the manual validation overhead. Model certainty is trained on historical validation patterns.
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--text-xl)', color: 'var(--enforcement-red)', fontWeight: 'bold' }} className="mono">29.1%</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neu-text-secondary)', textTransform: 'uppercase' }}>Historical Rejection Rate</div>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setViewMode('QUEUE')}
                        style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            border: `1.5px solid ${viewMode === 'QUEUE' ? 'var(--fk-blue)' : 'var(--asphalt-400)'}`,
                            backgroundColor: viewMode === 'QUEUE' ? '#f0f4ff' : 'var(--fk-white)',
                            color: viewMode === 'QUEUE' ? 'var(--fk-blue)' : 'var(--fk-text)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <span>📋</span> Citation Inbox ({displayQueue.filter(r => !actioned.has(r.id)).length})
                    </button>
                    <button
                        onClick={() => setViewMode('DEVICES')}
                        style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            border: `1.5px solid ${viewMode === 'DEVICES' ? 'var(--fk-blue)' : 'var(--asphalt-400)'}`,
                            backgroundColor: viewMode === 'DEVICES' ? '#f0f4ff' : 'var(--fk-white)',
                            color: viewMode === 'DEVICES' ? 'var(--fk-blue)' : 'var(--fk-text)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <span>📡</span> Sensor Data Reliability Diagnostics
                    </button>
                </div>

                {viewMode === 'QUEUE' ? (
                    <>
                        {/* Info Card explaining Triage */}
                <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    marginBottom: '2rem',
                    color: 'var(--road-white)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#60a5fa' }}>
                        ℹ️ What is the Triage Queue?
                    </div>
                    <div>
                        When AI traffic surveillance cameras capture a parking violation, they capture an image. However, to prevent false citations (e.g. police vehicles, cars stopped momentarily at red lights, or incorrect optical detections), BTP officers manually review each ticket before printing. This inbox is the <strong>Triage Queue</strong>.
                    </div>
                    <div style={{ color: 'var(--asphalt-200)' }}>
                        To save time, ASTraM uses an <strong>XGBoost Classifier Model</strong> trained on historical BTP validation outcomes. The model predicts the probability of a human officer rejecting a citation (e.g. predicting a <strong>REJECT</strong> or <strong>APPROVE</strong> action). High-confidence approvals can be quickly verified and printed, while high-probability errors are weeded out immediately, boosting administrative efficiency.
                    </div>
                </div>

                {loading ? (
                    <div style={{ color: 'var(--asphalt-200)' }}>Loading triage queue...</div>
                ) : (
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        {/* Table on Left (responsive width) */}
                        <div className="card" style={{ 
                            flex: selectedCitation ? '1.4' : '1', 
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            padding: 0
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--neu-bg-secondary)', borderBottom: '1px solid var(--neu-shadow-dark)' }}>
                                        <th style={{ padding: '1rem', color: 'var(--neu-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Time</th>
                                        <th style={{ padding: '1rem', color: 'var(--neu-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Location</th>
                                        <th style={{ padding: '1rem', color: 'var(--neu-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Vehicle / Offense</th>
                                        <th style={{ padding: '1rem', color: 'var(--neu-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Recommended Action</th>
                                        <th style={{ padding: '1rem', color: 'var(--neu-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Certainty</th>
                                        <th style={{ padding: '1rem', color: 'var(--neu-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {displayQueue.filter(r => !actioned.has(r.id)).map((record) => {
                                         const isDisputed = record.id.startsWith('disp-') || record.isDisputed;
                                         return (
                                             <tr 
                                                 key={record.id} 
                                                 onClick={() => { setSelectedCitation(record); setShowPrintModal(false); }}
                                                 style={{ 
                                                     borderBottom: '1px solid var(--neu-shadow-dark)', 
                                                     transition: 'background-color 0.2s',
                                                     cursor: 'pointer',
                                                     backgroundColor: selectedCitation?.id === record.id ? 'var(--neu-bg-secondary)' : 'transparent'
                                                 }}
                                                 onMouseEnter={(e) => {
                                                     if (selectedCitation?.id !== record.id) {
                                                         e.currentTarget.style.backgroundColor = 'var(--neu-bg-secondary)';
                                                     }
                                                 }}
                                                 onMouseLeave={(e) => {
                                                     if (selectedCitation?.id !== record.id) {
                                                         e.currentTarget.style.backgroundColor = 'transparent';
                                                     }
                                                 }}
                                             >
                                                 <td style={{ padding: '1rem' }}>
                                                     <div className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--neu-text-primary)' }}>
                                                         {record.created_datetime.split('T')[0]}<br/>
                                                         <span style={{ color: 'var(--neu-text-secondary)' }}>{record.created_datetime.split('T')[1]?.substring(0, 5)}</span>
                                                     </div>
                                                 </td>
                                                 <td style={{ padding: '1rem' }}>
                                                     <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neu-text-primary)' }}>{record.location}</div>
                                                 </td>
                                                 <td style={{ padding: '1rem' }}>
                                                     <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>{record.vehicle_type}</div>
                                                     <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neu-text-secondary)' }}>{record.violation_type}</div>
                                                 </td>
                                                 <td style={{ padding: '1rem' }}>
                                                     {isDisputed ? (
                                                         <div 
                                                             className="disputed-blink"
                                                             style={{ 
                                                                 display: 'inline-flex', 
                                                                 alignItems: 'center', 
                                                                 gap: '0.5rem',
                                                                 padding: '4px 8px',
                                                                 borderRadius: '4px',
                                                                 backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                                                 color: '#f97316',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold',
                                                                 border: `1px solid rgba(249, 115, 22, 0.4)`
                                                             }}
                                                         >
                                                             <span>⚖️</span> CITIZEN DISPUTED
                                                         </div>
                                                     ) : (
                                                         <div style={{ 
                                                             display: 'inline-flex', 
                                                             alignItems: 'center', 
                                                             gap: '0.5rem',
                                                             padding: '4px 8px',
                                                             borderRadius: '4px',
                                                             backgroundColor: 'var(--asphalt-950)',
                                                             color: getRecommendationColor(record.ai_recommendation),
                                                             fontSize: 'var(--text-xs)',
                                                             fontWeight: 'bold',
                                                             border: `1px solid ${getRecommendationColor(record.ai_recommendation)}40`
                                                         }}>
                                                             {getRecommendationIcon(record.ai_recommendation)}
                                                             {record.ai_recommendation}
                                                         </div>
                                                     )}
                                                 </td>
                                                 <td style={{ padding: '1rem' }}>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                         <div className="mono" style={{ fontSize: 'var(--text-sm)' }}>
                                                             {(record.confidence_score * 100).toFixed(1)}%
                                                         </div>
                                                         <div style={{ width: '60px', height: '4px', backgroundColor: 'var(--asphalt-950)', borderRadius: '2px', overflow: 'hidden' }}>
                                                             <div style={{ 
                                                                 height: '100%', 
                                                                 width: `${record.confidence_score * 100}%`,
                                                                 backgroundColor: isDisputed ? '#f97316' : getRecommendationColor(record.ai_recommendation)
                                                             }} />
                                                         </div>
                                                     </div>
                                                 </td>
                                                 <td style={{ padding: '1rem' }}>
                                                     {isDisputed ? (
                                                         <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); handleAction(record.id, 'WAIVE'); }}
                                                                 style={{ 
                                                                 padding: '6px 12px', 
                                                                 backgroundColor: 'var(--clearance-green)', 
                                                                 border: 'none', 
                                                                 borderRadius: '4px', 
                                                                 color: 'white', 
                                                                 cursor: 'pointer',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold',
                                                                 opacity: actioned.has(record.id) ? 0.5 : 1
                                                             }}>WAIVE</button>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); handleAction(record.id, 'REJECT_DISPUTE'); }}
                                                                 style={{ 
                                                                 padding: '6px 12px', 
                                                                 backgroundColor: 'var(--enforcement-red)', 
                                                                 border: 'none', 
                                                                 borderRadius: '4px', 
                                                                 color: 'white', 
                                                                 cursor: 'pointer',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold',
                                                                 opacity: actioned.has(record.id) ? 0.5 : 1
                                                             }}>REJECT</button>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); setSelectedCitation(record); setShowPrintModal(false); }}
                                                                 style={{ 
                                                                 padding: '6px 12px', 
                                                                 backgroundColor: 'var(--fk-blue)', 
                                                                 border: 'none', 
                                                                 borderRadius: '4px', 
                                                                 color: 'white', 
                                                                 cursor: 'pointer',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold'
                                                             }}>REVIEW</button>
                                                         </div>
                                                     ) : (
                                                         <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); handleAction(record.id, 'APPROVE'); }}
                                                                 style={{ 
                                                                 padding: '6px 12px', 
                                                                 backgroundColor: 'var(--clearance-green)', 
                                                                 border: 'none', 
                                                                 borderRadius: '4px', 
                                                                 color: 'white', 
                                                                 cursor: 'pointer',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold',
                                                                 opacity: actioned.has(record.id) ? 0.5 : 1
                                                             }}>APPROVE</button>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); handleAction(record.id, 'REJECT'); }}
                                                                 style={{ 
                                                                 padding: '6px 12px', 
                                                                 backgroundColor: 'var(--enforcement-red)', 
                                                                 border: 'none', 
                                                                 borderRadius: '4px', 
                                                                 color: 'white', 
                                                                 cursor: 'pointer',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold',
                                                                 opacity: actioned.has(record.id) ? 0.5 : 1
                                                             }}>REJECT</button>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); setSelectedCitation(record); setShowPrintModal(false); }}
                                                                 style={{ 
                                                                 padding: '6px 12px', 
                                                                 backgroundColor: 'var(--fk-blue)', 
                                                                 border: 'none', 
                                                                 borderRadius: '4px', 
                                                                 color: 'white', 
                                                                 cursor: 'pointer',
                                                                 fontSize: 'var(--text-xs)',
                                                                 fontWeight: 'bold'
                                                             }}>REVIEW</button>
                                                         </div>
                                                     )}
                                                 </td>
                                             </tr>
                                         );
                                     })}
                                </tbody>
                            </table>
                        </div>

                        {/* Review Window Side Desk */}
                        {selectedCitation && (() => {
                            const isDisputedSelected = selectedCitation.id.startsWith('disp-') || selectedCitation.isDisputed;
                            return (
                                <div className="card" style={{
                                    flex: '1',
                                    padding: '1.5rem',
                                    position: 'sticky',
                                    top: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    color: 'var(--neu-text-primary)',
                                    animation: 'fadeIn 0.25s ease-out'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--neu-shadow-dark)', paddingBottom: '0.75rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--neu-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            ⚖️ Live Verification Desk
                                        </h3>
                                        <button 
                                            onClick={() => setSelectedCitation(null)}
                                            style={{ background: 'none', border: 'none', color: 'var(--neu-text-secondary)', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Mini Receipt Display */}
                                    <div style={{
                                        backgroundColor: '#ffffff',
                                        color: '#111111',
                                        borderRadius: '6px',
                                        padding: '16px',
                                        border: '3px double #111111',
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                    }}>
                                        <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #111111', paddingBottom: '8px', marginBottom: '10px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>🛡️ BTP CITATION SLIP 🛡️</div>
                                            <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>REF-NO: BTP-{selectedCitation.id.substring(0, 8).toUpperCase()}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>DATE/TIME:</strong>
                                                <span>{selectedCitation.created_datetime.replace('T', ' ').substring(0, 16)} IST</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>LOCATION:</strong>
                                                <span style={{ textAlign: 'right', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCitation.location}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>VEHICLE:</strong>
                                                <span>{selectedCitation.vehicle_type.toUpperCase()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>OFFENSE:</strong>
                                                <span style={{ textAlign: 'right', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCitation.violation_type}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed #111111', paddingTop: '6px', fontSize: '11.5px' }}>
                                                <strong>PENALTY:</strong>
                                                <span>{(() => {
                                                    const v = selectedCitation.violation_type.toUpperCase();
                                                    if (v.includes('FOOTPATH') || v.includes('DOUBLE') || v.includes('PROHIBITED')) return '₹1,000';
                                                    return '₹500';
                                                })()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Citizen Dispute Details (if disputed) */}
                                    {isDisputedSelected && (
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '6px', 
                                            fontSize: '11px', 
                                            backgroundColor: 'rgba(251, 146, 60, 0.1)', 
                                            padding: '10px', 
                                            borderRadius: '6px', 
                                            border: '1px solid rgba(251, 146, 60, 0.3)' 
                                        }}>
                                            <div style={{ fontWeight: 'bold', color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                ⚖️ Citizen Dispute Evidence
                                            </div>
                                            <div><strong>Reason:</strong> {selectedCitation.disputeReason || 'Not Provided'}</div>
                                            <div><strong>Explanation:</strong> <span style={{ fontStyle: 'italic', color: '#4b5563' }}>"{selectedCitation.disputeExplanation || 'No explanation.'}"</span></div>
                                            <div><strong>Evidence:</strong> <span style={{ color: '#60a5fa' }}>📎 {selectedCitation.disputeAttachment || 'None'}</span></div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                                        {isDisputedSelected ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => {
                                                        handleAction(selectedCitation.id, 'WAIVE');
                                                        setSelectedCitation(null);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 0',
                                                        backgroundColor: 'var(--clearance-green)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        fontSize: '11.5px',
                                                        transition: 'background-color 0.15s'
                                                    }}
                                                >
                                                    WAIVE FINE
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleAction(selectedCitation.id, 'REJECT_DISPUTE');
                                                        setSelectedCitation(null);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 0',
                                                        backgroundColor: 'var(--enforcement-red)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        fontSize: '11.5px',
                                                        transition: 'background-color 0.15s'
                                                    }}
                                                >
                                                    REJECT DISPUTE
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => {
                                                        handleAction(selectedCitation.id, 'APPROVE');
                                                        setSelectedCitation(null);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 0',
                                                        backgroundColor: 'var(--clearance-green)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        fontSize: '11.5px',
                                                        transition: 'background-color 0.15s'
                                                    }}
                                                >
                                                    APPROVE
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleAction(selectedCitation.id, 'REJECT');
                                                        setSelectedCitation(null);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 0',
                                                        backgroundColor: 'var(--enforcement-red)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        fontSize: '11.5px',
                                                        transition: 'background-color 0.15s'
                                                    }}
                                                >
                                                    REJECT
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowPrintModal(true)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 0',
                                                backgroundColor: 'var(--asphalt-700)',
                                                color: 'var(--road-white)',
                                                border: '1px solid var(--asphalt-500)',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                transition: 'background-color 0.15s'
                                            }}
                                        >
                                            🖨️ PRINT OFFICIAL SLIP
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
                    </>
                ) : (
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--neu-text-primary)' }}>
                            📡 BTP Sensor Data Reliability Diagnostics Log
                        </h3>
                        <p style={{ color: 'var(--neu-text-secondary)', fontSize: '12.5px', margin: 0, lineHeight: 1.4 }}>
                            Devices with low reliability indices indicate high false alarms (incorrect trigger inputs, short stops flagged as wrong parking, or optical scanner drift). Suspect units require physical inspection/calibration.
                        </p>

                        {loadingDevices ? (
                            <div style={{ color: 'var(--asphalt-200)' }}>Querying device diagnostics...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '0.5rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--neu-bg-secondary)', borderBottom: '1px solid var(--neu-shadow-dark)' }}>
                                            <th style={{ padding: '0.75rem', color: 'var(--neu-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Sensor ID</th>
                                            <th style={{ padding: '0.75rem', color: 'var(--neu-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Total Tickets</th>
                                            <th style={{ padding: '0.75rem', color: 'var(--neu-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Approved</th>
                                            <th style={{ padding: '0.75rem', color: 'var(--neu-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Rejected</th>
                                            <th style={{ padding: '0.75rem', color: 'var(--neu-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Reliability</th>
                                            <th style={{ padding: '0.75rem', color: 'var(--neu-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>System Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {devices.map((dev) => {
                                            let statusColor = '#10b981';
                                            let statusBg = 'rgba(16,185,129,0.1)';
                                            if (dev.status.includes('CRITICAL')) {
                                                statusColor = '#ef4444';
                                                statusBg = 'rgba(239,68,68,0.1)';
                                            } else if (dev.status.includes('WARNING') || dev.status.includes('INACTIVE')) {
                                                statusColor = '#fbbf24';
                                                statusBg = 'rgba(251,191,36,0.1)';
                                            }
                                            
                                            return (
                                                <tr key={dev.device_id} style={{ borderBottom: '1px solid var(--neu-shadow-dark)' }}>
                                                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }} className="mono">{dev.device_id}</td>
                                                    <td style={{ padding: '0.75rem' }} className="mono">{dev.total_captured}</td>
                                                    <td style={{ padding: '0.75rem', color: 'var(--clearance-green)' }} className="mono">{dev.approved}</td>
                                                    <td style={{ padding: '0.75rem', color: 'var(--enforcement-red)' }} className="mono">{dev.rejected}</td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span className="mono" style={{ fontWeight: 'bold', color: statusColor }}>{(dev.reliability_score * 100).toFixed(1)}%</span>
                                                            <div style={{ width: '50px', height: '4px', backgroundColor: 'var(--asphalt-950)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${dev.reliability_score * 100}%`, backgroundColor: statusColor }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{
                                                            fontSize: '9px',
                                                            fontWeight: 'bold',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            color: statusColor,
                                                            backgroundColor: statusBg,
                                                            marginRight: '8px',
                                                            display: 'inline-block'
                                                        }}>
                                                            {dev.status.replace('_', ' ')}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: 'var(--asphalt-200)' }}>{dev.message}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* BTP Citation Slip Print Modal */}
            {showPrintModal && selectedCitation && (() => {
                const isDisputedSelected = selectedCitation.id.startsWith('disp-') || selectedCitation.isDisputed;
                return (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 2000
                    }} onClick={() => { setShowPrintModal(false); }}>
                        <div className="print-area" style={{
                            backgroundColor: '#ffffff',
                            color: '#111111',
                            borderRadius: '8px',
                            width: '90%',
                            maxWidth: '460px',
                            padding: '30px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                            border: '3px double #111111',
                            fontFamily: 'monospace',
                            animation: 'fadeIn 0.2s ease-out'
                        }} onClick={(e) => e.stopPropagation()}>
                            
                            {/* Header */}
                            <div style={{ textAlign: 'center', borderBottom: '2px dashed #111111', paddingBottom: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🛡️ BTP 🛡️</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px' }}>BENGALURU TRAFFIC POLICE</div>
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px', opacity: 0.8 }}>Automated Citation System</div>
                            </div>

                            {/* Citation Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>CITATION NO:</strong>
                                    <span>BTP-REF-{selectedCitation.id.substring(0, 8).toUpperCase()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>DATE / TIME:</strong>
                                    <span>{selectedCitation.created_datetime.replace('T', ' ').substring(0, 16)} IST</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>LOCATION:</strong>
                                    <span style={{ textAlign: 'right', maxWidth: '240px' }}>{selectedCitation.location}</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #111111', paddingBottom: '8px' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>VEHICLE TYPE:</strong>
                                    <span>{selectedCitation.vehicle_type.toUpperCase()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>LICENSE PLATE:</strong>
                                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{(() => {
                                        // Deterministic plate generator
                                        let hash = 0;
                                        for (let i = 0; i < selectedCitation.id.length; i++) {
                                            hash = selectedCitation.id.charCodeAt(i) + ((hash << 5) - hash);
                                        }
                                        const val = Math.abs(hash);
                                        const letters = String.fromCharCode(65 + (val % 26)) + String.fromCharCode(65 + ((val >> 5) % 26));
                                        const num = 1000 + (val % 9000);
                                        return `KA-03-${letters}-${num}`;
                                    })()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>DETECTED OFFENSE:</strong>
                                    <span style={{ textAlign: 'right', maxWidth: '220px' }}>{selectedCitation.violation_type}</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px dashed #111111', paddingBottom: '8px' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', borderBottom: '2px solid #111111', paddingBottom: '8px' }}>
                                    <strong>PENALTY AMOUNT:</strong>
                                    <span>{(() => {
                                        const v = selectedCitation.violation_type.toUpperCase();
                                        if (v.includes('FOOTPATH') || v.includes('DOUBLE') || v.includes('PROHIBITED')) return '₹1,000';
                                        return '₹500';
                                    })()}</span>
                                </div>
                            </div>

                            {/* Citizen Dispute Details (if disputed) */}
                            {isDisputedSelected && (
                                <>
                                    <div style={{ display: 'flex', borderBottom: '1px dashed #111111', paddingBottom: '8px', marginTop: '8px', marginBottom: '8px' }}></div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', backgroundColor: '#fff7ed', padding: '10px', borderRadius: '4px', border: '1px solid #ffedd5' }}>
                                        <div style={{ fontWeight: 'bold', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>⚖️</span> CITIZEN DISPUTE FILED
                                        </div>
                                        <div>
                                            <strong>REASON:</strong> {selectedCitation.disputeReason || 'Not Provided'}
                                        </div>
                                        <div>
                                            <strong>EXPLANATION:</strong>
                                            <div style={{ fontStyle: 'italic', marginTop: '2px', whiteSpace: 'pre-wrap', color: '#4b5563' }}>
                                                "{selectedCitation.disputeExplanation || 'No explanation provided.'}"
                                            </div>
                                        </div>
                                        <div>
                                            <strong>ATTACHMENT:</strong> {selectedCitation.disputeAttachment || 'None'}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Signatures */}
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', opacity: 0.8 }}>
                                <div>
                                    <div>Recommendation: {isDisputedSelected ? 'CITIZEN DISPUTE' : selectedCitation.ai_recommendation}</div>
                                    <div>Certainty Score: {(selectedCitation.confidence_score * 100).toFixed(1)}%</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '15px', borderBottom: '1px solid #111111', paddingBottom: '2px' }}>BTP Auto-Sec</div>
                                    <div style={{ marginTop: '2px' }}>Authorizing Officer</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '30px', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => setShowPrintModal(false)} 
                                    style={{ 
                                        padding: '8px 16px', 
                                        border: '1px solid #111111', 
                                        backgroundColor: '#fff', 
                                        cursor: 'pointer', 
                                        fontWeight: 'bold',
                                        borderRadius: '4px'
                                    }}
                                >
                                    CLOSE
                                </button>
                                <button 
                                    onClick={() => window.print()} 
                                    style={{ 
                                        padding: '8px 16px', 
                                        border: 'none', 
                                        backgroundColor: '#111111', 
                                        color: '#fff', 
                                        cursor: 'pointer', 
                                        fontWeight: 'bold',
                                        borderRadius: '4px'
                                    }}
                                >
                                    PRINT SLIP
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}



            {/* Print Styles CSS */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes disputedBlink {
                    0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(249, 115, 22, 0.6); }
                    50% { opacity: 0.6; box-shadow: 0 0 2px rgba(249, 115, 22, 0.2); }
                }
                .disputed-blink {
                    animation: disputedBlink 1.5s infinite ease-in-out;
                }

                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .print-area, .print-area * {
                        visibility: visible !important;
                    }
                    .print-area {
                        position: absolute !important;
                        left: 50% !important;
                        top: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        width: 100% !important;
                        max-width: 480px !important;
                        box-shadow: none !important;
                        border: 3px double #111111 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />
        </div>
    );
};

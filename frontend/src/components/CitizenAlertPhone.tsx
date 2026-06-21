import React, { useState } from 'react';
import type { TowTruck } from '../App';

interface CitizenAlertPhoneProps {
    truck: TowTruck;
    onRecall: (truckId: string) => void;
    onActionCompleted: (truckId: string, action: 'MOVED' | 'PAID' | 'TOWED') => void;
    disputeStatus: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | undefined;
    onDispute: (reason: string, explanation: string, attachmentName: string) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: (collapsed: boolean) => void;
    style?: React.CSSProperties;
}

export const CitizenAlertPhone: React.FC<CitizenAlertPhoneProps> = ({ 
    truck, 
    onActionCompleted,
    disputeStatus,
    onDispute,
    isCollapsed = false,
    onToggleCollapse,
    style
}) => {
    const [isPaid, setIsPaid] = useState(false);
    const [paymentOverlay, setPaymentOverlay] = useState(false);
    const [view, setView] = useState<'WHATSAPP' | 'DISPUTE_PORTAL'>('WHATSAPP');
    
    // Dispute Form states
    const [disputeReason, setDisputeReason] = useState('Breakdown / Flat Tire');
    const [disputeDesc, setDisputeDesc] = useState('');
    const [disputeAttachment, setDisputeAttachment] = useState('');

    const handlePayFine = () => {
        setPaymentOverlay(true);
        setTimeout(() => {
            setPaymentOverlay(false);
            setIsPaid(true);
            onActionCompleted(truck.id, 'PAID');
        }, 2200); // 2.2 second mock payment processing
    };

    const handleSubmitDispute = () => {
        if (!disputeDesc.trim()) return;
        const attachmentName = disputeAttachment || 'btp_evidence_photo_01.jpg';
        onDispute(disputeReason, disputeDesc, attachmentName);
        setView('WHATSAPP');
    };

    // Calculate simulated ETA based on truck progress
    const eta = Math.ceil((1.0 - truck.progress) * 25); // max 25 seconds

    return (
        <div style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            width: '320px',
            height: '560px',
            backgroundColor: '#0f172a', // Sleek slate outer casing
            borderRadius: '36px',
            padding: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.35)',
            border: '4px solid #1e293b',
            zIndex: 100,
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out',
            transform: isCollapsed ? 'translateX(-380px)' : 'translateX(0)',
            opacity: isCollapsed ? 0 : 1,
            pointerEvents: isCollapsed ? 'none' : 'auto',
            ...style
        }}>
            {/* Phone Speaker Notch */}
            <div style={{
                width: '120px',
                height: '18px',
                backgroundColor: '#1e293b',
                borderRadius: '0 0 12px 12px',
                margin: '0 auto 8px auto',
                position: 'relative',
                top: '-12px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{ width: '40px', height: '4px', backgroundColor: '#0f172a', borderRadius: '2px' }} />
            </div>

            {/* Phone Screen Container */}
            <div style={{
                flex: 1,
                backgroundColor: '#0b141a',
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '1px solid #1e293b'
            }}>
                {view === 'DISPUTE_PORTAL' ? (
                    <div style={{
                        flex: 1,
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        color: 'white',
                    }}>
                        {/* Header */}
                        <div style={{
                            height: '50px',
                            backgroundColor: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            borderBottom: '1px solid #334155'
                        }}>
                            <button 
                                onClick={() => setView('WHATSAPP')}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
                            >
                                ←
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>BTP CITIZEN DISPUTE</span>
                                <span style={{ fontSize: '8px', color: '#94a3b8' }}>Verification Portal</span>
                            </div>
                            <div style={{ flex: 1 }} />
                            {onToggleCollapse && (
                                <button 
                                    onClick={() => onToggleCollapse(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        padding: '0 4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                    title="Minimize Dispute Portal"
                                >
                                    —
                                </button>
                            )}
                        </div>

                        {/* Content Scroll Area */}
                        <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Evidence Photo Card */}
                            <div style={{
                                backgroundColor: '#1e293b',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#f43f5e', textTransform: 'uppercase' }}>CCTV Captured Evidence</div>
                                <svg width="100%" height="90" style={{ backgroundColor: '#020617', borderRadius: '4px' }}>
                                    <rect x="0" y="0" width="100%" height="90" fill="#090d16" />
                                    <line x1="20" y1="45" x2="240" y2="45" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" />
                                    <rect x="50" y="25" width="140" height="40" fill="none" stroke="#ef4444" strokeWidth="2" />
                                    <text x="60" y="47" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="monospace">{truck.licensePlate}</text>
                                    <text x="60" y="60" fill="#10b981" fontSize="7" fontFamily="monospace">OCR LOCK: 98.7%</text>
                                    <text x="10" y="15" fill="#64748b" fontSize="6">CAM-BTP-{(truck.assignedHotspotId ?? 109)} // BENGALURU</text>
                                </svg>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '8.5px', color: '#94a3b8' }}>
                                    <span>📍 Location: {truck.assignedHotspotName}</span>
                                    <span>🕒 Time: {new Date().toLocaleTimeString()} (IST)</span>
                                </div>
                            </div>

                            {/* Reason Dropdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#94a3b8' }}>Select Dispute Reason</label>
                                <select
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    style={{
                                        padding: '6px',
                                        fontSize: '10px',
                                        borderRadius: '4px',
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="Breakdown / Flat Tire">🔧 Breakdown / Flat Tire</option>
                                    <option value="Medical Emergency / Ambulance">🚑 Medical Emergency / Ambulance</option>
                                    <option value="Wrongful Detection (E.g. moving traffic)">🚫 Wrongful Detection</option>
                                    <option value="Other">📝 Other (Describe below)</option>
                                </select>
                            </div>

                            {/* Explanation Textarea */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#94a3b8' }}>Explanation / Context</label>
                                <textarea
                                    placeholder="Explain why your vehicle was stopped here. For emergency/breakdown, detail the situation..."
                                    value={disputeDesc}
                                    onChange={(e) => setDisputeDesc(e.target.value)}
                                    style={{
                                        height: '60px',
                                        padding: '6px',
                                        fontSize: '9.5px',
                                        borderRadius: '4px',
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        color: 'white',
                                        resize: 'none'
                                    }}
                                />
                            </div>

                            {/* File Upload Area */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#94a3b8' }}>Attach Evidence (Medical Slip / Tow Invoice)</label>
                                <div 
                                    onClick={() => {
                                        const mockAttachments = ['medical_prescription_btp.pdf', 'tire_repair_bill.jpg', 'mechanic_receipt.png'];
                                        setDisputeAttachment(mockAttachments[Math.floor(Math.random() * mockAttachments.length)]);
                                    }}
                                    style={{
                                        border: '1.5px dashed #334155',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        textAlign: 'center',
                                        fontSize: '9px',
                                        color: '#64748b',
                                        backgroundColor: '#0f172a',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {disputeAttachment ? (
                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>📎 {disputeAttachment} (Ready)</span>
                                    ) : (
                                        <span>📤 Click to Upload Evidence File</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons footer */}
                        <div style={{
                            padding: '10px',
                            backgroundColor: '#1e293b',
                            borderTop: '1px solid #334155',
                            display: 'flex',
                            gap: '6px'
                        }}>
                            <button
                                onClick={() => setView('WHATSAPP')}
                                style={{
                                    flex: 1,
                                    padding: '8px 0',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    backgroundColor: 'transparent',
                                    color: '#94a3b8',
                                    border: '1px solid #334155',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitDispute}
                                disabled={!disputeDesc.trim()}
                                style={{
                                    flex: 1.5,
                                    padding: '8px 0',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    backgroundColor: disputeDesc.trim() ? '#10b981' : '#1e293b',
                                    color: disputeDesc.trim() ? 'white' : '#64748b',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: disputeDesc.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Submit Dispute
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* WhatsApp Chat Header */}
                        <div style={{
                            height: '50px',
                            backgroundColor: '#1f2c34',
                            color: '#e9edef',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 10px',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#ff9800',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '18px',
                                border: '1.5px solid #2a3942'
                            }}>
                                🚓
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e9edef' }}>BTP Enforcement</span>
                                <span style={{ fontSize: '8.5px', color: '#8696a0' }}>Online Dispatch Bot</span>
                            </div>

                            {/* Status badge */}
                            <div style={{
                                backgroundColor: isPaid ? '#00a884' : disputeStatus === 'APPROVED' ? '#00a884' : disputeStatus === 'UNDER_REVIEW' ? '#f59e0b' : '#d97706',
                                color: 'white',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {isPaid ? 'Paid' : disputeStatus === 'APPROVED' ? 'Released' : disputeStatus === 'UNDER_REVIEW' ? 'Reviewing' : truck.status.replace('_', ' ')}
                            </div>

                            {/* Minimize Button */}
                            {onToggleCollapse && (
                                <button 
                                    onClick={() => onToggleCollapse(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#8696a0',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        padding: '0 4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#e9edef'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#8696a0'}
                                    title="Minimize Chat"
                                >
                                    —
                                </button>
                            )}
                        </div>

                        {/* WhatsApp Chat Body */}
                        <div style={{
                            flex: 1,
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            overflowY: 'auto'
                        }}>
                            {/* Timestamp Tag */}
                            <div style={{
                                alignSelf: 'center',
                                backgroundColor: '#182229',
                                color: '#8696a0',
                                fontSize: '8.5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                                marginBottom: '4px'
                            }}>
                                TODAY
                            </div>

                            {/* Chat Bubble 1: Parking infraction detected */}
                            <div style={{
                                alignSelf: 'flex-start',
                                backgroundColor: '#202c33',
                                borderRadius: '0 10px 10px 10px',
                                padding: '8px 10px',
                                maxWidth: '85%',
                                fontSize: '10.5px',
                                color: '#d1d7db',
                                boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                lineHeight: 1.35
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#00a884', marginBottom: '2px', fontSize: '9px' }}>BTP VIOLATION REPORT</div>
                                Camera spotted your vehicle <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{truck.licensePlate}</span> parked illegally at <strong>{truck.assignedHotspotName || 'Bengaluru Corridor'}</strong>.
                                <div style={{ textAlign: 'right', fontSize: '7.5px', color: '#8696a0', marginTop: '3px' }}>8:10 PM</div>
                            </div>

                            {/* Chat Bubble 2: Tow Dispatch Alert */}
                            <div style={{
                                alignSelf: 'flex-start',
                                backgroundColor: '#202c33',
                                borderRadius: '0 10px 10px 10px',
                                padding: '8px 10px',
                                maxWidth: '85%',
                                fontSize: '10.5px',
                                color: '#d1d7db',
                                boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                lineHeight: 1.35
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#e11d48', marginBottom: '2px', fontSize: '9px' }}>TOW DISPATCHED</div>
                                BTP Tow Truck <strong>{truck.id}</strong> has been dispatched. 
                                <div style={{ margin: '6px 0', padding: '6px', backgroundColor: '#2a3942', border: '1px solid #37474f', borderRadius: '4px', color: '#ff9800', fontSize: '9.5px' }}>
                                    <strong>Notice:</strong> Once picked up, a ₹1,500 fine must be paid online to release your vehicle from custody.
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '7.5px', color: '#8696a0', marginTop: '3px' }}>8:11 PM</div>
                            </div>

                            {/* Status transition bubbles */}
                            {truck.status === 'EN_ROUTE' && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#202c33',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#d1d7db',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <strong>🚛 EN ROUTE:</strong> Tow truck is traveling to your location. 
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', color: '#00a884', fontWeight: 'bold', fontSize: '9px' }}>
                                        <span>📍 Tracking: {Math.round(truck.progress * 100)}% route traveled</span>
                                        <span>⏱️ ETA: {eta} seconds</span>
                                    </div>
                                </div>
                            )}

                            {(truck.status === 'ON_SITE') && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#2a2024',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#ffcdd2',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <strong>🚨 ARRIVED ON SITE:</strong> BTP Tow Crew has arrived at the vehicle. Locking tires and mounting to tow bed...
                                </div>
                            )}

                            {(truck.status === 'RETURNING' || truck.status === 'AT_DEPOT') && !isPaid && disputeStatus !== 'APPROVED' && !truck.recalled && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#2c1c1f',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#ffcdd2',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <strong>🚨 VEHICLE IMPOUNDED:</strong> Your vehicle has been secured and picked up. 
                                    <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#3d2629', borderRadius: '4px', color: '#ef5350' }}>
                                        <strong>Status:</strong> {truck.status === 'RETURNING' ? `In Transit to Yard (${Math.round((1 - truck.progress) * 100)}% route returning)` : 'Stored in BTP HQ Yard'}
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#ffb74d', marginTop: '5px', fontWeight: 'bold' }}>
                                        Pay the ₹1,500 challan below to authorize the immediate release of your vehicle.
                                    </div>
                                </div>
                            )}

                            {truck.status === 'RETURNING' && truck.recalled && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#1f2937',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#d1d7db',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <div style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: '2px', fontSize: '9px' }}>TOW CANCELLED</div>
                                    ⚠️ BTP Command has recalled the dispatched tow truck. Your vehicle was not impounded. Please relocate your vehicle immediately.
                                </div>
                            )}

                            {/* Dispute Status Alert Bubbles */}
                            {disputeStatus === 'UNDER_REVIEW' && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#2b2218',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#ffe0b2',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <strong>⚖️ DISPUTE UNDER REVIEW:</strong> The verifying officer is checking your submitted evidence. The tow process is paused.
                                    <div style={{ marginTop: '4px', padding: '4px', backgroundColor: '#3e2723', borderRadius: '3px', color: '#ffb74d', fontSize: '9px' }}>
                                        <strong>Status:</strong> Awaiting BTP Command verification.
                                    </div>
                                </div>
                            )}

                            {disputeStatus === 'APPROVED' && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#1b4d3e',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#e8f5e9',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <strong>✅ DISPUTE APPROVED:</strong> The BTP verifying officer has accepted your dispute ({disputeReason}). The fine is waived.
                                    <div style={{ marginTop: '4px', padding: '4px', backgroundColor: '#0b5c4b', borderRadius: '3px', color: '#a6d9cc', fontSize: '9px' }}>
                                        🟢 <strong>Waiver Issued:</strong> Vehicle released. Go collect your vehicle from its home depot without penalty.
                                    </div>
                                </div>
                            )}

                            {disputeStatus === 'REJECTED' && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#3e1b20',
                                    borderRadius: '0 10px 10px 10px',
                                    padding: '8px 10px',
                                    maxWidth: '85%',
                                    fontSize: '10.5px',
                                    color: '#ffebee',
                                    boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                    lineHeight: 1.35
                                }}>
                                    <strong>❌ DISPUTE REJECTED:</strong> The BTP verifying officer has rejected your evidence.
                                    <div style={{ fontSize: '9.2px', color: '#ff8a80', marginTop: '4px', fontWeight: 'bold' }}>
                                        Reason: Proof insufficient. You must pay the ₹1,500 challan immediately.
                                    </div>
                                </div>
                            )}

                            {/* Paid Success Messages */}
                            {isPaid && (
                                <>
                                    <div style={{
                                        alignSelf: 'flex-start',
                                        backgroundColor: '#0b5c4b',
                                        borderRadius: '0 10px 10px 10px',
                                        padding: '8px 10px',
                                        maxWidth: '85%',
                                        fontSize: '10.5px',
                                        color: '#e9edef',
                                        boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                        lineHeight: 1.35
                                    }}>
                                        <strong>💳 PAYMENT RECEIVED:</strong> ₹1,500 processed successfully via BTP UPI.
                                        <div style={{ fontSize: '8px', color: '#a6d9cc', marginTop: '3px' }}>Transaction ID: BTP-TXN-{5543000 + truck.id.charCodeAt(truck.id.length - 1) * 987 + (truck.assignedHotspotId || 0)}</div>
                                    </div>
                                    <div style={{
                                        alignSelf: 'flex-start',
                                        backgroundColor: '#0b5c4b',
                                        borderRadius: '0 10px 10px 10px',
                                        padding: '8px 10px',
                                        maxWidth: '85%',
                                        fontSize: '10.5px',
                                        color: '#e9edef',
                                        boxShadow: '0 1.5px 1px rgba(0,0,0,0.2)',
                                        lineHeight: 1.35
                                    }}>
                                        <strong>🏢 RELEASE ORDER ISSUED:</strong> Your vehicle has been released from BTP custody. 
                                        <div style={{ marginTop: '4px', padding: '4px', backgroundColor: '#128c7e', borderRadius: '3px', color: '#fff', fontSize: '9px' }}>
                                            📍 <strong>Collection Point:</strong> BTP HQ Depot, Queen's Road Yard. Show payment receipt to the yard guard.
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Simulated Citizen Inputs (Challan Actions) */}
                        {(truck.status === 'RETURNING' || truck.status === 'AT_DEPOT') && !isPaid && disputeStatus !== 'APPROVED' && !truck.recalled && (
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#1f2c34',
                                borderTop: '1px solid #2a3942',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                {disputeStatus === 'UNDER_REVIEW' ? (
                                    <div style={{
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: '#ffb74d',
                                        textAlign: 'center',
                                        padding: '8px 0',
                                        backgroundColor: '#202c33',
                                        borderRadius: '6px',
                                        border: '1px solid #37474f'
                                    }}>
                                        ⚖️ Dispute Under Officer Review
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            fontSize: '8.5px',
                                            fontWeight: 'bold',
                                            color: '#8696a0',
                                            textAlign: 'center',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Required Citizen Penalty Action
                                        </div>
                                        <button
                                            onClick={handlePayFine}
                                            style={{
                                                width: '100%',
                                                padding: '10px 4px',
                                                fontSize: '10.5px',
                                                fontWeight: 'bold',
                                                backgroundColor: '#00a884',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                boxShadow: '0 2px 4px rgba(0, 168, 132, 0.3)'
                                            }}
                                        >
                                            💳 Pay Impoundment Challan (₹1,500)
                                        </button>
                                        <button
                                            onClick={() => setView('DISPUTE_PORTAL')}
                                            style={{
                                                width: '100%',
                                                padding: '7px 4px',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                backgroundColor: 'transparent',
                                                color: '#8696a0',
                                                border: '1px solid #37474f',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            ⚖️ Dispute Violation Fine
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Mock Payment Processing Overlay */}
                        {paymentOverlay && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(11, 20, 26, 0.9)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: 'white',
                                zIndex: 200,
                                gap: '12px'
                            }}>
                                <div className="payment-spinner" style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '3px solid rgba(255,255,255,0.1)',
                                    borderTop: '3px solid #00a884',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px', color: '#e9edef' }}>Processing UPI Challan Payment...</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Spinner and Animations CSS */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

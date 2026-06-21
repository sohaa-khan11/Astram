import React, { useState, useEffect, useRef } from 'react';
import { Map3D } from '../components/Map3D';
import { navigate } from '../router';
import type { TowTruck } from '../App';
import { EDGE_ROAD_NAMES } from '../App';
import { Shield, Clock, ArrowLeft, Terminal, Radio, Play, Pause, Send, Check } from 'lucide-react';

interface TrafficDispatchPageProps {
  towTrucks: TowTruck[];
  congestionLevels: Record<string, 'GREEN' | 'AMBER' | 'RED'>;
  handleRecallTowTruck: (truckId: string) => void;
  setCongestionLevels: React.Dispatch<React.SetStateAction<Record<string, 'GREEN' | 'AMBER' | 'RED'>>>;
  truckId: string | null;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  message: string;
}

export const TrafficDispatchPage: React.FC<TrafficDispatchPageProps> = ({
  towTrucks,
  congestionLevels,
  handleRecallTowTruck,
  setCongestionLevels,
  truckId
}) => {
  const truck = towTrucks.find(t => t.id === truckId);

  // Status definitions
  const isEnRoute = truck?.status === 'EN_ROUTE';
  const isOnSite = truck?.status === 'ON_SITE';
  const isReturning = truck?.status === 'RETURNING';
  const isAtDepot = truck?.status === 'AT_DEPOT';
  let statusColor = '#10b981';
  let statusBg = 'rgba(16, 185, 129, 0.15)';
  let statusText = 'AVAILABLE';

  if (isEnRoute) {
    statusColor = '#f59e0b';
    statusBg = 'rgba(245, 158, 11, 0.15)';
    statusText = 'EN ROUTE';
  } else if (isOnSite) {
    statusColor = '#ef4444';
    statusBg = 'rgba(239, 68, 68, 0.15)';
    statusText = 'ON SITE';
  } else if (isReturning) {
    statusColor = '#3b82f6';
    statusBg = 'rgba(59, 130, 246, 0.15)';
    statusText = 'RETURNING';
  } else if (isAtDepot) {
    statusColor = '#a855f7';
    statusBg = 'rgba(168, 85, 247, 0.15)';
    statusText = 'AT DEPOT';
  }

  // If no truck is found, show placeholder
  if (!truck || !truck.assignedEdgeId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        color: 'var(--neu-text-secondary)',
        padding: '2rem',
        textAlign: 'center',
        background: 'linear-gradient(145deg, var(--neu-bg-primary), var(--neu-bg-secondary))'
      }}>
        <span style={{ fontSize: '48px', marginBottom: '1rem' }}>🚛</span>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--neu-text-primary)' }}>No Active Traffic Dispatch Tracked</h3>
        <p style={{ maxWidth: '400px', fontSize: '13px', margin: '0 0 1.5rem 0', color: 'var(--neu-text-secondary)' }}>
          Select an active BTP tow truck from the Live Traffic Map or Tow Fleet Bay to monitor its bottleneck clearance route.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('present-map')}>
          Go to Live Traffic Map
        </button>
      </div>
    );
  }

  const edgeId = truck.assignedEdgeId;
  const roadName = truck.assignedHotspotName || EDGE_ROAD_NAMES[edgeId] || `Segment ${edgeId}`;

  // State for operational terminal logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  
  // State for broadcast simulation
  const [broadcastActive, setBroadcastActive] = useState<Record<string, boolean>>({
    google: true,
    waze: true,
    mappls: true,
    btp: true
  });
  
  // State for signal timing override
  const [signalOverrideSec, setSignalOverrideSec] = useState<number>(45);
  const [signalOverrideActive, setSignalOverrideActive] = useState(false);

  // CCTV Canvas simulation states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cctvPaused, setCctvPaused] = useState(false);

  const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Initialize Logs
  useEffect(() => {
    const time = formatTime();
    setLogs([
      { timestamp: time, level: 'INFO', message: `BTP Tactical Command initiated traffic clearance session.` },
      { timestamp: time, level: 'WARNING', message: `Obstruction detected on ${roadName} (ID: ${edgeId.toUpperCase()}).` },
      { timestamp: time, level: 'INFO', message: `Dispatch signal sent to Tow Unit ${truck.id} (Plate: ${truck.licensePlate}).` },
      { timestamp: time, level: 'INFO', message: `Route calculated: ${truck.depotName} ➔ ${roadName}. Distance: 4.8 km.` },
      { timestamp: time, level: 'WARNING', message: `Google Maps and Waze traffic feeds alerted. API broadcast active.` }
    ]);
  }, [truckId]);

  // Handle truck progress logs
  const progressRef = useRef<number>(-1);
  useEffect(() => {
    if (truck.progress === progressRef.current) return;
    progressRef.current = truck.progress;

    const time = formatTime();
    if (truck.status === 'EN_ROUTE' && truck.progress > 0.05 && truck.progress < 0.9) {
      // Add periodic updates
      const percent = Math.round(truck.progress * 100);
      if (percent % 25 === 0) {
        setLogs(prev => [
          ...prev,
          { timestamp: time, level: 'INFO', message: `Unit ${truck.id} transit progress: ${percent}% en route.` }
        ]);
      }
    } else if (truck.status === 'ON_SITE') {
      setLogs(prev => {
        // Avoid duplicates
        if (prev.some(l => l.message.includes('arrived on site'))) return prev;
        return [
          ...prev,
          { timestamp: time, level: 'CRITICAL', message: `Unit ${truck.id} arrived on site. Blockage hooked up. Commencing physical clearance.` }
        ];
      });
    } else if (truck.status === 'RETURNING') {
      setLogs(prev => {
        if (prev.some(l => l.message.includes('Roadway cleared'))) return prev;
        return [
          ...prev,
          { timestamp: time, level: 'SUCCESS', message: `Roadway cleared on ${roadName}. Congestion index status reset to normal.` },
          { timestamp: time, level: 'INFO', message: `Unit ${truck.id} returning to home depot.` }
        ];
      });
    }
  }, [truck.status, truck.progress]);

  // Auto-scroll logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // CCTV Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: {x: number, y: number, speed: number, size: number}[] = [];
    
    // Create dust particles for thermal/radar look
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.2 + Math.random() * 0.5,
        size: 1 + Math.random() * 2
      });
    }

    const drawCCTV = () => {
      if (!ctx || !canvas) return;

      // Dark futuristic radar background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw green radar grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'; // Light blue radar line
      ctx.lineWidth = 1;
      
      // Vertical grid lines
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw radar scan sweep line
      const scanY = (Date.now() / 15) % canvas.height;
      let scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY);
      scanGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      scanGrad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 40, canvas.width, 40);
      
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      // Render static background obstacles (Road sides)
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.fillRect(0, 0, 80, canvas.height); // Left divider
      ctx.fillRect(canvas.width - 80, 0, 80, canvas.height); // Right shoulder

      // Render lanes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]);
      
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw noise particles
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      particles.forEach(p => {
        if (!cctvPaused) {
          p.y += p.speed;
          if (p.y > canvas.height) p.y = 0;
        }
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      // Draw the Broken-Down Obstruction (stationary/moving in center of the road)
      const flash = Math.floor(Date.now() / 400) % 2 === 0;
      const obsX = canvas.width / 2 - 10;
      let obsY = canvas.height / 2 - 20;
      if (truck?.status === 'EN_ROUTE') {
        // Move slowly down the screen (vertical road direction)
        obsY = 50 + ((Date.now() / 80) % (canvas.height - 150));
      }


      // Draw obstruction shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(obsX + 25, obsY + 35, 45, 12, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Draw the vehicle body (Simulated broken-down double-decker BMTC Bus or heavy vehicle)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(obsX - 20, obsY - 10, 90, 45);
      ctx.strokeRect(obsX - 20, obsY - 10, 90, 45);

      // Warning hazard lines on obstacle
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let offset = -15; offset < 80; offset += 15) {
        ctx.moveTo(obsX - 20 + offset, obsY + 35);
        ctx.lineTo(obsX - 10 + offset, obsY - 10);
      }
      ctx.stroke();

      // Draw hazard lights
      if (flash) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(obsX - 15, obsY + 22, 6, 0, 2 * Math.PI);
        ctx.arc(obsX + 65, obsY + 22, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.strokeRect(obsX - 25, obsY - 15, 100, 55);
        ctx.shadowBlur = 0;
      }

      // Draw label overlay
      const labelText = truck?.status === 'EN_ROUTE' 
        ? '🚧 BMTC BUS (MOVING @ 8 km/h)' 
        : '🚧 BLOCKAGE: BMTC BUS';
      const labelWidth = truck?.status === 'EN_ROUTE' ? 180 : 140;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(obsX - labelWidth / 2 + 25, obsY - 45, labelWidth, 25);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(obsX - labelWidth / 2 + 25, obsY - 45, labelWidth, 25);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(labelText, obsX - labelWidth / 2 + 32, obsY - 29);

      // Tow truck hook visualization if on site
      if (truck.status === 'ON_SITE') {
        const towX = obsX + 110;
        const towY = obsY;

        // Draw tow truck hook arm
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(towX, towY + 20);
        ctx.lineTo(obsX + 70, obsY + 20);
        ctx.stroke();

        // Draw BTP Tow Truck body
        ctx.fillStyle = '#f97316';
        ctx.fillRect(towX, towY - 5, 50, 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(truck.id, towX + 5, towY + 15);

        // Tow Status banner
        ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
        ctx.fillRect(20, 20, 240, 24);
        ctx.strokeStyle = '#f97316';
        ctx.strokeRect(20, 20, 240, 24);
        ctx.fillStyle = '#fdba74';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`● TOW UNIT ${truck.id} COUPLING ACTIVE`, 30, 35);
      }

      // Camera HUD Overlays
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      
      // Corners
      ctx.beginPath(); ctx.moveTo(15, 15); ctx.lineTo(35, 15); ctx.moveTo(15, 15); ctx.lineTo(15, 35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(canvas.width - 15, 15); ctx.lineTo(canvas.width - 35, 15); ctx.moveTo(canvas.width - 15, 15); ctx.lineTo(canvas.width - 15, 35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, canvas.height - 15); ctx.lineTo(35, canvas.height - 15); ctx.moveTo(15, canvas.height - 15); ctx.lineTo(15, canvas.height - 35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(canvas.width - 15, canvas.height - 15); ctx.lineTo(canvas.width - 35, canvas.height - 15); ctx.moveTo(canvas.width - 15, canvas.height - 15); ctx.lineTo(canvas.width - 15, canvas.height - 35); ctx.stroke();

      // REC label
      ctx.fillStyle = flash ? '#ef4444' : 'transparent';
      ctx.beginPath(); ctx.arc(canvas.width - 90, 30, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('LIVE CCTV', 25, 32);
      ctx.fillText('REC FEED', canvas.width - 80, 34);

      if (!cctvPaused) {
        animationFrameId = requestAnimationFrame(drawCCTV);
      }
    };

    drawCCTV();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [truck.status, cctvPaused]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const time = formatTime();
    const cmd = inputText.trim();

    // Log the operator input
    setLogs(prev => [
      ...prev,
      { timestamp: time, level: 'INFO', message: `[OPERATOR] ${cmd}` }
    ]);
    setInputText('');

    // Simulate responses or trigger features based on keywords
    setTimeout(() => {
      const responseTime = formatTime();
      if (cmd.toLowerCase().includes('clear') || cmd.toLowerCase().includes('green')) {
        // Reset the congestion level
        setCongestionLevels(prev => ({
          ...prev,
          [edgeId]: 'GREEN'
        }));
        setLogs(prev => [
          ...prev,
          { timestamp: responseTime, level: 'SUCCESS', message: `Manual override executed. Congestion level of ${roadName} set to GREEN.` }
        ]);
      } else if (cmd.toLowerCase().includes('status') || cmd.toLowerCase().includes('info')) {
        setLogs(prev => [
          ...prev,
          { 
            timestamp: responseTime, 
            level: 'INFO', 
            message: `Telemetry Diagnostic: Unit: ${truck.id} | Status: ${truck.status} | Progress: ${(truck.progress * 100).toFixed(1)}% | Destination: ${roadName}.` 
          }
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          { timestamp: responseTime, level: 'INFO', message: `Terminal command logged. Broadcasting to BTP database.` }
        ]);
      }
    }, 800);
  };

  const toggleBroadcast = (provider: string) => {
    setBroadcastActive(prev => {
      const next = { ...prev, [provider]: !prev[provider] };
      const time = formatTime();
      const statusStr = next[provider] ? 'ENABLED' : 'DISABLED';
      setLogs(l => [
        ...l,
        { timestamp: time, level: 'WARNING', message: `Navigation network broadcast to ${provider.toUpperCase()} has been ${statusStr}.` }
      ]);
      return next;
    });
  };

  const handleApplySignalOverride = () => {
    setSignalOverrideActive(true);
    const time = formatTime();
    setLogs(prev => [
      ...prev,
      { timestamp: time, level: 'SUCCESS', message: `Signal Override command dispatched. Added +${signalOverrideSec}s to green phases on intersecting arterial nodes.` }
    ]);

    setTimeout(() => {
      setSignalOverrideActive(false);
    }, 5000);
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', backgroundColor: 'var(--neu-bg-primary)', color: 'var(--neu-text-primary)' }}>
      
      {/* LEFT COLUMN: Map & Terminal Logs */}
      <div style={{
        flex: 1.3,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--neu-shadow-dark)',
        height: '100%'
      }}>
        
        {/* Navigation / Header bar */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--neu-bg-secondary)',
          borderBottom: '1px solid var(--neu-shadow-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button 
            onClick={() => navigate('present-map')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--neu-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}
          >
            <ArrowLeft size={16} /> Live Map
          </button>
          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--neu-shadow-dark)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>BTP Traffic Clearance Workspace</span>
            <span style={{ fontSize: '10px', color: 'var(--neu-text-secondary)' }}>Tracking Dispatch: {truck.id} ➔ {roadName}</span>
          </div>
        </div>

        {/* Mini Route Tracking Map */}
        <div style={{ height: '38%', position: 'relative', borderBottom: '1px solid var(--neu-shadow-dark)' }}>
          <Map3D 
            hotspots={[]}
            selectedId={null}
            onSelect={() => {}}
            interventions={new Map()}
            towTrucks={[truck]}
            congestionLevels={congestionLevels}
            minImpactScore={0.0}
            onMinImpactScoreChange={() => {}}
            isSidebarCollapsed={true}
            showTrafficOnly={true}
          />
          
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'var(--neu-bg-primary)',
            border: '1px solid var(--neu-shadow-dark)',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '9.5px',
            color: 'var(--neu-primary)',
            fontWeight: 'bold',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '4px 4px 8px var(--neu-shadow-dark)'
          }}>
            <Radio size={12} className="pulse" style={{ color: 'var(--enforcement-red)' }} />
            <span>ROUTE TELEMETRY LINK ACTIVE</span>
          </div>
        </div>

        {/* BTP Operational Terminal */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#020617', // Pitch dark
          fontFamily: 'monospace'
        }}>
          
          {/* Terminal Title Header */}
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#cbd5e1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={14} style={{ color: '#38bdf8' }} />
              <span>BTP OPERATIONS TERMINAL TELEMETRY</span>
            </div>
            <span style={{ color: '#64748b' }}>TTY/01 - SECURE</span>
          </div>

          {/* Terminal Log Area */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '11px',
            lineHeight: '1.4'
          }}>
            {logs.map((log, idx) => {
              let color = '#94a3b8';
              if (log.level === 'WARNING') color = '#fbbf24'; // Yellow
              if (log.level === 'CRITICAL') color = '#f87171'; // Red
              if (log.level === 'SUCCESS') color = '#4ade80'; // Green
              
              return (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#475569' }}>[{log.timestamp}]</span>
                  <span style={{ color, fontWeight: 'bold' }}>[{log.level}]</span>
                  <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Command Input */}
          <form 
            onSubmit={handleCommandSubmit}
            style={{
              padding: '12px',
              borderTop: '1px solid #1e293b',
              backgroundColor: '#090d16',
              display: 'flex',
              gap: '8px'
            }}
          >
            <span style={{ color: '#38bdf8', alignSelf: 'center', paddingLeft: '4px' }}>$</span>
            <input 
              type="text"
              placeholder="Enter terminal overrides (e.g. 'clear segment', 'status')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                outline: 'none',
                padding: '4px 0'
              }}
            />
            <button 
              type="submit"
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px'
              }}
              title="Execute Command"
            >
              <Send size={14} />
            </button>
          </form>

        </div>

      </div>

      {/* RIGHT COLUMN: CCTV Feed & Broadcast Controls */}
      <div style={{
        flex: 1,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto'
      }}>
        
        {/* CCTV Mock Feed Block */}
        <div className="card" style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} style={{ color: 'var(--enforcement-red)' }} />
              <span style={{ fontSize: '11.5px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--neu-text-primary)' }}>CCTV Diagnostic Stream</span>
            </div>
            <button 
              onClick={() => setCctvPaused(!cctvPaused)}
              className="btn btn-outline"
              style={{
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                width: 'auto'
              }}
            >
              {cctvPaused ? <Play size={10} /> : <Pause size={10} />}
              <span>{cctvPaused ? 'Resume' : 'Pause'}</span>
            </button>
          </div>

          {/* Canvas Video Block */}
          <div style={{ position: 'relative', width: '100%', height: '240px', backgroundColor: '#090a0f', borderRadius: '4px', overflow: 'hidden' }}>
            <canvas 
              ref={canvasRef} 
              width={640} 
              height={320}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>

        {/* Tow Truck Telemetry Widget */}
        <div className="card" style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--neu-shadow-dark)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--neu-text-secondary)', fontWeight: 'bold' }}>TOW UNIT STATUS</span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 'bold', 
              padding: '2px 6px', 
              borderRadius: '4px',
              backgroundColor: statusBg,
              color: statusColor
            }}>
              {statusText}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11.5px' }}>
            <div>
              <span style={{ color: 'var(--neu-text-secondary)' }}>Tow License:</span>
              <div style={{ fontWeight: 'bold', color: 'var(--neu-text-primary)', fontFamily: 'monospace' }}>{truck.licensePlate}</div>
            </div>
            <div>
              <span style={{ color: 'var(--neu-text-secondary)' }}>Depot Area:</span>
              <div style={{ fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>{truck.depotName}</div>
            </div>
            <div>
              <span style={{ color: 'var(--neu-text-secondary)' }}>Transit Progress:</span>
              <div style={{ fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>{(truck.progress * 100).toFixed(0)}%</div>
            </div>
            <div>
              <span style={{ color: 'var(--neu-text-secondary)' }}>Blockage Road:</span>
              <div style={{ fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>{roadName}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => handleRecallTowTruck(truck.id)}
              className="btn btn-outline"
              style={{
                flex: 1,
                fontSize: '11px',
                padding: '8px',
                color: 'var(--enforcement-red)',
                fontWeight: 'bold'
              }}
            >
              Recall Unit to Depot
            </button>
          </div>
        </div>

        {/* Signal Timing Override Panel */}
        <div className="card" style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} style={{ color: 'var(--neu-primary)' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>Arterial Signal Override</span>
          </div>

          <p style={{ fontSize: '10.5px', color: 'var(--neu-text-secondary)', margin: 0 }}>
            Adjust green light timings on intersecting nodes to drain congested traffic spillover faster.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="range" 
              min="10" 
              max="90" 
              step="5"
              value={signalOverrideSec}
              onChange={(e) => setSignalOverrideSec(parseInt(e.target.value))}
              style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--neu-primary)' }}
            />
            <span className="mono" style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '40px', textAlign: 'right', color: 'var(--neu-text-primary)' }}>
              +{signalOverrideSec}s
            </span>
          </div>

          <button 
            onClick={handleApplySignalOverride}
            disabled={signalOverrideActive}
            className={signalOverrideActive ? "btn btn-outline" : "btn btn-primary"}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: signalOverrideActive ? 'default' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {signalOverrideActive ? <Check size={12} /> : null}
            {signalOverrideActive ? 'Timings Dispatched' : 'Apply Timing Override'}
          </button>
        </div>

        {/* Global Navigation Broadcast Network */}
        <div className="card" style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={15} style={{ color: 'var(--signal-amber)' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--neu-text-primary)' }}>Navigation Broadcast Controls</span>
          </div>

          <p style={{ fontSize: '10.5px', color: 'var(--neu-text-secondary)', margin: 0 }}>
            Broadcast obstruction data to consumer mapping networks to force routing modifications.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Google Maps Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--neu-bg-primary)', border: '1px solid var(--neu-shadow-dark)', borderRadius: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--neu-text-primary)' }}>Google Maps Ingestion API</span>
              <button 
                onClick={() => toggleBroadcast('google')}
                className={broadcastActive.google ? "btn btn-primary" : "btn btn-outline"}
                style={{
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: 'auto'
                }}
              >
                {broadcastActive.google ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>

            {/* Waze Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--neu-bg-primary)', border: '1px solid var(--neu-shadow-dark)', borderRadius: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--neu-text-primary)' }}>Waze Partner Feed</span>
              <button 
                onClick={() => toggleBroadcast('waze')}
                className={broadcastActive.waze ? "btn btn-primary" : "btn btn-outline"}
                style={{
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: 'auto'
                }}
              >
                {broadcastActive.waze ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>

            {/* MapmyIndia Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--neu-bg-primary)', border: '1px solid var(--neu-shadow-dark)', borderRadius: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--neu-text-primary)' }}>MapmyIndia Mappls Network</span>
              <button 
                onClick={() => toggleBroadcast('mappls')}
                className={broadcastActive.mappls ? "btn btn-primary" : "btn btn-outline"}
                style={{
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: 'auto'
                }}
              >
                {broadcastActive.mappls ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>

            {/* BTP Citizen Portal Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--neu-bg-primary)', border: '1px solid var(--neu-shadow-dark)', borderRadius: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--neu-text-primary)' }}>BTP Public Advisory Portal</span>
              <button 
                onClick={() => toggleBroadcast('btp')}
                className={broadcastActive.btp ? "btn btn-primary" : "btn btn-outline"}
                style={{
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: 'auto'
                }}
              >
                {broadcastActive.btp ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

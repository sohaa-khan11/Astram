import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Clock,
  List, 
  Truck, 
  ShieldAlert, 
  Cpu, 
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';
import { navigate } from '../router';
import type { Route } from '../router';
import type { TowTruck } from '../App';

interface SidebarProps {
  active: Route;
  towTrucks: TowTruck[];
}

export const Sidebar: React.FC<SidebarProps> = ({ active, towTrucks }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') return false;
    return true; // default to dark
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const menuItems = [
    { id: 'present-map', label: 'Present Violations', icon: Map },
    { id: 'historical-map', label: 'Historical Violations', icon: Clock },
    { id: 'hotspots', label: 'Hotspot Priorities', icon: List },
    { id: 'tow-fleet', label: 'Tow Fleet Bay', icon: Truck },
    { id: 'triage', label: 'Triage Queue', icon: ShieldAlert },
    { id: 'sandbox', label: 'Detection Sandbox', icon: Cpu },
    { id: 'analytics', label: 'City Analytics', icon: BarChart3 },
  ] as const;

  // Aggregate fleet stats
  const total = towTrucks.length;
  const available = towTrucks.filter(t => t.status === 'AVAILABLE').length;
  const transit = towTrucks.filter(t => t.status === 'EN_ROUTE' || t.status === 'RETURNING').length;
  const onSite = towTrucks.filter(t => t.status === 'ON_SITE').length;
  const atDepot = towTrucks.filter(t => t.status === 'AT_DEPOT').length;

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="sidebar-logo">
            ASTraM <span>Console</span>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--neu-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'var(--neu-bg-secondary)',
              boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
              transition: 'all var(--transition-fast)'
            }}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="neu-btn"
          >
            {isDark ? <Sun size={14} style={{ color: '#fbbf24' }} /> : <Moon size={14} style={{ color: '#38bdf8' }} />}
          </button>
        </div>
        <div className="sidebar-subtitle">BTP COMMAND CENTER</div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.id);
              }}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="sidebar-icon" />
              <span className="sidebar-label">{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div 
        className="sidebar-footer"
        onClick={() => navigate('tow-fleet')}
        style={{ cursor: 'pointer' }}
        title="View Tow Fleet Details"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px', color: 'var(--neu-text-secondary)', marginBottom: '4px' }}>
          <span>🚛 FLEET</span>
          <span>{available} / {total} FREE</span>
        </div>
        <div className="mono" style={{ fontSize: '10px', color: 'var(--neu-text-primary)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#4ade80' }}>{available}A</span>
          <span style={{ color: '#38bdf8' }}>{transit}T</span>
          <span style={{ color: '#f87171' }}>{onSite}S</span>
          <span style={{ color: '#c084fc' }}>{atDepot}D</span>
        </div>
      </div>
    </aside>
  );
};

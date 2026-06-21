import React from 'react';
import { SandboxPanel } from '../components/SandboxPanel';
import type { TowTruck } from '../App';

interface SandboxPageProps {
  towTrucks: TowTruck[];
}

export const SandboxPage: React.FC<SandboxPageProps> = ({ towTrucks }) => {
  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <SandboxPanel towTrucks={towTrucks} />
    </div>
  );
};

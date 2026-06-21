import React from 'react';
import { TriagePanel } from '../components/TriagePanel';
import type { TriageRecord } from '../lib/api';

interface TriagePageProps {
  queue: TriageRecord[];
  onAction: (id: string, action: string) => void;
}

export const TriagePage: React.FC<TriagePageProps> = ({ queue, onAction }) => {
  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <TriagePanel queue={queue} onAction={onAction} />
    </div>
  );
};

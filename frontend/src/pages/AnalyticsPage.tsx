import React from 'react';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import type { Hotspot, Summary } from '../lib/api';

interface AnalyticsPageProps {
  hotspots: Hotspot[];
  summary: Summary | null;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ hotspots, summary }) => {
  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <AnalyticsPanel hotspots={hotspots} summary={summary} />
    </div>
  );
};

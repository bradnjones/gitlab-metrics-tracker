/**
 * MetricsSummary Component
 *
 * Displays a grid of metric summary cards showing the most recent value
 * for each core metric. Positioned at the top of the dashboard to provide
 * at-a-glance insights without scrolling.
 *
 * Design specifications from prototype:
 * - Grid: auto-fit, minmax(200px, 1fr) - responsive wrapping
 * - Gap: 1.5rem between cards
 * - Bottom margin: 2rem (separates from charts)
 * - Shows last sprint values only (not aggregated)
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.selectedIterations - Selected iteration objects
 * @returns {JSX.Element} Grid of metric summary cards
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import MetricSummaryCard from './MetricSummaryCard.jsx';
import {
  getLastValue,
  formatDays,
  formatHours,
  formatFrequency,
  formatPercentage
} from '../utils/metricFormatters.js';

/**
 * Responsive grid container for metric summary cards
 *
 * @component
 */
const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.md};
  }
`;

/**
 * MetricsSummary Component
 *
 * @param {Object} props
 * @param {Array<Object>} props.selectedIterations - Selected iterations
 * @returns {JSX.Element} Rendered component
 */
export default function MetricsSummary({ selectedIterations }) {
  const [velocityData, setVelocityData] = useState(null);
  const [cycleTimeData, setCycleTimeData] = useState(null);
  const [deployFreqData, setDeployFreqData] = useState(null);
  const [leadTimeData, setLeadTimeData] = useState(null);
  const [mttrData, setMttrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all metric data
  useEffect(() => {
    if (!selectedIterations || selectedIterations.length === 0) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const iterationIds = selectedIterations.map(iter => iter.id).join(',');

        // Fetch all metrics in parallel
        const [velocity, cycleTime, deployFreq, leadTime, mttr] = await Promise.all([
          fetch(`/api/metrics/velocity?iterations=${iterationIds}`).then(r => r.json()),
          fetch(`/api/metrics/cycle-time?iterations=${iterationIds}`).then(r => r.json()),
          fetch(`/api/metrics/deployment-frequency?iterations=${iterationIds}`).then(r => r.json()),
          fetch(`/api/metrics/lead-time?iterations=${iterationIds}`).then(r => r.json()),
          fetch(`/api/metrics/mttr?iterations=${iterationIds}`).then(r => r.json())
        ]);

        // Extract metrics arrays from API responses
        console.log('[MetricsSummary] Raw API responses:', {
          velocity: velocity,
          cycleTime: cycleTime,
          deployFreq: deployFreq,
          leadTime: leadTime,
          mttr: mttr
        });

        setVelocityData(velocity.metrics || []);
        setCycleTimeData(cycleTime.metrics || []);
        setDeployFreqData(deployFreq.metrics || []);
        setLeadTimeData(leadTime.metrics || []);
        setMttrData(mttr.metrics || []);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedIterations]);

  // Don't render if no data or still loading
  if (loading) {
    return null;
  }

  // Don't render if velocityData hasn't been set yet
  if (velocityData === null) {
    return null;
  }

  if (error) {
    console.error('MetricsSummary error:', error);
    return null; // Silently fail - charts will still render
  }

  // Sort arrays by dueDate to ensure we get the most recent sprint
  const sortedVelocity = [...velocityData].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const sortedCycleTime = [...cycleTimeData].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const sortedDeployFreq = [...deployFreqData].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const sortedLeadTime = [...leadTimeData].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const sortedMttr = [...mttrData].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Extract last values from sorted metrics arrays (most recent sprint)
  const lastVelocityPoints = getLastValue(sortedVelocity, 'completedPoints');
  const lastVelocityStories = getLastValue(sortedVelocity, 'completedStories');
  const lastCycleTime = getLastValue(sortedCycleTime, 'cycleTimeAvg');
  const lastDeployFreq = getLastValue(sortedDeployFreq, 'deploymentFrequency');
  const lastLeadTime = getLastValue(sortedLeadTime, 'leadTimeAvg');
  const lastMttr = getLastValue(sortedMttr, 'mttrAvg');

  console.log('[MetricsSummary] Data arrays:', {
    velocityData,
    cycleTimeData,
    deployFreqData,
    leadTimeData,
    mttrData
  });

  console.log('[MetricsSummary] SORTED velocity array:', sortedVelocity);
  const lastSortedItem = sortedVelocity[sortedVelocity.length - 1];
  console.log('[MetricsSummary] Last SORTED velocity item:', lastSortedItem);
  console.log('[MetricsSummary] Last sorted item values:', {
    dueDate: lastSortedItem?.dueDate,
    completedPoints: lastSortedItem?.completedPoints,
    completedStories: lastSortedItem?.completedStories
  });

  console.log('[MetricsSummary] Last items in arrays:', {
    lastVelocityItem: velocityData[velocityData.length - 1],
    lastCycleTimeItem: cycleTimeData[cycleTimeData.length - 1],
    lastDeployFreqItem: deployFreqData[deployFreqData.length - 1],
    lastLeadTimeItem: leadTimeData[leadTimeData.length - 1],
    lastMttrItem: mttrData[mttrData.length - 1]
  });

  console.log('[MetricsSummary] Extracted values:', {
    lastVelocityPoints,
    lastVelocityStories,
    lastCycleTime,
    lastDeployFreq,
    lastLeadTime,
    lastMttr
  });

  // Format velocity as "X pts / Y stories"
  const velocityValue = (lastVelocityPoints !== null && lastVelocityStories !== null)
    ? `${lastVelocityPoints} pts / ${lastVelocityStories} stories`
    : 'N/A';

  return (
    <SummaryGrid>
      <MetricSummaryCard
        label="Last Sprint Velocity"
        value={velocityValue}
      />
      <MetricSummaryCard
        label="Last Sprint Cycle Time"
        value={lastCycleTime !== null ? formatDays(lastCycleTime) : 'N/A'}
      />
      <MetricSummaryCard
        label="Last Sprint Deploy Freq"
        value={lastDeployFreq !== null ? formatFrequency(lastDeployFreq) : 'N/A'}
      />
      <MetricSummaryCard
        label="Last Sprint Lead Time"
        value={lastLeadTime !== null ? formatDays(lastLeadTime) : 'N/A'}
      />
      <MetricSummaryCard
        label="Last Sprint MTTR"
        value={lastMttr !== null ? formatHours(lastMttr) : 'N/A'}
      />
    </SummaryGrid>
  );
}

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
import { apiFetch } from '../utils/apiFetch.js';
import styled from 'styled-components';
import MetricSummaryCard from './MetricSummaryCard.jsx';
import {
  getLastValue,
  formatDays,
  formatHours,
  formatFrequency,
  formatPercentage
} from '../utils/metricFormatters.js';

/** @type {Record<string, { description: string, goodDirection: 'up'|'down', goodLabel: string }>} */
const METRIC_TOOLTIPS = {
  velocity: {
    description: 'Story points and issues completed in a sprint. Measures team output and throughput over time.',
    goodDirection: 'up',
    goodLabel: 'increasing velocity indicates growing throughput and team capacity',
  },
  cycleTime: {
    description: 'Average time from when work starts to when it is delivered. Measures flow efficiency and execution speed.',
    goodDirection: 'down',
    goodLabel: 'lower cycle time means faster feedback loops and reduced delivery risk',
  },
  deployFreq: {
    description: 'How often code is released to production. Frequent small releases reduce batch size and deployment risk.',
    goodDirection: 'up',
    goodLabel: 'higher frequency signals a healthy, low-risk delivery pipeline',
  },
  leadTime: {
    description: 'Time from first commit to production deployment. Measures end-to-end delivery speed from code to customer.',
    goodDirection: 'down',
    goodLabel: 'shorter lead time means faster delivery of value and quicker response to feedback',
  },
  mttr: {
    description: 'Mean Time to Recovery — how quickly the team restores service after an incident. Reflects operational maturity.',
    goodDirection: 'down',
    goodLabel: 'lower MTTR limits user impact and indicates strong incident response practices',
  },
};

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
          apiFetch(`/api/metrics/velocity?iterations=${iterationIds}`).then(r => r.json()),
          apiFetch(`/api/metrics/cycle-time?iterations=${iterationIds}`).then(r => r.json()),
          apiFetch(`/api/metrics/deployment-frequency?iterations=${iterationIds}`).then(r => r.json()),
          apiFetch(`/api/metrics/lead-time?iterations=${iterationIds}`).then(r => r.json()),
          apiFetch(`/api/metrics/mttr?iterations=${iterationIds}`).then(r => r.json())
        ]);

        // Extract metrics arrays from API responses
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

  // Filter to only completed sprints (dueDate in the past) and sort by dueDate
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const completedVelocity = velocityData
    .filter(item => new Date(item.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const completedCycleTime = cycleTimeData
    .filter(item => new Date(item.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const completedDeployFreq = deployFreqData
    .filter(item => new Date(item.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const completedLeadTime = leadTimeData
    .filter(item => new Date(item.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const completedMttr = mttrData
    .filter(item => new Date(item.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Extract last values from completed sprints (most recently completed sprint)
  const lastVelocityPoints = getLastValue(completedVelocity, 'completedPoints');
  const lastVelocityStories = getLastValue(completedVelocity, 'completedStories');
  const lastCycleTime = getLastValue(completedCycleTime, 'cycleTimeAvg');
  const lastDeployFreq = getLastValue(completedDeployFreq, 'deploymentFrequency');
  const lastLeadTime = getLastValue(completedLeadTime, 'leadTimeAvg');
  const lastMttr = getLastValue(completedMttr, 'mttrAvg');

  // Format velocity as "X pts / Y stories"
  const velocityValue = (lastVelocityPoints !== null && lastVelocityStories !== null)
    ? `${lastVelocityPoints} pts / ${lastVelocityStories} stories`
    : 'N/A';

  return (
    <SummaryGrid>
      <MetricSummaryCard
        label="Last Sprint Velocity"
        value={velocityValue}
        tooltip={METRIC_TOOLTIPS.velocity}
      />
      <MetricSummaryCard
        label="Last Sprint Cycle Time"
        value={lastCycleTime !== null ? formatDays(lastCycleTime) : 'N/A'}
        tooltip={METRIC_TOOLTIPS.cycleTime}
      />
      <MetricSummaryCard
        label="Last Sprint Deploy Freq"
        value={lastDeployFreq !== null ? formatFrequency(lastDeployFreq) : 'N/A'}
        tooltip={METRIC_TOOLTIPS.deployFreq}
      />
      <MetricSummaryCard
        label="Last Sprint Lead Time"
        value={lastLeadTime !== null ? formatDays(lastLeadTime) : 'N/A'}
        tooltip={METRIC_TOOLTIPS.leadTime}
      />
      <MetricSummaryCard
        label="Last Sprint MTTR"
        value={lastMttr !== null ? formatHours(lastMttr) : 'N/A'}
        tooltip={METRIC_TOOLTIPS.mttr}
      />
    </SummaryGrid>
  );
}

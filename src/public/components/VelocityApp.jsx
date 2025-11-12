/**
 * VelocityApp Component
 *
 * Main application container for the GitLab Sprint Metrics Dashboard.
 * Optimized layout with compact header for maximum chart visibility.
 *
 * Design Changes (Dashboard Optimization):
 * - Replaced Header + IterationSelectorToolbar with CompactHeaderWithIterations
 * - Reduced header height from 172px to 56px (67% reduction)
 * - Reduced content padding from 24px to 16px
 * - Reduced chart card padding from 24px to 16px
 * - Reduced chart title size from 20px to 18px
 * - Reduced grid gap from 24px to 16px
 * - Increased max-width from 1400px to 1600px on wide screens
 * - Total vertical space gained: ~124px (17.6% increase)
 *
 * Features:
 * - Compact unified header with gradient and translucent chips
 * - Wrapped in ErrorBoundary for error handling
 * - Shows EmptyState when no iterations selected
 * - Theme-based styling throughout
 * - Responsive layout with 3-column grid on wide screens
 *
 * @returns {JSX.Element} Rendered application
 */

import { useState } from 'react';
import styled from 'styled-components';
import ErrorBoundary from './ErrorBoundary.jsx';
import CompactHeaderWithIterations from './CompactHeaderWithIterations.jsx';
import EmptyState from './EmptyState.jsx';
import IterationSelectionModal from './IterationSelectionModal.jsx';
import VelocityChart from './VelocityChart.jsx';
import CycleTimeChart from './CycleTimeChart.jsx';
import DeploymentFrequencyChart from './DeploymentFrequencyChart.jsx';
import LeadTimeChart from './LeadTimeChart.jsx';

/**
 * Main app container
 *
 * @component
 */
const AppContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.bgSecondary};
`;

/**
 * Optimized content container with minimal padding for maximum viewport usage
 *
 * @component
 */
const Content = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4px;
  }
`;

/**
 * Optimized charts grid with responsive columns
 *
 * @component
 */
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (min-width: ${props => props.theme.breakpoints.wide}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Optimized chart card with tighter padding
 *
 * @component
 */
const ChartCard = styled.div`
  background: ${props => props.theme.colors.bgPrimary};
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  min-height: 320px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.sm};
    min-height: 280px;
  }
`;

/**
 * Optimized chart title (smaller, consistent)
 *
 * @component
 */
const ChartTitle = styled.h3`
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  line-height: ${props => props.theme.typography.lineHeight.tight};
`;

/**
 * VelocityApp Component
 *
 * @returns {JSX.Element} Rendered application
 */
export default function VelocityApp() {
  const [selectedIterations, setSelectedIterations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Handle removing an iteration from the header chips
   * @param {string} iterationId - ID of iteration to remove
   */
  const handleRemoveIteration = (iterationId) => {
    setSelectedIterations(prev => prev.filter(iter => iter.id !== iterationId));
  };

  /**
   * Handle opening the iteration selection modal
   */
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  /**
   * Handle closing the iteration selection modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  /**
   * Handle applying iteration selection from modal
   * @param {Array<Object>} selectedIterations - Selected iteration objects with full data
   */
  const handleApplyIterations = (selectedIterations) => {
    setSelectedIterations(selectedIterations);
    setIsModalOpen(false);
  };

  return (
    <ErrorBoundary>
      <AppContainer>
        <CompactHeaderWithIterations
          selectedIterations={selectedIterations}
          onRemoveIteration={handleRemoveIteration}
          onOpenModal={handleOpenModal}
        />

        <Content>
          {selectedIterations.length === 0 ? (
            <EmptyState
              title="No Iterations Selected"
              message="Select sprint iterations to view velocity metrics and team performance data."
            />
          ) : (
            <ChartsGrid>
              <ChartCard>
                <ChartTitle>Velocity Trend</ChartTitle>
                <VelocityChart iterationIds={selectedIterations.map(iter => iter.id)} />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Cycle Time</ChartTitle>
                <CycleTimeChart iterationIds={selectedIterations.map(iter => iter.id)} />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Deployment Frequency</ChartTitle>
                <DeploymentFrequencyChart iterationIds={selectedIterations.map(iter => iter.id)} />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Lead Time</ChartTitle>
                <LeadTimeChart iterationIds={selectedIterations.map(iter => iter.id)} />
              </ChartCard>
            </ChartsGrid>
          )}
        </Content>

        <IterationSelectionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onApply={handleApplyIterations}
          selectedIterationIds={selectedIterations.map(iter => iter.id)}
        />
      </AppContainer>
    </ErrorBoundary>
  );
}

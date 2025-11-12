/**
 * VelocityApp Component
 *
 * Main application container for the GitLab Sprint Metrics Dashboard.
 * Refactored to use polished components from Story V3.
 *
 * Features:
 * - Uses new Header component with gradient background
 * - Wrapped in ErrorBoundary for error handling
 * - Shows EmptyState when no iterations selected
 * - Theme-based styling throughout
 * - Clean, modern layout
 *
 * @returns {JSX.Element} Rendered application
 */

import { useState } from 'react';
import styled from 'styled-components';
import ErrorBoundary from './ErrorBoundary.jsx';
import Header from './Header.jsx';
import EmptyState from './EmptyState.jsx';
import IterationSelectorToolbar from './IterationSelectorToolbar.jsx';
import IterationSelectionModal from './IterationSelectionModal.jsx';
import VelocityChart from './VelocityChart.jsx';
import CycleTimeChart from './CycleTimeChart.jsx';

/**
 * Main app container with max-width and centered layout
 *
 * @component
 */
const AppContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.bgSecondary};
`;

/**
 * Content container with max-width
 *
 * @component
 */
const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

/**
 * Charts grid layout
 *
 * @component
 */
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Chart card container
 *
 * @component
 */
const ChartCard = styled.div`
  background: ${props => props.theme.colors.bgPrimary};
  padding: ${props => props.theme.spacing.lg};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
`;

/**
 * Chart title
 *
 * @component
 */
const ChartTitle = styled.h3`
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin: 0 0 ${props => props.theme.spacing.lg} 0;
`;

/**
 * VelocityApp Component
 *
 * @returns {JSX.Element} Rendered application
 */
export default function VelocityApp() {
  const [selectedIterations, setSelectedIterations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableIterations, setAvailableIterations] = useState([]);

  /**
   * Handle removing an iteration from the toolbar
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
        <Header />
        <IterationSelectorToolbar
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
                <ChartTitle>Velocity Metrics</ChartTitle>
                <VelocityChart iterationIds={selectedIterations.map(iter => iter.id)} />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Cycle Time Metrics</ChartTitle>
                <CycleTimeChart iterationIds={selectedIterations.map(iter => iter.id)} />
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

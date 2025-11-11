import { useState } from 'react';
import styled from 'styled-components';
import IterationSelector from './IterationSelector.jsx';
import VelocityChart from './VelocityChart.jsx';
import CycleTimeChart from './CycleTimeChart.jsx';

const AppContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  color: #333;
  margin: 0 0 10px 0;
  font-size: 32px;
`;

const Subtitle = styled.p`
  color: #666;
  margin: 0;
  font-size: 16px;
`;

const Section = styled.section`
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: #333;
  margin: 0 0 20px 0;
  font-size: 24px;
`;

const AnalyzeButton = styled.button`
  background: #4f46e5;
  color: white;
  border: none;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 20px;
  width: 100%;

  &:hover:not(:disabled) {
    background: #4338ca;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const BackButton = styled.button`
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 20px;

  &:hover {
    background: #4b5563;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ChartTitle = styled.h3`
  color: #333;
  margin: 0 0 20px 0;
  font-size: 20px;
`;

/**
 * VelocityApp Component
 * Main application for velocity tracking
 * Two-view flow: iteration selection → dashboard with metrics
 *
 * @returns {JSX.Element} Rendered application
 */
const VelocityApp = () => {
  const [view, setView] = useState('selector'); // 'selector' or 'dashboard'
  const [selectedIterationIds, setSelectedIterationIds] = useState([]);

  /**
   * Handle iteration selection change
   * @param {string[]} iterationIds - Array of selected iteration IDs
   */
  const handleIterationSelectionChange = (iterationIds) => {
    setSelectedIterationIds(iterationIds);
  };

  /**
   * Handle analyze button click - transition to dashboard view
   */
  const handleAnalyze = () => {
    if (selectedIterationIds.length > 0) {
      setView('dashboard');
    }
  };

  /**
   * Handle back to selector view
   */
  const handleBackToSelector = () => {
    setView('selector');
  };

  return (
    <AppContainer>
      <Header>
        <Title>GitLab Velocity Tracker</Title>
        <Subtitle>Track team velocity across sprint iterations</Subtitle>
      </Header>

      {view === 'selector' && (
        <Section>
          <SectionTitle>Select Sprint Iterations to Analyze</SectionTitle>
          <IterationSelector onSelectionChange={handleIterationSelectionChange} />
          <AnalyzeButton
            onClick={handleAnalyze}
            disabled={selectedIterationIds.length === 0}
          >
            Analyze {selectedIterationIds.length} Iteration{selectedIterationIds.length !== 1 ? 's' : ''}
          </AnalyzeButton>
        </Section>
      )}

      {view === 'dashboard' && (
        <>
          <BackButton onClick={handleBackToSelector}>
            ← Change Sprints
          </BackButton>

          <ChartsGrid>
            <ChartCard>
              <ChartTitle>Velocity Metrics</ChartTitle>
              <VelocityChart iterationIds={selectedIterationIds} />
            </ChartCard>

            <ChartCard>
              <ChartTitle>Cycle Time Metrics</ChartTitle>
              <CycleTimeChart iterationIds={selectedIterationIds} />
            </ChartCard>
          </ChartsGrid>
        </>
      )}
    </AppContainer>
  );
};

export default VelocityApp;

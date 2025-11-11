import { useState } from 'react';
import styled from 'styled-components';
import IterationSelector from './IterationSelector.jsx';
import VelocityChart from './VelocityChart.jsx';
import CycleTimeChart from './CycleTimeChart.jsx';

const AppContainer = styled.div`
  max-width: 1200px;
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

/**
 * VelocityApp Component
 * Main application for velocity tracking
 * Combines iteration selection and velocity chart display
 *
 * @returns {JSX.Element} Rendered application
 */
const VelocityApp = () => {
  const [selectedIterationIds, setSelectedIterationIds] = useState([]);

  /**
   * Handle iteration selection change
   * @param {string[]} iterationIds - Array of selected iteration IDs
   */
  const handleIterationSelectionChange = (iterationIds) => {
    setSelectedIterationIds(iterationIds);
  };

  return (
    <AppContainer>
      <Header>
        <Title>GitLab Velocity Tracker</Title>
        <Subtitle>Track team velocity across sprint iterations</Subtitle>
      </Header>

      <Section>
        <SectionTitle>Select Iterations</SectionTitle>
        <IterationSelector onSelectionChange={handleIterationSelectionChange} />
      </Section>

      <Section>
        <SectionTitle>Velocity Metrics</SectionTitle>
        <VelocityChart iterationIds={selectedIterationIds} />
      </Section>

      <Section>
        <SectionTitle>Cycle Time Metrics</SectionTitle>
        <CycleTimeChart iterationIds={selectedIterationIds} />
      </Section>
    </AppContainer>
  );
};

export default VelocityApp;

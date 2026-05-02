/**
 * Shared styled components used across all six chart components.
 *
 * Only components with identical definitions across all charts are extracted here.
 * Components with chart-specific variations (LoadingMessage, ErrorMessage, EmptyState,
 * ChartContainer, Container) remain local to each chart file.
 */
import styled from 'styled-components';

/**
 * Filter row container — aligns the ChartFilterDropdown to the right.
 * Identical across VelocityChart, CycleTimeChart, LeadTimeChart,
 * DeploymentFrequencyChart, ChangeFailureRateChart, and MTTRChart.
 */
export const FilterContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

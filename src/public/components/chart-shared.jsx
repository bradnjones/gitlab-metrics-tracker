/**
 * Shared styled components used across all six chart components.
 *
 * Extracted from VelocityChart.jsx (reference implementation).
 * Phase 2 agents migrate each chart to import from here instead of
 * defining local copies.
 */
import styled from 'styled-components';

/**
 * Outer wrapper for a chart panel — provides 20px padding.
 * Identical across all six chart components.
 */
export const Container = styled.div`
  padding: 20px;
`;

/**
 * Shown while chart data is loading.
 * Identical across all six chart components.
 */
export const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

/**
 * Shown when the API call fails.
 * Identical across all six chart components.
 */
export const ErrorMessage = styled.div`
  padding: 20px;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
`;

/**
 * Shown when no iterations are selected.
 * Identical across all six chart components.
 */
export const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

/**
 * Wrapper around the Chart.js canvas — fixed height, pointer cursor,
 * hover shadow, and focus ring for keyboard accessibility.
 * Identical across all six chart components.
 */
export const ChartContainer = styled.div`
  position: relative;
  height: 400px;
  padding: 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: box-shadow 200ms ease-in-out;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`;

/**
 * Flex row that right-aligns toolbar actions (e.g. Export PNG button).
 * Identical across all six chart components.
 */
export const ChartToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
`;

/**
 * Small export action button shown above the chart canvas.
 * Identical across all six chart components.
 */
export const ExportButton = styled.button`
  padding: 4px 10px;
  font-size: 12px;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  line-height: 1.5;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:active {
    background: #e5e7eb;
  }
`;

/**
 * Filter row container — aligns the ChartFilterDropdown to the right.
 * Identical across VelocityChart, CycleTimeChart, LeadTimeChart,
 * DeploymentFrequencyChart, ChangeFailureRateChart, and MTTRChart.
 */
export const FilterContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

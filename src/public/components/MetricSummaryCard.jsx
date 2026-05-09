/**
 * MetricSummaryCard Component
 *
 * Displays a metric summary with a soft blue-gray gradient background.
 * Used in the dashboard to show key metric values at a glance.
 *
 * @param {Object} props
 * @param {string} props.label - Metric label (e.g., "Last Sprint Velocity")
 * @param {string} props.value - Formatted metric value (e.g., "42 pts")
 * @returns {JSX.Element}
 */

import styled from 'styled-components';

const Card = styled.div`
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: ${props => props.theme.borderRadius.xl};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  color: ${props => props.theme.colors.textPrimary};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1rem;
  }
`;

const Label = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 0.5rem;
`;

const Value = styled.div`
  font-size: ${props => props.theme.typography.fontSize['3xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  line-height: 1;
  color: ${props => props.theme.colors.textPrimary};
`;

export default function MetricSummaryCard({ label, value }) {
  return (
    <Card>
      <Label>{label}</Label>
      <Value>{value}</Value>
    </Card>
  );
}

/**
 * MetricSummaryCard Component
 *
 * Displays a metric summary with gradient background.
 * Used in the dashboard to show key metric values.
 *
 * Design specifications from prototype:
 * - Gradient: 135deg, #3b82f6 → #2563eb (blue gradient)
 * - Border radius: 12px
 * - Padding: 1.5rem (desktop), 1rem (mobile)
 * - Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
 * - White text on gradient background
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Metric label (e.g., "Velocity")
 * @param {string} props.value - Metric value (e.g., "42")
 * @returns {JSX.Element} Styled metric summary card
 */

import styled from 'styled-components';

/**
 * Styled card container with subtle muted background
 * Updated to use soft blue-gray tones that complement the dashboard
 *
 * @component
 */
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

/**
 * Styled label text
 *
 * @component
 */
const Label = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 0.5rem;
`;

/**
 * Styled value text
 *
 * @component
 */
const Value = styled.div`
  font-size: ${props => props.theme.typography.fontSize['3xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  line-height: 1;
  color: ${props => props.theme.colors.textPrimary};
`;

/**
 * MetricSummaryCard Component
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Metric label
 * @param {string} props.value - Metric value
 * @returns {JSX.Element} Rendered component
 */
export default function MetricSummaryCard({ label, value }) {
  return (
    <Card>
      <Label>{label}</Label>
      <Value>{value}</Value>
    </Card>
  );
}

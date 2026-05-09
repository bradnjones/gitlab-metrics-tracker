/**
 * MetricSummaryCard Component
 *
 * Displays a metric summary with gradient background and an optional info
 * icon that reveals a tooltip (hover or click) explaining the metric and
 * its good/bad direction.
 *
 * @param {Object} props
 * @param {string} props.label - Metric label (e.g., "Last Sprint Velocity")
 * @param {string} props.value - Formatted metric value (e.g., "42 pts")
 * @param {{ description: string, goodDirection: 'up'|'down', goodLabel: string }} [props.tooltip]
 * @returns {JSX.Element}
 */

import { useState } from 'react';
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

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
`;

const Label = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textSecondary};
`;

const Value = styled.div`
  font-size: ${props => props.theme.typography.fontSize['3xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  line-height: 1;
  color: ${props => props.theme.colors.textPrimary};
`;

const InfoWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`;

const InfoButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.textSecondary};
  display: inline-flex;
  align-items: center;
  padding: 0;
  line-height: 1;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
    border-radius: 50%;
  }
`;

const TooltipBubble = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: ${props => props.theme.zIndex.tooltip};
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.75rem;
  width: 240px;
`;

const TooltipDescription = styled.p`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textPrimary};
  line-height: 1.5;
`;

const TooltipIndicator = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${props => props.theme.colors.border};
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.$positive ? '#16a34a' : '#dc2626'};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

/** Inline info SVG — no external dependency */
function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export default function MetricSummaryCard({ label, value, tooltip }) {
  const [visible, setVisible] = useState(false);

  return (
    <Card>
      <LabelRow>
        <Label>{label}</Label>
        {tooltip && (
          <InfoWrapper
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
          >
            <InfoButton
              type="button"
              aria-label={`About ${label}`}
              onClick={() => setVisible(v => !v)}
            >
              <InfoIcon />
            </InfoButton>
            {visible && (
              <TooltipBubble role="tooltip">
                <TooltipDescription>{tooltip.description}</TooltipDescription>
                <TooltipIndicator $positive={tooltip.goodDirection === 'up'}>
                  {tooltip.goodDirection === 'up' ? '↑ Higher is better' : '↓ Lower is better'} — {tooltip.goodLabel}
                </TooltipIndicator>
              </TooltipBubble>
            )}
          </InfoWrapper>
        )}
      </LabelRow>
      <Value>{value}</Value>
    </Card>
  );
}

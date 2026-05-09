/**
 * MetricInfoIcon Component
 *
 * Renders a small ⓘ icon that shows a tooltip on hover or click.
 * The tooltip explains what a metric measures and whether higher or
 * lower values indicate good performance.
 *
 * The bubble auto-flips from left-aligned to right-aligned when it
 * would overflow the viewport, using useLayoutEffect so the correction
 * happens before the browser paints (no visible flash).
 *
 * @param {Object} props
 * @param {string} props.label - Metric name, used for aria-label
 * @param {{ description: string, goodDirection: 'up'|'down', goodLabel: string }} props.tooltip
 * @returns {JSX.Element}
 */

import { useState, useRef, useLayoutEffect } from 'react';
import styled from 'styled-components';

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`;

const IconButton = styled.button`
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

const Bubble = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  ${props => props.$flipped ? 'right: 0;' : 'left: 0;'}
  z-index: ${props => props.theme.zIndex.tooltip};
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.75rem;
  width: 260px;
`;

const Description = styled.p`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textPrimary};
  line-height: 1.5;
`;

const Indicator = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${props => props.theme.colors.border};
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.$positive ? '#16a34a' : '#dc2626'};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  line-height: 1.4;
`;

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export default function MetricInfoIcon({ label, tooltip }) {
  const [visible, setVisible] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const bubbleRef = useRef(null);

  // After the bubble renders, check if it overflows the right edge of the viewport.
  // useLayoutEffect runs before the browser paints so there's no visible flash.
  useLayoutEffect(() => {
    if (visible && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      setFlipped(rect.right > window.innerWidth - 8);
    } else {
      setFlipped(false);
    }
  }, [visible]);

  return (
    <Wrapper
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <IconButton
        type="button"
        aria-label={`About ${label}`}
        onClick={() => setVisible(v => !v)}
      >
        <InfoIcon />
      </IconButton>
      {visible && (
        <Bubble ref={bubbleRef} role="tooltip" $flipped={flipped}>
          <Description>{tooltip.description}</Description>
          <Indicator $positive={tooltip.goodDirection === 'up'}>
            {tooltip.goodDirection === 'up' ? '↑ Higher is better' : '↓ Lower is better'} — {tooltip.goodLabel}
          </Indicator>
        </Bubble>
      )}
    </Wrapper>
  );
}

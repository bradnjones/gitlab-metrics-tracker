/**
 * ChartEnlargementModal Styled Components
 *
 * Displays an enlarged, full-screen view of any chart.
 *
 * Design principles:
 * - Darker overlay (0.7 opacity) than annotation modal for better chart focus
 * - Larger dimensions (90vw x 85vh) to maximize chart visibility
 * - Minimal UI - just title, close button, and chart
 * - Click overlay or press Escape to close
 * - Maintains prototype visual design system
 *
 * @module components/ChartEnlargementModal.styles
 */

import styled from 'styled-components';

/**
 * Modal overlay - Semi-transparent backdrop covering entire viewport
 * Darker than annotation modal (0.7 vs 0.5) for better chart focus
 *
 * @component
 */
export const EnlargementOverlay = styled.div`
  /* Layout */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.md};

  /* Visual */
  background: rgba(0, 0, 0, 0.7); /* Darker than annotation modal for focus */
  z-index: ${(props) => props.theme.zIndex.modal};

  /* Animation - fade in */
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * Modal container - Large centered dialog for chart
 *
 * @component
 */
export const EnlargementModal = styled.div`
  /* Layout */
  width: 90vw;
  max-width: 1400px;
  height: 85vh;
  display: flex;
  flex-direction: column;

  /* Visual */
  background: ${(props) => props.theme.colors.bgPrimary};
  border-radius: ${(props) => props.theme.borderRadius.xl};
  box-shadow: ${(props) => props.theme.shadows.xl};
  overflow: hidden;

  /* Animation - slide up */
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive: Full-screen on mobile */
  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    width: 100%;
    height: 100%;
    max-width: 100%;
    border-radius: 0;
  }
`;

/**
 * Modal header with chart title and close button
 *
 * @component
 */
export const EnlargementHeader = styled.div`
  /* Layout */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${(props) => props.theme.spacing.lg};
  flex-shrink: 0;

  /* Visual */
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.bgPrimary};

  h3 {
    font-size: ${(props) => props.theme.typography.fontSize.xl};
    font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
    color: ${(props) => props.theme.colors.textPrimary};
    margin: 0;
  }
`;

/**
 * Close button (×) - positioned in header
 *
 * @component
 */
export const CloseButton = styled.button`
  /* Reset */
  background: none;
  border: none;
  padding: ${(props) => props.theme.spacing.sm};
  margin: -${(props) => props.theme.spacing.sm};

  /* Visual */
  font-size: 2rem;
  line-height: 1;
  color: ${(props) => props.theme.colors.textSecondary};
  cursor: pointer;

  /* Interaction */
  transition: color ${(props) => props.theme.transitions.normal}
    ${(props) => props.theme.transitions.easing};

  &:hover {
    color: ${(props) => props.theme.colors.textPrimary};
  }

  &:focus {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 2px;
    border-radius: ${(props) => props.theme.borderRadius.sm};
  }

  /* Accessibility: 44px minimum touch target */
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Chart container - Fills remaining space after header
 *
 * @component
 */
export const ChartContainer = styled.div`
  /* Layout */
  flex: 1;
  padding: ${(props) => props.theme.spacing.lg};
  overflow: hidden;

  /* Visual */
  background: ${(props) => props.theme.colors.bgPrimary};

  /* Ensure Chart.js canvas fills container */
  canvas {
    max-height: 100% !important;
    width: 100% !important;
  }
`;

/**
 * Keyboard hint - Small text showing "Press ESC to close"
 *
 * @component
 */
export const KeyboardHint = styled.div`
  /* Layout */
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.lg};
  text-align: center;
  flex-shrink: 0;

  /* Visual */
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  background: ${(props) => props.theme.colors.bgTertiary};
  border-top: 1px solid ${(props) => props.theme.colors.border};

  /* Responsive: Hide on mobile to maximize chart space */
  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

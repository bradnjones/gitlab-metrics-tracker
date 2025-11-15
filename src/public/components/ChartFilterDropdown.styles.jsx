/**
 * ChartFilterDropdown Styled Components
 *
 * Styled components for per-chart iteration filtering dropdown.
 * Design matches prototype's iteration selector pattern.
 *
 * @module components/ChartFilterDropdown.styles
 */

import styled from 'styled-components';

/**
 * Container for chart filter dropdown
 * Positioned relative for dropdown positioning
 * @component
 */
export const ChartFilterContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

/**
 * Filter button with icon
 * Matches prototype button styling with hover/focus states
 * @component
 */
export const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-out;
  line-height: 1;
  white-space: nowrap;

  /* Hover state */
  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.bgTertiary};
    color: ${props => props.theme.colors.textPrimary};
    border-color: #cbd5e1;
  }

  /* Focus state - keyboard accessibility */
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Active/Open state */
  &[aria-expanded="true"] {
    background: ${props => props.theme.colors.bgTertiary};
    color: ${props => props.theme.colors.textPrimary};
    border-color: ${props => props.theme.colors.primary};
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Filter icon (funnel SVG) */
  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

/**
 * Warning badge showing filtered state
 * Appears next to filter button when chart has exclusions
 * @component
 */
export const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  white-space: nowrap;

  /* Warning icon */
  &::before {
    content: '⚠️';
    font-size: 0.875rem;
  }
`;

/**
 * Dropdown menu overlay
 * Uses fixed positioning with z-index for proper layering
 * Click outside to close pattern
 * @component
 */
export const DropdownOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  background: transparent;
`;

/**
 * Dropdown menu container
 * Positioned absolutely relative to button
 * Matches prototype dropdown styling
 * @component
 */
export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 280px;
  max-width: 320px;
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 101;
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  flex-direction: column;
  max-height: 400px;
  overflow: hidden;

  /* Mobile: Full width dropdown */
  @media (max-width: 640px) {
    left: 0;
    right: 0;
    min-width: 0;
    max-width: none;
  }
`;

/**
 * Dropdown header
 * Contains title and close button
 * @component
 */
export const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.bgSecondary};

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: ${props => props.theme.colors.textPrimary};
    margin: 0;
  }
`;

/**
 * Close button for dropdown
 * X icon in top-right corner
 * @component
 */
export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${props => props.theme.colors.textPrimary};
    background: ${props => props.theme.colors.bgTertiary};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  &::before {
    content: '✕';
  }
`;

/**
 * Scrollable list of iterations
 * Matches prototype iteration list styling
 * @component
 */
export const IterationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.bgSecondary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.textSecondary};
  }
`;

/**
 * Individual iteration checkbox item
 * Matches prototype iteration-item styling with left-aligned checkbox
 * Fixed alignment issue from prototype feedback
 * @component
 */
export const IterationItem = styled.label`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s ease-out;
  gap: 0.75rem;

  &:hover {
    background: ${props => props.theme.colors.bgSecondary};
  }

  &:focus-within {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: -2px;
  }

  /* Checkbox styling */
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    flex-shrink: 0;
    margin: 0;
    align-self: flex-start;
    margin-top: 2px; /* Optical alignment with title text */
  }
`;

/**
 * Iteration text details
 * Shows title and date range
 * @component
 */
export const IterationDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0; /* Allow text truncation */
`;

/**
 * Iteration title
 * @component
 */
export const IterationTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.textPrimary};
  line-height: 1.5;
`;

/**
 * Iteration date range
 * @component
 */
export const IterationDates = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.5;
`;

/**
 * Dropdown footer with action buttons
 * @component
 */
export const DropdownFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.bgSecondary};
`;

/**
 * Reset button (secondary style)
 * @component
 */
export const ResetButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-out;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.bgTertiary};
    color: ${props => props.theme.colors.textPrimary};
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * Apply button (primary style)
 * @component
 */
export const ApplyButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-out;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primaryDark};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * Selection count indicator
 * Shows "X of Y iterations" in dropdown
 * @component
 */
export const SelectionCount = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.bgTertiary};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  text-align: center;
`;

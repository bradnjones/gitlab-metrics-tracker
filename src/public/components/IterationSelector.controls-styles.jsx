import styled, { keyframes } from 'styled-components';

/**
 * Styled components for IterationSelector — controls elements
 * Covers the search input, filter dropdowns, select-all section,
 * controls bar wrapper, and progress footer/bar/text elements.
 */

/**
 * Unified controls bar containing search and filters
 * Horizontal layout with consistent spacing and visual treatment
 * Wraps to prevent overflow
 * @component
 */
export const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin: 1rem;
  flex-wrap: wrap;

  /* Mobile: Stack vertically */
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

/**
 * Search input wrapper - grows to fill available space
 * @component
 */
export const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;

  @media (max-width: 640px) {
    min-width: 0;
    width: 100%;
  }
`;

/**
 * Filter controls section - compact horizontal layout
 * @component
 */
export const FilterSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: space-between;
  }
`;

/**
 * Filter label - concise text
 * @component
 */
export const FilterLabel = styled.label`
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
`;

/**
 * Filter dropdown select
 * Matches search input height and style
 * @component
 */
export const FilterSelect = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease-out;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  min-width: 120px;
  max-width: 160px;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #cbd5e1;
  }

  @media (max-width: 640px) {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
`;

/**
 * Search input field with icon spacing
 * Removed heavy border styling - relies on parent container
 * @component
 */
export const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2.25rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 0.2s ease-out;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #cbd5e1;
  }
`;

/**
 * Search icon positioned inside input
 * @component
 */
export const SearchIcon = styled.span`
  position: absolute;
  left: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;

  &::before {
    content: '🔍';
  }
`;

/**
 * Clear button for search input
 * Only visible when search has content
 * @component
 */
export const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease-out;
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-secondary);
  }

  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    color: var(--primary);
  }

  &::before {
    content: '✕';
  }
`;

/**
 * Select All checkbox section
 * Positioned at the start of the controls bar
 * @component
 */
export const SelectAllSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

/**
 * Select All label with checkbox styling
 * @component
 */
export const SelectAllLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

/**
 * Spin animation keyframe for spinner icon
 * Rotates continuously to indicate active download
 */
const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

/**
 * Progress footer container
 * Positioned above modal footer buttons (Cancel/Apply)
 * Shows aggregate download status with counts and progress bar
 * @component
 */
export const ProgressFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);

  /* Responsive: Stack vertically on mobile */
  @media (max-width: 640px) {
    gap: 0.5rem;
  }
`;

/**
 * Progress text component
 * Displays aggregate counts (e.g., "3 cached | 2 downloading...")
 * @component
 */
export const ProgressText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;

  /* Emphasize numbers */
  strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  /* Spinner icon for active downloads */
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
  }
`;

/**
 * Progress bar container
 * Visual indicator of aggregate download progress
 * @component
 */
export const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`;

/**
 * Progress bar fill
 * Animated fill showing completion percentage
 * @component
 */
export const ProgressBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-dark));
  border-radius: 3px;
  transition: width 0.3s ease-out;
  width: ${props => props.$progress || 0}%;

  /* Shimmer animation for active downloads */
  ${props => props.$isDownloading && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `}
`;

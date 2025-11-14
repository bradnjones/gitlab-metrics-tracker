import styled, { keyframes } from 'styled-components';

/**
 * Styled components for IterationSelector
 * Extracted to separate file for better organization and maintainability
 */

/**
 * Container for the entire iteration selector component
 * @component
 */
export const Container = styled.div`
  padding: 0;
`;

/**
 * Loading state message
 * @component
 */
export const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 1rem;
`;

/**
 * Error message display
 * @component
 */
export const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  font-size: 0.95rem;
`;

/**
 * Empty state message when no iterations found
 * @component
 */
export const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 1rem;
`;

/**
 * Scrollable list container for iterations
 * Removed top border-radius since controls are now separate
 * @component
 */
export const IterationList = styled.div`
  margin: 0 1rem 1.5rem 1rem;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-primary);
`;

/**
 * Individual iteration item with checkbox
 * Fixed alignment: checkbox and details are siblings in flex container
 * Checkbox aligns to top via align-items: center with single-line flex
 * @component
 */
export const IterationItem = styled.label`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s;
  background: var(--bg-primary);

  /* Remove border from last item */
  &:last-child {
    border-bottom: none;
  }

  /* Hover state - smooth background transition */
  &:hover {
    background: var(--bg-secondary);
  }

  /* Focus-within for keyboard accessibility */
  &:focus-within {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  /* Checkbox styling */
  input[type="checkbox"] {
    margin: 0 1rem 0 0;
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0; /* Prevent checkbox from shrinking */

    /* Align checkbox to optical center of first line */
    align-self: flex-start;
    margin-top: 2px; /* Optical alignment with title text */
  }
`;

/**
 * Container for iteration text details (title, dates, state)
 * Uses column layout for vertical stacking
 * @component
 */
export const IterationDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0; /* Allow text truncation if needed */
`;

/**
 * Iteration title - primary identifier
 * Bold, larger text for clear hierarchy
 * @component
 */
export const IterationTitle = styled.strong`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
`;

/**
 * Date range display
 * Secondary text, smaller and grayed
 * @component
 */
export const IterationDates = styled.span`
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
`;

/**
 * State badge (closed, current, upcoming)
 * Uppercase, colored background, inline-block for width fit-content
 * @component
 */
export const IterationState = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  width: fit-content;
  line-height: 1;

  /* State color variants */
  &.closed {
    background: var(--secondary);
    color: white;
  }

  &.current,
  &.active {
    background: var(--success);
    color: white;
  }

  &.upcoming {
    background: var(--warning);
    color: white;
  }
`;

/**
 * Badges container - holds state and cached badges inline
 * @component
 */
export const BadgesContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

/**
 * Cached badge indicator
 * Shows when iteration data is cached
 * @component
 */
export const CachedBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  width: fit-content;
  line-height: 1;
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
`;

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
 * Pulse animation keyframe for downloading badge
 * Fades opacity in/out to indicate active download
 */
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

/**
 * Download status badge with color-coded variants
 * Shows real-time download progress for iteration data
 *
 * Variants:
 * - .cached (green) - Data is cached, instant load
 * - .downloading (blue, animated) - Currently prefetching
 * - .not-downloaded (gray) - Will need to download if selected
 * - .failed (red) - Download error occurred
 *
 * @component
 */
export const DownloadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  width: fit-content;
  border: 1px solid transparent;

  /* Cached variant - Green (success) */
  &.cached {
    background: #d1fae5;
    color: #065f46;
    border-color: #a7f3d0;
  }

  /* Downloading variant - Blue (primary) with pulse animation */
  &.downloading {
    background: #dbeafe;
    color: #1e40af;
    border-color: #bfdbfe;
    animation: ${pulse} 2s ease-in-out infinite;
  }

  /* Not Downloaded variant - Gray (secondary) */
  &.not-downloaded {
    background: #f3f4f6;
    color: #4b5563;
    border-color: #d1d5db;
  }

  /* Failed variant - Red (danger) */
  &.failed {
    background: #fee2e2;
    color: #991b1b;
    border-color: #fecaca;
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

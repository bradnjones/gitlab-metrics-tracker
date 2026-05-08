import styled, { keyframes } from 'styled-components';

/**
 * Styled components for IterationSelector — list and item elements
 * Covers the scrollable list container, individual iteration items,
 * detail rows, state/cached/download badges, and related text elements.
 */

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

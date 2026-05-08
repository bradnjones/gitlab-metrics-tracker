import styled from 'styled-components';

/**
 * Styled components for IterationSelector — core layout/container components only.
 *
 * List components     → IterationSelector.list-styles.jsx
 * Controls components → IterationSelector.controls-styles.jsx
 */

// Re-export list components for backward compatibility
export {
  IterationList,
  IterationItem,
  IterationDetails,
  IterationTitle,
  IterationDates,
  IterationState,
  BadgesContainer,
  CachedBadge,
  DownloadBadge,
} from './IterationSelector.list-styles.jsx';

// Re-export controls components for backward compatibility
export {
  ControlsBar,
  SearchWrapper,
  FilterSection,
  FilterLabel,
  FilterSelect,
  SearchInput,
  SearchIcon,
  ClearButton,
  SelectAllSection,
  SelectAllLabel,
  ProgressFooter,
  ProgressText,
  ProgressBar,
  ProgressBarFill,
} from './IterationSelector.controls-styles.jsx';

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

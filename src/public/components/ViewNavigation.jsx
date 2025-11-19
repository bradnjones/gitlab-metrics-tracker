import styled from 'styled-components';
import PropTypes from 'prop-types';

/**
 * ViewNavigation Component
 *
 * Navigation buttons for switching between views (Dashboard, Data Explorer)
 *
 * @param {Object} props
 * @param {string} props.currentView - Current active view ('dashboard', 'dataExplorer')
 * @param {Function} props.onViewChange - Callback when view changes, receives view name as parameter
 * @param {boolean} props.hasSelectedIterations - Whether iterations are selected (controls button disabled state)
 * @returns {JSX.Element}
 */

/**
 * Navigation container
 * @component
 */
const Nav = styled.nav`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  background: ${props => props.theme.colors.bgPrimary};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  overflow-x: auto;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.sm};
    gap: ${props => props.theme.spacing.xs};
  }
`;

/**
 * View navigation button with pill-style active state
 * @component
 */
const ViewButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: transparent;
  border: none;
  border-radius: ${props => props.theme.borderRadius.full};
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  font-family: ${props => props.theme.typography.fontFamily};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};
  white-space: nowrap;

  /* Active state - pill background */
  ${props => props.$isActive && `
    background: rgba(59, 130, 246, 0.1);
    color: ${props.theme.colors.primary};
    font-weight: ${props.theme.typography.fontWeight.semibold};
  `}

  /* Hover state */
  &:hover:not(:disabled) {
    background: ${props => props.$isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${props => props.theme.colors.primary};
  }

  /* Focus state */
  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  /* Disabled state */
  &:disabled {
    color: ${props => props.theme.colors.textSecondary};
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.typography.fontSize.xs};
  }
`;

/**
 * ViewNavigation Component
 *
 * Navigation buttons for switching between views
 *
 * @component
 * @param {Object} props
 * @param {string} props.currentView - Current active view
 * @param {Function} props.onViewChange - Callback when view changes
 * @param {boolean} props.hasSelectedIterations - Whether iterations are selected
 * @returns {JSX.Element}
 */
export default function ViewNavigation({ currentView, onViewChange, hasSelectedIterations }) {
  /**
   * Handle view button click
   * @param {string} view - View name to switch to
   */
  const handleViewClick = (view) => {
    if (onViewChange) {
      onViewChange(view);
    }
  };

  return (
    <Nav role="navigation" aria-label="View navigation">
      <ViewButton
        onClick={() => handleViewClick('dashboard')}
        $isActive={currentView === 'dashboard'}
        aria-current={currentView === 'dashboard' ? 'page' : undefined}
        type="button"
      >
        Dashboard
      </ViewButton>

      <ViewButton
        onClick={() => handleViewClick('dataExplorer')}
        disabled={!hasSelectedIterations}
        $isActive={currentView === 'dataExplorer'}
        aria-current={currentView === 'dataExplorer' ? 'page' : undefined}
        type="button"
      >
        Data Explorer
      </ViewButton>
    </Nav>
  );
}

/**
 * PropTypes validation for runtime type checking
 */
ViewNavigation.propTypes = {
  currentView: PropTypes.oneOf(['dashboard', 'dataExplorer']).isRequired,
  onViewChange: PropTypes.func.isRequired,
  hasSelectedIterations: PropTypes.bool.isRequired
};

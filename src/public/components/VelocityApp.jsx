/**
 * VelocityApp Component
 *
 * Main application container for the GitLab Sprint Metrics Dashboard.
 * Refactored to use polished components from Story V3.
 *
 * Features:
 * - Uses new Header component with gradient background
 * - Wrapped in ErrorBoundary for error handling
 * - Shows EmptyState when no iterations selected
 * - Theme-based styling throughout
 * - Clean, modern layout
 *
 * @returns {JSX.Element} Rendered application
 */

import styled from 'styled-components';
import ErrorBoundary from './ErrorBoundary.jsx';
import Header from './Header.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * Main app container with max-width and centered layout
 *
 * @component
 */
const AppContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.bgSecondary};
`;

/**
 * Content container with max-width
 *
 * @component
 */
const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

/**
 * VelocityApp Component
 *
 * @returns {JSX.Element} Rendered application
 */
export default function VelocityApp() {
  return (
    <ErrorBoundary>
      <AppContainer>
        <Header />
        <Content>
          <EmptyState
            title="No Iterations Selected"
            message="Select sprint iterations to view velocity metrics and team performance data."
          />
        </Content>
      </AppContainer>
    </ErrorBoundary>
  );
}

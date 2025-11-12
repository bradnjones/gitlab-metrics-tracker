/**
 * Header Component
 *
 * Application header with gradient background and branding.
 * Displays the application title and subtitle.
 *
 * Design specifications from prototype:
 * - Gradient: 135deg, #3b82f6 → #2563eb (blue gradient)
 * - Padding: 2rem (desktop), 1.5rem 1rem (mobile)
 * - Shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
 * - White text, centered
 * - Title: 2rem (desktop), 1.5rem (mobile)
 * - Subtitle: 1rem, 0.9 opacity
 *
 * @returns {JSX.Element} Styled header component
 */

import styled from 'styled-components';

/**
 * Styled header element with gradient background
 *
 * @component
 */
const StyledHeader = styled.header`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryDark} 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: ${props => props.theme.shadows.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1.5rem 1rem;
  }
`;

/**
 * Styled h1 title
 *
 * @component
 */
const Title = styled.h1`
  font-size: ${props => props.theme.typography.fontSize['3xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  margin-bottom: 0.5rem;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
  }
`;

/**
 * Styled subtitle paragraph
 *
 * @component
 */
const Subtitle = styled.p`
  font-size: ${props => props.theme.typography.fontSize.base};
  opacity: 0.9;
  margin: 0;
`;

/**
 * Header Component
 *
 * @returns {JSX.Element} Rendered header
 */
export default function Header() {
  return (
    <StyledHeader>
      <Title>GitLab Sprint Metrics Analyzer</Title>
      <Subtitle>Track team performance with context-aware annotations</Subtitle>
    </StyledHeader>
  );
}

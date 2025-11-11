import styled from 'styled-components';

/**
 * EmptyState Component
 * Displays empty state messages with optional icon and CTA button
 *
 * @component
 * @param {Object} props
 * @param {string} props.message - Empty state message
 * @param {string} [props.icon] - Optional icon/emoji to display above message
 * @param {string} [props.ctaText] - Optional CTA button text
 * @param {Function} [props.onCTA] - Optional CTA button callback
 */
const EmptyState = ({ message, icon, ctaText, onCTA }) => {
  // Only show CTA button if both ctaText and onCTA are provided
  const showCTA = ctaText && onCTA;

  return (
    <Container>
      {icon && <Icon>{icon}</Icon>}
      <Message>{message}</Message>
      {showCTA && <CTAButton onClick={onCTA}>{ctaText}</CTAButton>}
    </Container>
  );
};

/**
 * Empty state container
 * Centered layout with vertical spacing
 */
const Container = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors?.textSecondary || '#6b7280'};

  @media (max-width: ${({ theme }) => theme.breakpoints?.tablet || '768px'}) {
    padding: 2rem 1rem;
  }
`;

/**
 * Optional icon/emoji display
 * Large, slightly transparent
 */
const Icon = styled.div`
  font-size: 4rem;
  color: ${({ theme }) => theme.colors?.textSecondary || '#6b7280'};
  margin-bottom: 1rem;
  opacity: 0.5;
`;

/**
 * Empty state message
 * Centered text with normal line-height
 */
const Message = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: ${({ theme }) => theme.typography?.lineHeight?.normal || 1.6};
`;

/**
 * Call-to-action button
 * Primary blue button with hover state
 */
const CTAButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.colors?.primary || '#3b82f6'};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius?.lg || '8px'};
  font-size: 1rem;
  font-weight: ${({ theme }) => theme.typography?.fontWeight?.medium || 500};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions?.normal || '0.2s'}
    ${({ theme }) => theme.transitions?.easing || 'ease-out'};

  &:hover {
    background: ${({ theme }) => theme.colors?.primaryDark || '#2563eb'};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows?.md || '0 2px 8px rgba(0, 0, 0, 0.1)'};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#3b82f6'};
    outline-offset: 2px;
  }
`;

export default EmptyState;

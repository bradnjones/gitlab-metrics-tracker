import styled from 'styled-components';

/**
 * ErrorCard Component
 * Displays inline error messages with optional retry button
 *
 * @component
 * @param {Object} props
 * @param {string} props.title - Error title (displayed in red)
 * @param {string} props.message - Error message (displayed in gray)
 * @param {Function} [props.onRetry] - Optional retry callback
 */
const ErrorCard = ({ title, message, onRetry }) => {
  return (
    <Container>
      <Title>{title}</Title>
      <Message>{message}</Message>
      {onRetry && <RetryButton onClick={onRetry}>Retry</RetryButton>}
    </Container>
  );
};

/**
 * Error card container
 * White background with red left border accent
 */
const Container = styled.div`
  background: ${({ theme }) => theme.colors?.bgPrimary || '#ffffff'};
  border-left: 4px solid ${({ theme }) => theme.colors?.danger || '#ef4444'};
  border-radius: ${({ theme }) => theme.borderRadius?.lg || '8px'};
  box-shadow: ${({ theme }) => theme.shadows?.sm || '0 1px 3px rgba(0, 0, 0, 0.1)'};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

/**
 * Error title (red, bold)
 */
const Title = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: ${({ theme }) => theme.typography?.fontWeight?.semibold || 600};
  color: ${({ theme }) => theme.colors?.danger || '#ef4444'};
`;

/**
 * Error message (gray, secondary text)
 */
const Message = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors?.textSecondary || '#6b7280'};
  line-height: ${({ theme }) => theme.typography?.lineHeight?.normal || 1.6};
`;

/**
 * Retry button (red background, white text)
 */
const RetryButton = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.colors?.danger || '#ef4444'};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius?.md || '6px'};
  font-size: 0.9rem;
  font-weight: ${({ theme }) => theme.typography?.fontWeight?.medium || 500};
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions?.normal || '0.2s'}
    ${({ theme }) => theme.transitions?.easing || 'ease-out'};

  &:hover {
    background: #dc2626; /* Darker red on hover */
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors?.danger || '#ef4444'};
    outline-offset: 2px;
  }
`;

export default ErrorCard;

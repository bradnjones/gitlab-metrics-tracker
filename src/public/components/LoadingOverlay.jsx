import styled from 'styled-components';

/**
 * LoadingOverlay Component
 * Full-screen loading spinner with optional message
 *
 * @component
 * @param {Object} props
 * @param {string} [props.message='Loading...'] - Optional loading message
 */
const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <Overlay>
      <Spinner aria-label="Loading" />
      <Message>{message}</Message>
    </Overlay>
  );
};

/**
 * Full-screen overlay
 * Dark semi-transparent background, centered content
 */
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: white;
`;

/**
 * Spinning loader animation
 * Rotating circle with animated border
 */
const Spinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

/**
 * Loading message text
 * White text below spinner
 */
const Message = styled.p`
  font-size: 1rem;
  margin: 0;
  color: white;
`;

export default LoadingOverlay;

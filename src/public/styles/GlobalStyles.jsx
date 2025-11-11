import { createGlobalStyle } from 'styled-components';

/**
 * Global styles for the application
 * CSS reset + base typography + theme CSS variables
 *
 * Applies foundational styles from prototype:
 * - CSS reset (box-sizing, margin, padding)
 * - Base typography (font-family, line-height)
 * - Theme integration
 *
 * @component
 */
const GlobalStyles = createGlobalStyle`
  /* CSS Reset */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Base styles */
  body {
    font-family: ${({ theme }) => theme.typography?.fontFamily || '-apple-system, BlinkMacSystemFont, sans-serif'};
    font-size: ${({ theme }) => theme.typography?.fontSize?.base || '1rem'};
    line-height: ${({ theme }) => theme.typography?.lineHeight?.normal || 1.6};
    color: ${({ theme }) => theme.colors?.textPrimary || '#111827'};
    background-color: ${({ theme }) => theme.colors?.bgSecondary || '#f9fafb'};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Remove default button styles */
  button {
    font-family: inherit;
  }

  /* Remove default input styles */
  input, textarea, select {
    font-family: inherit;
  }

  /* Improve media defaults */
  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }

  /* Avoid text overflow */
  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }
`;

export default GlobalStyles;

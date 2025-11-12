import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import VelocityApp from '../components/VelocityApp.jsx';
import GlobalStyles from '../styles/GlobalStyles.jsx';
import theme from '../styles/theme.js';

/**
 * Main entry point for the React application
 * Renders the VelocityApp component with ThemeProvider and GlobalStyles
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <VelocityApp />
    </ThemeProvider>
  </React.StrictMode>
);

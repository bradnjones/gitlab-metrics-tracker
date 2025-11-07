import React from 'react';
import ReactDOM from 'react-dom/client';
import MetricsCalculator from '../components/MetricsCalculator.jsx';

/**
 * Main entry point for the React application
 * Renders the MetricsCalculator component into the root element
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MetricsCalculator />
  </React.StrictMode>
);

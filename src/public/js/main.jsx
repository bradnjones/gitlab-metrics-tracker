import React from 'react';
import ReactDOM from 'react-dom/client';
import VelocityApp from '../components/VelocityApp.jsx';

/**
 * Main entry point for the React application
 * Renders the VelocityApp component for Story V1: Velocity Tracking
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <VelocityApp />
  </React.StrictMode>
);

/**
 * Jest mock for chart-shared styled components (CommonJS version)
 *
 * Returns stub React components so chart component tests can import
 * from chart-shared without needing styled-components to evaluate template literals.
 */
const React = require('react');

const Container = ({ children, ...props }) => React.createElement('div', props, children);
const LoadingMessage = ({ children, ...props }) => React.createElement('div', props, children);
const ErrorMessage = ({ children, ...props }) => React.createElement('div', props, children);
const EmptyState = ({ children, ...props }) => React.createElement('div', props, children);
const ChartContainer = ({ children, ...props }) => React.createElement('div', props, children);
const ChartToolbar = ({ children, ...props }) => React.createElement('div', props, children);
const ExportButton = ({ children, ...props }) => React.createElement('button', props, children);
const FilterContainer = ({ children, ...props }) => React.createElement('div', props, children);

module.exports = {
  Container,
  LoadingMessage,
  ErrorMessage,
  EmptyState,
  ChartContainer,
  ChartToolbar,
  ExportButton,
  FilterContainer,
};

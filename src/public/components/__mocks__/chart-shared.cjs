/**
 * Jest mock for chart-shared styled components (CommonJS version)
 *
 * Returns stub React components so chart component tests can import
 * FilterContainer without needing styled-components to evaluate the template literal.
 */
const React = require('react');

const FilterContainer = ({ children, ...props }) => React.createElement('div', props, children);

module.exports = { FilterContainer };

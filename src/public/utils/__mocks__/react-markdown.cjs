// CJS stub for react-markdown — renders children as plain text for Jest/jsdom tests
const React = require('react');
function ReactMarkdown({ children }) {
  return React.createElement('div', { 'data-testid': 'markdown-content' }, children);
}
module.exports = ReactMarkdown;
module.exports.default = ReactMarkdown;

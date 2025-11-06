# React Conventions Guide

**Version:** 1.0
**Last Updated:** 2025-01-06
**Reference:** https://react.dev/

---

## Overview

This document defines React coding conventions for the GitLab Metrics Tracker project. We use React 18 with hooks, styled-components for styling, and functional components throughout.

**Key Principle:** Preserve the prototype's UI/UX while building maintainable, testable React components with Clean Architecture principles.

---

## Component Structure

### File Organization

```
src/public/
├── components/           # Reusable components
│   ├── MetricsCard.jsx
│   ├── AnnotationModal.jsx
│   ├── SprintSelector.jsx
│   └── Chart.jsx
├── pages/               # Page-level components
│   ├── Dashboard.jsx
│   ├── Annotations.jsx
│   └── Insights.jsx
├── hooks/               # Custom React hooks
│   ├── useMetrics.js
│   ├── useAnnotations.js
│   └── useGitLabData.js
├── styles/              # Styled components and themes
│   ├── theme.js
│   ├── GlobalStyles.js
│   └── components/
├── utils/               # Presentation layer utilities
│   ├── formatters.js
│   └── validators.js
└── App.jsx              # Root component
```

### Naming Conventions

**Files:**
- Components: PascalCase with `.jsx` extension (`MetricsCard.jsx`)
- Hooks: camelCase with `.js` extension (`useMetrics.js`)
- Utilities: camelCase with `.js` extension (`formatters.js`)
- Styled components: PascalCase with `.styles.js` extension (`MetricsCard.styles.js`)

**Components:**
- Named exports for components: `export function MetricsCard() {}`
- Default exports only for pages/main components

**Constants:**
- UPPER_SNAKE_CASE: `const MAX_RETRIES = 3;`

---

## Component Patterns

### Functional Components (Always)

```javascript
// ✅ Use functional components with hooks
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Display sprint metrics in a card
 * @component
 * @param {Object} props
 * @param {Metrics} props.metrics - Metrics to display
 * @param {boolean} [props.loading] - Loading state
 * @returns {React.Element}
 */
export function MetricsCard({ metrics, loading = false }) {
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="metrics-card">
      <h3>Sprint Metrics</h3>
      <p>Velocity: {metrics.velocity} points</p>
      <p>Throughput: {metrics.throughput} issues</p>
    </div>
  );
}

MetricsCard.propTypes = {
  metrics: PropTypes.shape({
    velocity: PropTypes.number.isRequired,
    throughput: PropTypes.number.isRequired
  }).isRequired,
  loading: PropTypes.bool
};
```

**Why functional components:**
- Hooks are simpler than class lifecycle methods
- Less boilerplate
- Easier to test
- Industry standard (React team recommendation)

### Component with Styled Components

```javascript
// MetricsCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

/**
 * Metrics card component
 * @component
 */
export function MetricsCard({ metrics, loading }) {
  if (loading) {
    return <LoadingContainer>Loading...</LoadingContainer>;
  }

  return (
    <Card>
      <Title>Sprint Metrics</Title>
      <MetricRow>
        <Label>Velocity:</Label>
        <Value>{metrics.velocity} points</Value>
      </MetricRow>
      <MetricRow>
        <Label>Throughput:</Label>
        <Value>{metrics.throughput} issues</Value>
      </MetricRow>
    </Card>
  );
}

// Styled components (same file or separate .styles.js)
const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const Label = styled.span`
  color: #7f8c8d;
`;

const Value = styled.span`
  font-weight: 600;
  color: #2c3e50;
`;

const LoadingContainer = styled.div`
  padding: 2rem;
  text-align: center;
  color: #95a5a6;
`;

MetricsCard.propTypes = {
  metrics: PropTypes.shape({
    velocity: PropTypes.number.isRequired,
    throughput: PropTypes.number.isRequired
  }).isRequired,
  loading: PropTypes.bool
};
```

**Styled components conventions:**
- Define styles after component (or in separate `.styles.js` file)
- Use meaningful names (Card, Title, not Div1, Div2)
- Follow theme colors and spacing
- Keep styles close to component logic

---

## Hooks Usage

### useState

```javascript
import { useState } from 'react';

export function SprintSelector() {
  // State initialization
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Event handler
  const handleSprintChange = (sprintId) => {
    setSelectedSprint(sprintId);
  };

  return (
    <select value={selectedSprint} onChange={(e) => handleSprintChange(e.target.value)}>
      {sprints.map(sprint => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.title}
        </option>
      ))}
    </select>
  );
}
```

**useState conventions:**
- Name: `[value, setValue]` pattern
- Initialize with appropriate default (`null`, `[]`, `{}`, `false`)
- Keep state minimal and focused

### useEffect

```javascript
import { useState, useEffect } from 'react';

export function MetricsDashboard({ sprintId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Async data fetching
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/metrics/${sprintId}`);
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (sprintId) {
      fetchMetrics();
    }
  }, [sprintId]); // Dependency array

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return <div>No data</div>;

  return <MetricsCard metrics={metrics} />;
}
```

**useEffect conventions:**
- Define async functions inside useEffect (not directly)
- Always include dependency array (avoid infinite loops)
- Cleanup side effects if needed (return cleanup function)
- One effect per concern (don't bundle unrelated logic)

**Cleanup example:**
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    setMessage('');
  }, 3000);

  // Cleanup on unmount
  return () => clearTimeout(timer);
}, []);
```

### Custom Hooks

```javascript
// hooks/useMetrics.js
import { useState, useEffect } from 'react';

/**
 * Fetch metrics for a sprint
 * @param {string} sprintId - Sprint ID
 * @returns {{metrics: Metrics|null, loading: boolean, error: string|null, refresh: function}}
 */
export function useMetrics(sprintId) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/metrics/${sprintId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sprintId) {
      fetchMetrics();
    }
  }, [sprintId]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics // Allow manual refresh
  };
}

// Usage
export function Dashboard({ sprintId }) {
  const { metrics, loading, error, refresh } = useMetrics(sprintId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <MetricsCard metrics={metrics} />
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

**Custom hook conventions:**
- Prefix with `use` (useMetrics, useAnnotations, useGitLabData)
- Return object with named properties (not array)
- Encapsulate related state and logic
- Make reusable across components

### Other Common Hooks

**useCallback:**
```javascript
import { useCallback } from 'react';

export function AnnotationList({ annotations, onDelete }) {
  // Memoize callback to prevent unnecessary re-renders
  const handleDelete = useCallback((id) => {
    if (confirm('Delete annotation?')) {
      onDelete(id);
    }
  }, [onDelete]);

  return (
    <ul>
      {annotations.map(annotation => (
        <li key={annotation.id}>
          {annotation.title}
          <button onClick={() => handleDelete(annotation.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

**useMemo:**
```javascript
import { useMemo } from 'react';

export function MetricsChart({ metrics }) {
  // Expensive calculation - memoize result
  const chartData = useMemo(() => {
    return metrics.map(m => ({
      x: m.sprintTitle,
      y: m.velocity
    }));
  }, [metrics]);

  return <Chart data={chartData} />;
}
```

**useRef:**
```javascript
import { useRef, useEffect } from 'react';

export function ChartCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Draw on canvas
  }, []);

  return <canvas ref={canvasRef} width={600} height={400} />;
}
```

---

## Props Patterns

### Props Destructuring

```javascript
// ✅ Destructure props in function signature
export function MetricsCard({ metrics, loading, onRefresh }) {
  // Use directly: metrics, loading, onRefresh
}

// ❌ Don't use props object
export function MetricsCard(props) {
  // Have to use props.metrics, props.loading, etc.
}
```

### Default Props

```javascript
// ✅ Use default parameters
export function MetricsCard({
  metrics,
  loading = false,
  showRefresh = true,
  theme = 'light'
}) {
  // ...
}

// Alternative: PropTypes with defaultProps
MetricsCard.defaultProps = {
  loading: false,
  showRefresh: true,
  theme: 'light'
};
```

### PropTypes

```javascript
import PropTypes from 'prop-types';

MetricsCard.propTypes = {
  // Required object with shape
  metrics: PropTypes.shape({
    velocity: PropTypes.number.isRequired,
    throughput: PropTypes.number.isRequired,
    cycleTime: PropTypes.shape({
      avg: PropTypes.number,
      p50: PropTypes.number,
      p90: PropTypes.number
    })
  }).isRequired,

  // Optional boolean
  loading: PropTypes.bool,

  // Optional function
  onRefresh: PropTypes.func,

  // Enum
  theme: PropTypes.oneOf(['light', 'dark']),

  // Array of objects
  annotations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      date: PropTypes.instanceOf(Date)
    })
  ),

  // Any node that can be rendered
  children: PropTypes.node
};
```

### Children Props

```javascript
/**
 * Card container component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.title] - Card title
 */
export function Card({ children, title }) {
  return (
    <div className="card">
      {title && <h3>{title}</h3>}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
}

// Usage
<Card title="Sprint Metrics">
  <MetricsCard metrics={metrics} />
  <Chart data={chartData} />
</Card>
```

### Callback Props

```javascript
/**
 * Annotation modal
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {function} props.onClose - Close handler
 * @param {function} props.onSave - Save handler (annotation) => void
 */
export function AnnotationModal({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('process');

  const handleSubmit = () => {
    onSave({ title, type, date: new Date() });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="process">Process</option>
        <option value="team">Team</option>
      </select>
      <button onClick={handleSubmit}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}

AnnotationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};
```

---

## Component Composition

### Container/Presentational Pattern

```javascript
// Container (smart component - handles data)
export function MetricsDashboardContainer({ sprintId }) {
  const { metrics, loading, error, refresh } = useMetrics(sprintId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <MetricsDashboard
      metrics={metrics}
      onRefresh={refresh}
    />
  );
}

// Presentational (dumb component - just renders)
export function MetricsDashboard({ metrics, onRefresh }) {
  return (
    <div>
      <MetricsCard metrics={metrics} />
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
}
```

**When to use:**
- Container: Data fetching, state management, business logic
- Presentational: Pure rendering, receive data via props
- Easier to test presentational components (just pass props)

### Compound Components

```javascript
// Parent component manages state
export function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="tabs">
      {React.Children.map(children, child =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  );
}

export function TabList({ activeTab, setActiveTab, children }) {
  return (
    <div className="tab-list">
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, { activeTab, setActiveTab, index })
      )}
    </div>
  );
}

export function Tab({ activeTab, setActiveTab, index, label }) {
  return (
    <button
      className={activeTab === index ? 'active' : ''}
      onClick={() => setActiveTab(index)}
    >
      {label}
    </button>
  );
}

export function TabPanels({ activeTab, children }) {
  return (
    <div className="tab-panels">
      {React.Children.toArray(children)[activeTab]}
    </div>
  );
}

// Usage
<Tabs defaultTab={0}>
  <TabList>
    <Tab label="Dashboard" />
    <Tab label="Annotations" />
    <Tab label="Insights" />
  </TabList>
  <TabPanels>
    <Dashboard />
    <Annotations />
    <Insights />
  </TabPanels>
</Tabs>
```

---

## Styling with styled-components

### Theme Setup

```javascript
// styles/theme.js
export const theme = {
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    danger: '#e74c3c',
    warning: '#f39c12',
    text: '#2c3e50',
    textLight: '#7f8c8d',
    background: '#ecf0f1',
    white: '#ffffff'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 2px 4px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.15)'
  }
};
```

### Using Theme

```javascript
// App.jsx
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <Dashboard />
    </ThemeProvider>
  );
}

// Component using theme
import styled from 'styled-components';

const Card = styled.div`
  background: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  box-shadow: ${props => props.theme.shadows.md};
  color: ${props => props.theme.colors.text};
`;

const PrimaryButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;
```

### Dynamic Styling

```javascript
const Button = styled.button`
  background: ${props => {
    switch (props.variant) {
      case 'primary': return props.theme.colors.primary;
      case 'danger': return props.theme.colors.danger;
      default: return props.theme.colors.secondary;
    }
  }};
  color: white;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  opacity: ${props => props.disabled ? 0.5 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

// Usage
<Button variant="primary">Save</Button>
<Button variant="danger">Delete</Button>
<Button disabled>Loading...</Button>
```

---

## Event Handling

### Event Handlers

```javascript
export function AnnotationForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'process',
    date: new Date()
  });

  // Handler function
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent form submission
    onSubmit(formData);
    // Reset form
    setFormData({ title: '', type: 'process', date: new Date() });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        value={formData.title}
        onChange={handleInputChange}
        placeholder="Annotation title"
      />
      <select
        name="type"
        value={formData.type}
        onChange={handleInputChange}
      >
        <option value="process">Process</option>
        <option value="team">Team</option>
      </select>
      <button type="submit">Save</button>
    </form>
  );
}
```

### Keyboard Events

```javascript
export function AnnotationModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // ...
}
```

### Keyboard Shortcuts (from Prototype)

```javascript
// Preserve Ctrl+N shortcut from prototype
export function App() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyboard = (e) => {
      // Ctrl+N to open annotation modal
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  return (
    <div>
      <Dashboard />
      <AnnotationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

---

## Testing Conventions

### Component Testing with React Testing Library

```javascript
// MetricsCard.test.jsx
import { render, screen } from '@testing-library/react';
import { MetricsCard } from './MetricsCard';

describe('MetricsCard', () => {
  const mockMetrics = {
    velocity: 42,
    throughput: 12,
    cycleTime: { avg: 3.5, p50: 3.0, p90: 5.0 }
  };

  test('renders metrics correctly', () => {
    render(<MetricsCard metrics={mockMetrics} />);

    expect(screen.getByText(/42 points/)).toBeInTheDocument();
    expect(screen.getByText(/12 issues/)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<MetricsCard metrics={mockMetrics} loading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('calls onRefresh when button clicked', async () => {
  const mockRefresh = jest.fn();
  render(<MetricsCard metrics={mockMetrics} onRefresh={mockRefresh} />);

  const button = screen.getByRole('button', { name: /refresh/i });
  await userEvent.click(button);

  expect(mockRefresh).toHaveBeenCalledTimes(1);
});
```

---

## Related Documentation

- `_context/coding/jsdoc-guide.md` - JSDoc for React components
- `_context/testing/tdd-strategy.md` - Testing React components
- `_context/reference/ui-design-system.md` - UI/UX patterns from prototype
- `_context/architecture/clean-architecture.md` - Presentation layer in Clean Architecture

---

**Remember:** Functional components with hooks, styled-components for styling, PropTypes for runtime validation, and preserve the prototype's UX patterns. Keep components focused and testable. 🚀

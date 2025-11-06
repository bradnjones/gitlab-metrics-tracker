# Styled Components Guide

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

This project uses styled-components for styling React components. This document explains our styling approach, patterns, and best practices.

## Why Styled Components?

### Advantages Over Alternatives

**vs CSS Modules:**
- Component-scoped styles automatically
- Dynamic styling based on props
- Better TypeScript/JSDoc integration
- No separate CSS files to manage

**vs Inline Styles:**
- Full CSS feature support (pseudo-classes, media queries)
- Better performance (styles are cached)
- Cleaner component code
- Easier theming

**vs Plain CSS:**
- No class name conflicts
- Dead code elimination
- Easier refactoring
- Co-located with components

## Theme Integration

### Design System Tokens

Our theme is defined in `/Users/brad/dev/smi/gitlab-sprint-metrics/src/styles/theme.js` (prototype) and will be integrated from `_context/design/ui-design-system.md`.

```javascript
// theme.js
export const theme = {
  colors: {
    primary: '#1f77b4',
    secondary: '#ff7f0e',
    success: '#2ca02c',
    warning: '#ffbb28',
    error: '#d62728',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: {
      primary: '#333333',
      secondary: '#666666',
      disabled: '#999999',
    },
    border: '#dddddd',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '24px',
      xxl: '32px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    },
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },

  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
};
```

### Using Theme in Components

```javascript
import styled from 'styled-components';

const Button = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
  }
`;
```

## Component Organization

### Option 1: Separate Styled File (Recommended for Complex Components)

```
MetricsDisplay.jsx
MetricsDisplay.styled.js
MetricsDisplay.test.jsx
```

**MetricsDisplay.styled.js:**
```javascript
import styled from 'styled-components';

export const Container = styled.div`
  display: grid;
  gap: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.xl};
`;

export const MetricCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  box-shadow: ${props => props.theme.shadows.sm};
`;

export const MetricValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xxl};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.colors.text.primary};
`;

export const MetricLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin-top: ${props => props.theme.spacing.sm};
`;
```

**MetricsDisplay.jsx:**
```javascript
import React from 'react';
import * as S from './MetricsDisplay.styled';

export function MetricsDisplay({ metrics }) {
  return (
    <S.Container>
      <S.MetricCard>
        <S.MetricValue>{metrics.velocity}</S.MetricValue>
        <S.MetricLabel>Velocity</S.MetricLabel>
      </S.MetricCard>
      {/* More metrics... */}
    </S.Container>
  );
}
```

### Option 2: Inline Styles (For Simple Components)

```javascript
import React from 'react';
import styled from 'styled-components';

const Card = styled.div`
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.surface};
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text.primary};
`;

export function SimpleCard({ title, children }) {
  return (
    <Card>
      <Title>{title}</Title>
      {children}
    </Card>
  );
}
```

## Responsive Design Patterns

### Media Queries with Theme Breakpoints

```javascript
import styled from 'styled-components';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;
```

### Responsive Helper

```javascript
// utils/responsive.js
export const media = {
  mobile: (styles) => `
    @media (max-width: 767px) {
      ${styles}
    }
  `,
  tablet: (styles) => `
    @media (min-width: 768px) and (max-width: 1023px) {
      ${styles}
    }
  `,
  desktop: (styles) => `
    @media (min-width: 1024px) {
      ${styles}
    }
  `,
};

// Usage
const ResponsiveGrid = styled.div`
  ${media.mobile(`
    grid-template-columns: 1fr;
  `)}

  ${media.desktop(`
    grid-template-columns: repeat(3, 1fr);
  `)}
`;
```

## Dynamic Styling with Props

```javascript
const Button = styled.button`
  background-color: ${props => {
    switch (props.variant) {
      case 'primary':
        return props.theme.colors.primary;
      case 'secondary':
        return props.theme.colors.secondary;
      case 'danger':
        return props.theme.colors.error;
      default:
        return props.theme.colors.surface;
    }
  }};

  padding: ${props =>
    props.size === 'small'
      ? props.theme.spacing.sm
      : props.theme.spacing.md
  };

  opacity: ${props => props.disabled ? 0.5 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;
```

## Accessibility Considerations

### Focus States

```javascript
const Button = styled.button`
  /* ... other styles ... */

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }
`;
```

### ARIA Attributes and Semantic HTML

```javascript
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// Usage
<Button>
  <Icon aria-hidden="true" />
  <VisuallyHidden>Close dialog</VisuallyHidden>
</Button>
```

### Color Contrast

```javascript
// Ensure sufficient contrast ratios (WCAG AA: 4.5:1 for normal text)
const Text = styled.p`
  color: ${props => props.theme.colors.text.primary}; // #333 on white = 12.6:1
  background: ${props => props.theme.colors.background};
`;
```

## Examples from Prototype UI

### Metrics Card (from prototype)

```javascript
const MetricsCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const MetricValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xxl};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.colors.primary};
  line-height: ${props => props.theme.typography.lineHeight.tight};
`;

const MetricLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin-top: ${props => props.theme.spacing.sm};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
```

### Sprint Selector (from prototype)

```javascript
const Select = styled.select`
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  color: ${props => props.theme.colors.text.primary};
  background-color: ${props => props.theme.colors.background};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}22;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

### Issue List (from prototype)

```javascript
const IssueListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
`;

const IssueItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};

  &:hover {
    background: ${props => props.theme.colors.surface};
  }
`;

const IssueStatus = styled.span`
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  background-color: ${props => {
    switch (props.status) {
      case 'completed':
        return props.theme.colors.success;
      case 'in-progress':
        return props.theme.colors.warning;
      default:
        return props.theme.colors.text.secondary;
    }
  }};
  color: white;
`;
```

## Best Practices

1. **Use theme tokens consistently** - Never hardcode colors, spacing, etc.
2. **Name styled components semantically** - `Button` not `StyledDiv`
3. **Keep styles close to components** - Co-locate in same directory
4. **Avoid deep nesting** - Keep specificity low
5. **Use transient props** - Prefix with `$` for props that shouldn't reach DOM (`$variant`)
6. **Test styled components** - Verify they render and apply correct styles

## Related Documentation

- **Design System:** `_context/design/ui-design-system.md`
- **React Patterns:** `_context/coding/react-patterns.md`
- **File Naming:** `_context/coding/file-naming.md`
- **Accessibility:** `_context/design/accessibility.md`

## References

- [styled-components documentation](https://styled-components.com/)
- [Prototype UI reference](/Users/brad/dev/smi/gitlab-sprint-metrics/)

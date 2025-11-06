# UI/UX Design System

**Version:** 1.0
**Last Updated:** 2025-01-06
**Prototype Reference:** `/Users/brad/dev/smi/gitlab-sprint-metrics/`

---

## Overview

This document defines the complete design system extracted from the working prototype. All UI components in the rebuild MUST match these specifications to maintain 95%+ visual fidelity.

**Prototype Files:**
- `src/public/styles.css` (650 lines) - Visual design
- `src/public/index.html` (350 lines) - Structure and interactions
- `src/public/js/charts.js` (360 lines) - Chart.js configuration

---

## 🎨 Design Tokens

### Color Palette

```css
/* Primary Colors */
--primary: #3b82f6;              /* Blue - buttons, links, primary actions */
--primary-hover: #2563eb;        /* Darker blue - hover states */
--primary-light: #dbeafe;        /* Light blue - backgrounds, highlights */

/* Text Colors */
--text-primary: #1f2937;         /* Dark gray - headings, important text */
--text-secondary: #6b7280;       /* Medium gray - body text, labels */
--text-tertiary: #9ca3af;        /* Light gray - muted text, placeholders */

/* Background Colors */
--bg-page: #f9fafb;              /* Light gray - page background */
--bg-card: #ffffff;              /* White - cards, modals, surfaces */
--bg-hover: #f3f4f6;             /* Very light gray - hover states */
--bg-disabled: #e5e7eb;          /* Light gray - disabled elements */

/* Border Colors */
--border-color: #e5e7eb;         /* Light gray - dividers, card borders */
--border-hover: #d1d5db;         /* Medium gray - hover state borders */

/* Semantic Colors */
--success: #10b981;              /* Green - positive impact, success states */
--success-light: #d1fae5;        /* Light green - success backgrounds */
--error: #ef4444;                /* Red - negative impact, errors */
--error-light: #fee2e2;          /* Light red - error backgrounds */
--warning: #f59e0b;              /* Orange - neutral impact, warnings */
--warning-light: #fef3c7;        /* Light orange - warning backgrounds */
--info: #3b82f6;                 /* Blue - info states, help */
--info-light: #dbeafe;           /* Light blue - info backgrounds */

/* Chart Colors (for metrics) */
--chart-line-1: #3b82f6;         /* Blue - primary line (avg) */
--chart-line-2: #10b981;         /* Green - secondary line (p50) */
--chart-line-3: #f59e0b;         /* Orange - tertiary line (p90) */
--chart-line-4: #8b5cf6;         /* Purple - quaternary line */
--chart-line-5: #ec4899;         /* Pink - quinary line */

/* Annotation Colors (by impact) */
--annotation-positive: #10b981;   /* Green - positive impact events */
--annotation-negative: #ef4444;   /* Red - negative impact events */
--annotation-neutral: #6b7280;    /* Gray - neutral impact events */
```

### Typography

```css
/* Font Family */
--font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
               'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
               'Noto Color Emoji';

/* Font Sizes */
--text-xs: 12px;      /* Small labels, meta info */
--text-sm: 14px;      /* Body text, buttons */
--text-base: 16px;    /* Default body text */
--text-lg: 18px;      /* Subheadings, emphasis */
--text-xl: 20px;      /* Section headings */
--text-2xl: 24px;     /* Page headings */
--text-3xl: 30px;     /* Hero text, main title */
--text-4xl: 36px;     /* Hero/splash (rarely used) */

/* Font Weights */
--font-normal: 400;    /* Body text */
--font-medium: 500;    /* Emphasis, labels */
--font-semibold: 600;  /* Subheadings, buttons */
--font-bold: 700;      /* Headings, strong emphasis */

/* Line Heights */
--leading-tight: 1.25;    /* Headings */
--leading-normal: 1.5;    /* Body text */
--leading-relaxed: 1.75;  /* Long-form content */
```

### Spacing Scale

```css
--spacing-xs: 4px;     /* Tight spacing - icon gaps, small padding */
--spacing-sm: 8px;     /* Small spacing - inline elements */
--spacing-md: 16px;    /* Medium spacing - card padding, default gaps */
--spacing-lg: 24px;    /* Large spacing - section padding */
--spacing-xl: 32px;    /* Extra large - major sections */
--spacing-2xl: 48px;   /* Extra extra large - page sections */
--spacing-3xl: 64px;   /* Huge - rarely used */
```

### Border Radius

```css
--radius-sm: 4px;      /* Small - inputs, tags, chips */
--radius-md: 8px;      /* Medium - buttons, small cards */
--radius-lg: 12px;     /* Large - cards, panels */
--radius-xl: 16px;     /* Extra large - modals */
--radius-full: 9999px; /* Circular - avatars, badges */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
/* Subtle depth - hoverable elements */

--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
/* Medium depth - cards, dropdowns */

--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
/* Strong depth - modals, popovers */

--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
             0 10px 10px -5px rgba(0, 0, 0, 0.04);
/* Extra strong - floating panels */
```

### Transitions

```css
--transition-fast: 150ms ease-out;      /* Quick interactions */
--transition-base: 200ms ease-out;      /* Standard transitions */
--transition-slow: 300ms ease-out;      /* Smooth, noticeable */
--transition-slower: 500ms ease-in-out; /* Emphasis, animations */
```

---

## 🧱 Core Components

### Header

**Visual Specs:**
- Position: Fixed, top: 0, full width
- Height: 64px
- Background: `var(--bg-card)`
- Border bottom: 1px solid `var(--border-color)`
- Padding: `var(--spacing-md)` `var(--spacing-lg)`
- Z-index: 50

**Content:**
- Logo/title: `font-size: var(--text-2xl)`, `font-weight: var(--font-bold)`
- Navigation items: `font-size: var(--text-base)`

**Prototype Reference:** `index.html` lines 15-35

```html
<header class="header">
  <h1>GitLab Sprint Metrics</h1>
  <nav>
    <a href="#dashboard">Dashboard</a>
    <a href="#annotations">Annotations</a>
    <a href="#insights">Insights</a>
  </nav>
</header>
```

---

### Card Component

**Visual Specs:**
- Background: `var(--bg-card)`
- Border radius: `var(--radius-lg)`
- Box shadow: `var(--shadow-sm)`
- Padding: `var(--spacing-lg)`
- Margin bottom: `var(--spacing-md)`

**Hover State:**
- Box shadow: `var(--shadow-md)`
- Transition: `var(--transition-base)`
- Transform: `translateY(-2px)` (optional lift effect)

**Card Header:**
- Font size: `var(--text-xl)`
- Font weight: `var(--font-semibold)`
- Color: `var(--text-primary)`
- Margin bottom: `var(--spacing-md)`

**Card Body:**
- Font size: `var(--text-base)`
- Color: `var(--text-secondary)`
- Line height: `var(--leading-normal)`

**Prototype Reference:** `styles.css` lines 45-78

```css
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  transition: var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

---

### Button Styles

#### Primary Button

**Visual Specs:**
- Background: `var(--primary)`
- Color: `#ffffff`
- Padding: 10px 16px
- Border radius: `var(--radius-md)`
- Font size: `var(--text-sm)`
- Font weight: `var(--font-medium)`
- Border: none
- Cursor: pointer

**Hover State:**
- Background: `var(--primary-hover)`
- Transform: `translateY(-1px)`
- Box shadow: `var(--shadow-md)`
- Transition: `var(--transition-base)`

**Active State:**
- Transform: `translateY(0)`
- Box shadow: `var(--shadow-sm)`

**Disabled State:**
- Background: `var(--bg-disabled)`
- Color: `var(--text-tertiary)`
- Cursor: not-allowed
- Opacity: 0.6

**Prototype Reference:** `styles.css` lines 120-155

```css
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background: var(--bg-disabled);
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}
```

#### Secondary Button

**Visual Specs:**
- Background: `var(--bg-card)`
- Color: `var(--text-primary)`
- Border: 1px solid `var(--border-color)`
- (All other specs same as primary)

**Hover State:**
- Background: `var(--bg-hover)`
- Border color: `var(--border-hover)`

---

### Input Fields

**Visual Specs:**
- Border: 1px solid `var(--border-color)`
- Border radius: `var(--radius-sm)`
- Padding: 8px 12px
- Font size: `var(--text-base)`
- Color: `var(--text-primary)`
- Background: `var(--bg-card)`
- Transition: `var(--transition-fast)`

**Focus State:**
- Border color: `var(--primary)`
- Outline: none
- Box shadow: `0 0 0 3px rgba(59, 130, 246, 0.1)`

**Disabled State:**
- Background: `var(--bg-disabled)`
- Color: `var(--text-tertiary)`
- Cursor: not-allowed

**Placeholder:**
- Color: `var(--text-tertiary)`
- Font style: normal

**Prototype Reference:** `styles.css` lines 180-210

```css
input, select, textarea {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-card);
  transition: border-color var(--transition-fast);
  font-family: var(--font-system);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

---

### Modal

**Visual Specs:**
- Fixed overlay: `rgba(0, 0, 0, 0.5)`
- Backdrop blur: `blur(4px)` (optional)
- Content width: 600px max
- Content background: `var(--bg-card)`
- Border radius: `var(--radius-xl)`
- Box shadow: `var(--shadow-xl)`
- Padding: `var(--spacing-xl)`
- Centered: `position: fixed`, `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`

**Modal Header:**
- Font size: `var(--text-2xl)`
- Font weight: `var(--font-bold)`
- Margin bottom: `var(--spacing-lg)`
- Border bottom: 1px solid `var(--border-color)`
- Padding bottom: `var(--spacing-md)`

**Modal Body:**
- Max height: `calc(100vh - 200px)`
- Overflow: auto

**Close Button:**
- Position: absolute, top: `var(--spacing-md)`, right: `var(--spacing-md)`
- Size: 32px × 32px
- Background: transparent
- Hover: `var(--bg-hover)`

**Prototype Reference:** `index.html` lines 250-310, `styles.css` lines 380-445

---

## 📊 Chart.js Configuration

### General Chart Settings

**Common Configuration:**
```javascript
{
  responsive: true,
  maintainAspectRatio: false, // Allow explicit height
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: {
          family: 'var(--font-system)',
          size: 14
        },
        padding: 16,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 14,
        weight: 600
      },
      bodyFont: {
        size: 13
      },
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: {
        display: false, // Cleaner look
        drawBorder: false
      },
      ticks: {
        font: {
          size: 12
        }
      }
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 12
        },
        padding: 8
      }
    }
  }
}
```

### Chart Heights
- **Standard chart:** 300px
- **Hero chart (main dashboard):** 400px
- **Small chart (compact view):** 200px

### Annotation Plugin (for events)

**Vertical Line Annotation:**
```javascript
{
  type: 'line',
  mode: 'vertical',
  scaleID: 'x',
  value: annotationDate,
  borderColor: impactColor, // --annotation-positive | --annotation-negative | --annotation-neutral
  borderWidth: 2,
  borderDash: [5, 5],
  label: {
    enabled: true,
    content: eventTitle,
    position: 'top',
    backgroundColor: impactColor,
    color: '#ffffff',
    font: {
      size: 11,
      weight: 600
    },
    padding: 4,
    cornerRadius: 4
  }
}
```

**Prototype Reference:** `js/charts.js` lines 120-280

---

## 🎭 Interaction Patterns

### Hover States

**Links:**
- Default: `color: var(--primary)`
- Hover: `color: var(--primary-hover)`, `text-decoration: underline`
- Transition: `var(--transition-fast)`

**Cards:**
- Default: `box-shadow: var(--shadow-sm)`
- Hover: `box-shadow: var(--shadow-md)`, `transform: translateY(-2px)`
- Transition: `var(--transition-base)`

**Buttons:**
- Default: `background: var(--primary)`
- Hover: `background: var(--primary-hover)`, `transform: translateY(-1px)`
- Active: `transform: translateY(0)`
- Transition: `var(--transition-base)`

---

### Focus States

**All Interactive Elements:**
- Outline: `2px solid var(--primary)`
- Outline offset: `2px`
- Box shadow: `0 0 0 3px rgba(59, 130, 246, 0.1)`

**Form Inputs:**
- Border color: `var(--primary)`
- Outline: `none` (use box-shadow instead)

---

### Loading States

**Skeleton Shimmer:**
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-disabled) 25%,
    var(--bg-hover) 50%,
    var(--bg-disabled) 75%
  );
  background-size: 2000px 100%;
  animation: shimmer 2s infinite;
  border-radius: var(--radius-md);
}
```

**Spinner (if needed):**
- Size: 24px × 24px
- Border: 3px solid `var(--border-color)`
- Border top color: `var(--primary)`
- Animation: Rotate 360deg in 1s

---

### Keyboard Shortcuts

**Global Shortcuts:**
- `Ctrl+N` / `Cmd+N`: Open annotation modal
- `Escape`: Close modal
- `Tab`: Navigate through interactive elements
- `Enter`: Submit form / activate button

**Accessibility:**
- All shortcuts have visual indicators
- Focus states are clearly visible
- Skip-to-content link for keyboard users

**Prototype Reference:** `index.html` lines 45-60 (keyboard listener)

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile: < 641px (base styles) */

/* Tablet: 641px - 1024px */
@media (min-width: 641px) {
  /* Layout adjustments */
}

/* Desktop: 1025px+ */
@media (min-width: 1025px) {
  /* Full layout */
}
```

### Responsive Patterns

**Grid Layout:**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns (or 2 for wider cards)

**Typography:**
- Mobile: `font-size: var(--text-base)`
- Desktop: `font-size: var(--text-lg)` (for hero text)

**Spacing:**
- Mobile: `var(--spacing-md)`
- Desktop: `var(--spacing-lg)` or `var(--spacing-xl)`

**Charts:**
- Always responsive (width: 100%)
- Height fixed (300px or 400px)

---

## ♿ Accessibility (WCAG AA)

### Color Contrast
- Text on white: ≥4.5:1 contrast ratio
- Large text: ≥3:1 contrast ratio
- All colors validated with WebAIM contrast checker

### Semantic HTML
- Use `<button>` for buttons (not `<div>`)
- Use `<main>`, `<header>`, `<nav>`, `<section>`, `<article>`
- Use `<label>` for form inputs

### ARIA Labels
- Icon buttons: `aria-label="descriptive text"`
- Modals: `role="dialog"`, `aria-labelledby`, `aria-describedby`
- Loading states: `aria-busy="true"`, `aria-live="polite"`

### Keyboard Navigation
- All interactive elements focusable
- Focus order logical (top → bottom, left → right)
- No keyboard traps
- Skip-to-content link

### Touch Targets
- Minimum size: 44px × 44px (iOS HIG, WCAG 2.5.5)
- Adequate spacing between targets

---

## 🎨 Component Examples (styled-components)

### Card Component

```javascript
import styled from 'styled-components';

export const Card = styled.div`
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  transition: var(--transition-base);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
`;

export const CardHeader = styled.h3`
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
`;

export const CardBody = styled.div`
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: var(--leading-normal);
`;
```

### Button Component

```javascript
export const Button = styled.button`
  background: ${props => props.variant === 'primary' ? 'var(--primary)' : 'var(--bg-card)'};
  color: ${props => props.variant === 'primary' ? '#ffffff' : 'var(--text-primary)'};
  border: ${props => props.variant === 'primary' ? 'none' : '1px solid var(--border-color)'};
  border-radius: var(--radius-md);
  padding: 10px 16px;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    background: ${props => props.variant === 'primary' ? 'var(--primary-hover)' : 'var(--bg-hover)'};
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--bg-disabled);
    color: var(--text-tertiary);
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
```

---

## Related Documentation

- `_context/reference/prototype-lessons.md` - Why this design works
- `_context/coding/react-conventions.md` - React component patterns
- `_context/coding/styled-components.md` - Styling patterns
- `.claude/agents/ux-ui-design-agent.md` - Agent for UI component design

---

**Remember:** 95%+ visual fidelity to the prototype is the goal. These design tokens and patterns are battle-tested and work well. Don't deviate without strong justification. 🎨

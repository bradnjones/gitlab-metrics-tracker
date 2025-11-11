/**
 * Design System Theme Object
 * Extracted from prototype styles.css (:root variables)
 * Use with styled-components ThemeProvider
 *
 * @see /Users/brad/dev/smi/gitlab-sprint-metrics/src/public/css/styles.css
 */
const theme = {
  colors: {
    // Primary palette
    primary: '#3b82f6',           // Blue - buttons, links, active states
    primaryDark: '#2563eb',       // Darker blue - hover states

    // Semantic colors
    success: '#10b981',           // Green - positive impact, success states
    warning: '#f59e0b',           // Orange - warnings, neutral impact
    danger: '#ef4444',            // Red - errors, negative impact, destructive actions
    info: '#8b5cf6',              // Purple - informational states

    // Text colors
    textPrimary: '#111827',       // Dark gray - headings, primary text
    textSecondary: '#6b7280',     // Medium gray - secondary text, labels

    // Background colors
    bgPrimary: '#ffffff',         // White - cards, surfaces
    bgSecondary: '#f9fafb',       // Very light gray - page background
    bgTertiary: '#f3f4f6',        // Light gray - hover states, disabled

    // Borders
    border: '#e5e7eb',            // Light gray - dividers, borders

    // Shadows (rgba values)
    shadow: 'rgba(0, 0, 0, 0.1)', // Standard shadow
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
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

    fontSize: {
      xs: '0.75rem',      // 12px - small labels, badges
      sm: '0.875rem',     // 14px - secondary text
      base: '1rem',       // 16px - body text
      lg: '1.125rem',     // 18px - large body text
      xl: '1.25rem',      // 20px - chart titles, card headings
      '2xl': '1.5rem',    // 24px - section titles
      '3xl': '2rem',      // 32px - page title
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.6,
      relaxed: 1.75,
    },
  },

  borderRadius: {
    sm: '4px',      // Small elements, badges
    md: '6px',      // Buttons, inputs, small cards
    lg: '8px',      // Cards, containers
    xl: '12px',     // Large cards, modals
  },

  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',                // Small elements
    md: '0 2px 8px rgba(0, 0, 0, 0.1)',                // Cards, elevated surfaces
    lg: '0 4px 6px rgba(0, 0, 0, 0.1)',                // Metric cards (gradient)
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',         // Modals, overlays
  },

  transitions: {
    fast: '0.15s',
    normal: '0.2s',
    slow: '0.3s',
    easing: 'ease-out',
  },

  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1400px',
  },
};

export { theme as default };

/**
 * Tests for SettingsModal component
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import SettingsModal from '../../../src/public/components/SettingsModal.jsx';

const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#e5e7eb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    danger: '#ef4444',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    fontWeight: {
      medium: '500',
      semibold: '600',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
    },
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
  },
  borderRadius: {
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  transitions: {
    fast: '150ms',
    normal: '200ms',
    easing: 'ease-in-out',
  },
  zIndex: {
    modal: 1000,
  },
};

const renderWithTheme = (component) => render(
  <ThemeProvider theme={theme}>{component}</ThemeProvider>
);

describe('SettingsModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnClose.mockClear();
  });

  test('renders nothing when isOpen is false', () => {
    renderWithTheme(
      <SettingsModal isOpen={false} onSave={mockOnSave} onClose={mockOnClose} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
  });

  test('renders the modal when isOpen is true', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );
    expect(screen.getByText('GitLab Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/Personal Access Token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Path/i)).toBeInTheDocument();
  });

  test('does not show Cancel button when hasCredentials is false', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={false} />
    );
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  test('shows Cancel button when hasCredentials is true', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={true} />
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={true} />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('calls onSave with trimmed credentials when form is submitted with valid data', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText(/Personal Access Token/i), '  glpat-abc123  ');
    await user.type(screen.getByLabelText(/Project Path/i), '  group/project  ');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).toHaveBeenCalledWith({
      gitlabToken: 'glpat-abc123',
      projectPath: 'group/project',
    });
  });

  test('shows validation error when token is empty on submit', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText(/Project Path/i), 'group/project');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Personal Access Token is required/i)).toBeInTheDocument();
  });

  test('shows validation error when project path is empty on submit', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText(/Personal Access Token/i), 'glpat-abc123');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Project path is required/i)).toBeInTheDocument();
  });

  test('overlay click does NOT close when hasCredentials is false', async () => {
    const user = userEvent.setup();
    const { container } = renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={false} />
    );

    // Click the overlay (first fixed div)
    const overlay = container.firstChild;
    fireEvent.click(overlay);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('overlay click closes when hasCredentials is true', () => {
    const { container } = renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={true} />
    );

    const overlay = container.firstChild;
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('Escape key closes modal when hasCredentials is true', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={true} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('Escape key does NOT close modal when hasCredentials is false', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} hasCredentials={false} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('shows memory-only notice', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );
    expect(screen.getByText(/held in browser memory only/i)).toBeInTheDocument();
    expect(screen.getByText(/never saved to disk/i)).toBeInTheDocument();
  });

  test('token input has type password and autoComplete off', () => {
    renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );
    const tokenInput = screen.getByLabelText(/Personal Access Token/i);
    expect(tokenInput).toHaveAttribute('type', 'password');
    expect(tokenInput).toHaveAttribute('autoComplete', 'off');
  });

  test('resets form state when modal reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithTheme(
      <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText(/Personal Access Token/i), 'some-value');

    // Close and reopen
    rerender(
      <ThemeProvider theme={theme}>
        <SettingsModal isOpen={false} onSave={mockOnSave} onClose={mockOnClose} />
      </ThemeProvider>
    );
    rerender(
      <ThemeProvider theme={theme}>
        <SettingsModal isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />
      </ThemeProvider>
    );

    // Field should be empty again
    expect(screen.getByLabelText(/Personal Access Token/i)).toHaveValue('');
  });
});

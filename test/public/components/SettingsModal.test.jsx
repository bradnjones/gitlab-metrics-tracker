/**
 * Tests for SettingsView (SettingsModal.jsx)
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
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
      bold: '700',
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

describe('SettingsModal (inline view)', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  test('renders the settings view with title and fields', () => {
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/Personal Access Token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Path/i)).toBeInTheDocument();
  });

  test('shows credentials persistence notice', () => {
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    expect(screen.getByText(/saved to browser localStorage/i)).toBeInTheDocument();
  });

  // ── Manual tab ──────────────────────────────────────────────────────────────

  test('calls onSave with trimmed credentials on valid manual submit', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.type(screen.getByLabelText(/Personal Access Token/i), '  glpat-abc123  ');
    await user.type(screen.getByLabelText(/Project Path/i), '  group/project  ');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(mockOnSave).toHaveBeenCalledWith({ gitlabToken: 'glpat-abc123', projectPath: 'group/project', anthropicApiKey: '' });
  });

  test('shows success banner after saving', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.type(screen.getByLabelText(/Personal Access Token/i), 'glpat-abc123');
    await user.type(screen.getByLabelText(/Project Path/i), 'group/project');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByText(/Credentials saved/i)).toBeInTheDocument();
  });

  test('shows error when token is empty on manual submit', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.type(screen.getByLabelText(/Project Path/i), 'group/project');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Personal Access Token is required/i)).toBeInTheDocument();
  });

  test('shows error when project path is empty on manual submit', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.type(screen.getByLabelText(/Personal Access Token/i), 'glpat-abc123');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Project path is required/i)).toBeInTheDocument();
  });

  test('token input has type text and autoComplete off', () => {
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    const input = screen.getByLabelText(/Personal Access Token/i);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('autoComplete', 'off');
  });

  // ── Import JSON tab ─────────────────────────────────────────────────────────

  test('switches to Import JSON tab and shows textarea', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /import json/i }));
    expect(screen.getByLabelText(/paste config json/i)).toBeInTheDocument();
  });

  test('imports valid JSON and calls onSave', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /import json/i }));
    fireEvent.change(screen.getByLabelText(/paste config json/i), {
      target: { value: '{"gitlabToken":"glpat-xyz","projectPath":"org/repo"}' },
    });
    await user.click(screen.getByRole('button', { name: /import & save/i }));
    expect(mockOnSave).toHaveBeenCalledWith({ gitlabToken: 'glpat-xyz', projectPath: 'org/repo', anthropicApiKey: '' });
  });

  test('shows error for invalid JSON on import', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /import json/i }));
    fireEvent.change(screen.getByLabelText(/paste config json/i), {
      target: { value: 'not json at all' },
    });
    await user.click(screen.getByRole('button', { name: /import & save/i }));
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
  });

  test('shows error when gitlabToken field is missing from imported JSON', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /import json/i }));
    fireEvent.change(screen.getByLabelText(/paste config json/i), {
      target: { value: '{"projectPath":"org/repo"}' },
    });
    await user.click(screen.getByRole('button', { name: /import & save/i }));
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText(/gitlabToken/i)).toBeInTheDocument();
  });

  test('shows error when projectPath field is missing from imported JSON', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SettingsModal onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /import json/i }));
    fireEvent.change(screen.getByLabelText(/paste config json/i), {
      target: { value: '{"gitlabToken":"glpat-xyz"}' },
    });
    await user.click(screen.getByRole('button', { name: /import & save/i }));
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText(/projectPath/i)).toBeInTheDocument();
  });

  // ── Export JSON tab ─────────────────────────────────────────────────────────

  test('Export JSON tab is only shown when hasCredentials is true', () => {
    renderWithTheme(<SettingsModal onSave={mockOnSave} hasCredentials={false} />);
    expect(screen.queryByRole('button', { name: /export json/i })).not.toBeInTheDocument();
  });

  test('Export JSON tab shows current credentials as JSON', async () => {
    const user = userEvent.setup();
    const creds = { gitlabToken: 'glpat-abc', projectPath: 'myorg/myrepo' };
    renderWithTheme(
      <SettingsModal onSave={mockOnSave} hasCredentials={true} currentCredentials={creds} />
    );
    await user.click(screen.getByRole('button', { name: /export json/i }));
    const textarea = screen.getByLabelText(/exported config json/i);
    expect(textarea).toHaveValue(JSON.stringify(creds, null, 2));
    expect(textarea).toHaveAttribute('readonly');
  });
});

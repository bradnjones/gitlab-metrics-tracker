/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import userEvent from '@testing-library/user-event';
import HamburgerMenu from '../../../src/public/components/HamburgerMenu.jsx';

// Minimal theme object (consistent with AnnotationsList.test.jsx)
const theme = {
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      medium: '500',
      bold: '700',
    },
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
  },
  borderRadius: {
    md: '0.375rem',
    lg: '0.5rem',
  },
  shadows: {
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms',
    easing: 'ease-in-out',
  },
  zIndex: {
    dropdown: 1000,
  },
};

describe('HamburgerMenu', () => {
  const mockOnManageAnnotations = jest.fn();
  const mockOnAddAnnotation = jest.fn();
  const mockOnChangeSprints = jest.fn();
  const mockOnExportCSV = jest.fn();

  beforeEach(() => {
    mockOnManageAnnotations.mockClear();
    mockOnAddAnnotation.mockClear();
    mockOnChangeSprints.mockClear();
    mockOnExportCSV.mockClear();
  });

  const renderWithTheme = (component) => {
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  test('renders hamburger button with correct ARIA attributes and click toggles menu visibility', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    renderWithTheme(
      <HamburgerMenu
        onManageAnnotations={mockOnManageAnnotations}
        onAddAnnotation={mockOnAddAnnotation}
        onChangeSprints={mockOnChangeSprints}
      />
    );

    // Assert - Button rendered
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'true');

    // Assert - Menu initially closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Act - Click to open
    await user.click(button);

    // Assert - Menu opens, aria-expanded updates
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Act - Click to close
    await user.click(button);

    // Assert - Menu closes
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('renders four menu items and calls correct callback prop when each item is clicked', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    renderWithTheme(
      <HamburgerMenu
        onManageAnnotations={mockOnManageAnnotations}
        onAddAnnotation={mockOnAddAnnotation}
        onChangeSprints={mockOnChangeSprints}
        onExportCSV={mockOnExportCSV}
        canExport={true}
      />
    );

    // Open menu
    const button = screen.getByRole('button', { name: 'Menu' });
    await user.click(button);

    // Assert - Four menu items are rendered
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(4);

    // Assert - Menu items have correct text
    expect(screen.getByText('Manage Annotations')).toBeInTheDocument();
    expect(screen.getByText('Add Annotation')).toBeInTheDocument();
    expect(screen.getByText('Change Sprints')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();

    // Act - Click "Manage Annotations"
    await user.click(screen.getByText('Manage Annotations'));

    // Assert - Callback called and menu closed
    expect(mockOnManageAnnotations).toHaveBeenCalledTimes(1);
    expect(mockOnManageAnnotations).toHaveBeenCalledWith();
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    // Re-open menu for next test
    await user.click(button);

    // Act - Click "Add Annotation"
    await user.click(screen.getByText('Add Annotation'));

    // Assert - Callback called and menu closed
    expect(mockOnAddAnnotation).toHaveBeenCalledTimes(1);
    expect(mockOnAddAnnotation).toHaveBeenCalledWith();
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    // Re-open menu for next test
    await user.click(button);

    // Act - Click "Change Sprints"
    await user.click(screen.getByText('Change Sprints'));

    // Assert - Callback called and menu closed
    expect(mockOnChangeSprints).toHaveBeenCalledTimes(1);
    expect(mockOnChangeSprints).toHaveBeenCalledWith();
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    // Re-open menu for Export CSV test
    await user.click(button);

    // Act - Click "Export CSV"
    await user.click(screen.getByText('Export CSV'));

    // Assert - Callback called and menu closed
    expect(mockOnExportCSV).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('Export CSV item is disabled when canExport is false', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <HamburgerMenu
        onManageAnnotations={mockOnManageAnnotations}
        onAddAnnotation={mockOnAddAnnotation}
        onChangeSprints={mockOnChangeSprints}
        onExportCSV={mockOnExportCSV}
        canExport={false}
      />
    );

    const button = screen.getByRole('button', { name: 'Menu' });
    await user.click(button);

    const exportItem = screen.getByText('Export CSV').closest('[role="menuitem"]');
    expect(exportItem).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByText('Export CSV'));
    expect(mockOnExportCSV).not.toHaveBeenCalled();
  });

  test('Export CSV item shows "Exporting..." while in-flight', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <HamburgerMenu
        onManageAnnotations={mockOnManageAnnotations}
        onAddAnnotation={mockOnAddAnnotation}
        onChangeSprints={mockOnChangeSprints}
        onExportCSV={mockOnExportCSV}
        canExport={true}
        exporting={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Menu' });
    await user.click(button);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.queryByText('Export CSV')).not.toBeInTheDocument();
  });

  test('closes menu when clicking outside dropdown and when Escape key is pressed', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act - Render with wrapper to click outside
    const { container } = renderWithTheme(
      <div data-testid="outside">
        <HamburgerMenu
          onManageAnnotations={mockOnManageAnnotations}
          onAddAnnotation={mockOnAddAnnotation}
          onChangeSprints={mockOnChangeSprints}
        />
      </div>
    );

    // Open menu
    const button = screen.getByRole('button', { name: 'Menu' });
    await user.click(button);

    // Assert - Menu is open
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Act - Click outside the menu
    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    // Assert - Menu closes
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    // Re-open menu for Escape key test
    await user.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Act - Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // Assert - Menu closes
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});

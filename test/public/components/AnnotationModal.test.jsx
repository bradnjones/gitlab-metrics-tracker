/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AnnotationModal from '../../../src/public/components/AnnotationModal.jsx';

// Mock theme object matching application theme
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  shadows: { md: '0 2px 8px rgba(0, 0, 0, 0.1)', lg: '0 4px 16px rgba(0, 0, 0, 0.2)' },
  typography: {
    fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
    fontWeight: { medium: 500, semibold: 600, bold: 700 },
    lineHeight: { normal: 1.5 },
  },
  breakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px' },
  transitions: { normal: '200ms', easing: 'ease-in-out' },
  zIndex: { modal: 1000 },
};

describe('AnnotationModal', () => {
  /**
   * Test 1: Does not render when isOpen is false
   * Verifies modal is hidden when not open
   */
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={false}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Modal should not be in the document
    expect(container.firstChild).toBeNull();
  });

  /**
   * Test 2: Renders modal with "Add Annotation" title in create mode
   * Verifies modal structure and create mode title
   */
  test('renders modal with "Add Annotation" title in create mode', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          annotation={null}
        />
      </ThemeProvider>
    );

    // Should show "Add Annotation" title
    expect(screen.getByText('Add Annotation')).toBeInTheDocument();

    // Should have all form fields
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Affected Metrics')).toBeInTheDocument();

    // Should have Cancel and Save buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  /**
   * Test 3: Renders modal with "Edit Annotation" title in edit mode
   * Verifies edit mode title when annotation prop is provided
   */
  test('renders modal with "Edit Annotation" title in edit mode', () => {
    const existingAnnotation = {
      id: 'annotation-1',
      date: '2025-11-14',
      title: 'Test Annotation',
      description: 'Test description',
      type: 'process',
      impact: 'positive',
      affectedMetrics: ['velocity'],
    };

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          annotation={existingAnnotation}
        />
      </ThemeProvider>
    );

    // Should show "Edit Annotation" title
    expect(screen.getByText('Edit Annotation')).toBeInTheDocument();
  });

  /**
   * Test 4: Populates form fields in edit mode
   * Verifies form is pre-populated with existing annotation data
   */
  test('populates form fields with existing annotation data in edit mode', () => {
    const existingAnnotation = {
      id: 'annotation-1',
      date: '2025-11-14',
      title: 'Team Change',
      description: 'New developer joined',
      type: 'team',
      impact: 'neutral',
      affectedMetrics: ['velocity', 'cycle_time_avg'],
    };

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          annotation={existingAnnotation}
        />
      </ThemeProvider>
    );

    // Verify all fields are populated
    expect(screen.getByLabelText('Date')).toHaveValue('2025-11-14');
    expect(screen.getByLabelText('Title')).toHaveValue('Team Change');
    expect(screen.getByLabelText('Description')).toHaveValue('New developer joined');
    expect(screen.getByLabelText('Type')).toHaveValue('team');
    expect(screen.getByLabelText('Impact')).toHaveValue('neutral');

    // Verify affected metrics checkboxes are checked
    const velocityCheckbox = screen.getByRole('checkbox', { name: /Velocity/i });
    const cycleTimeCheckbox = screen.getByRole('checkbox', { name: /Cycle Time/i });
    const deploymentFrequencyCheckbox = screen.getByRole('checkbox', { name: /Deployment Frequency/i });

    expect(velocityCheckbox).toBeChecked();
    expect(cycleTimeCheckbox).toBeChecked();
    expect(deploymentFrequencyCheckbox).not.toBeChecked();
  });

  /**
   * Test 5: Initializes form with default values in create mode
   * Verifies form fields start empty/default in create mode
   */
  test('initializes form with default values in create mode', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          annotation={null}
        />
      </ThemeProvider>
    );

    // Date should default to today's date
    const today = new Date().toISOString().split('T')[0];
    expect(screen.getByLabelText('Date')).toHaveValue(today);

    // Other fields should be empty
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Type')).toHaveValue('');
    expect(screen.getByLabelText('Impact')).toHaveValue('');

    // No metrics should be selected
    const velocityCheckbox = screen.getByRole('checkbox', { name: /Velocity/i });
    expect(velocityCheckbox).not.toBeChecked();
  });

  /**
   * Test 6: Calls onClose when Cancel button is clicked
   * Verifies cancel callback is invoked
   */
  test('calls onClose when Cancel button is clicked', () => {
    const mockOnClose = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Click Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should call onClose callback
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 7: Calls onClose when close button (×) is clicked
   * Verifies close button in header works
   */
  test('calls onClose when close button (×) is clicked', () => {
    const mockOnClose = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Find close button by aria-label
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    // Should call onClose callback
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 8: Calls onClose when clicking modal backdrop
   * Verifies clicking outside modal closes it
   */
  test('calls onClose when clicking modal backdrop', () => {
    const mockOnClose = jest.fn();

    const { container } = render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Click backdrop (first child is the overlay)
    const backdrop = container.firstChild;
    fireEvent.click(backdrop);

    // Should call onClose callback
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 9: Does not close modal when clicking inside modal content
   * Verifies overlay click handler only triggers for backdrop
   */
  test('does not close modal when clicking inside modal content', () => {
    const mockOnClose = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Click inside modal (on title)
    const title = screen.getByText('Add Annotation');
    fireEvent.click(title);

    // Should NOT call onClose
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  /**
   * Test 10: Calls onClose when Escape key is pressed
   * Verifies keyboard accessibility
   */
  test('calls onClose when Escape key is pressed', () => {
    const mockOnClose = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    // Should call onClose callback
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 11: Updates form fields when user types
   * Verifies controlled input behavior
   */
  test('updates form fields when user types', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Type in title field
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'New Annotation' } });
    expect(titleInput).toHaveValue('New Annotation');

    // Type in description field
    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    expect(descriptionInput).toHaveValue('Test description');

    // Change date
    const dateInput = screen.getByLabelText('Date');
    fireEvent.change(dateInput, { target: { value: '2025-11-15' } });
    expect(dateInput).toHaveValue('2025-11-15');
  });

  /**
   * Test 12: Updates select dropdowns when user selects option
   * Verifies select field behavior
   */
  test('updates select dropdowns when user selects option', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Select type
    const typeSelect = screen.getByLabelText('Type');
    fireEvent.change(typeSelect, { target: { value: 'process' } });
    expect(typeSelect).toHaveValue('process');

    // Select impact
    const impactSelect = screen.getByLabelText('Impact');
    fireEvent.change(impactSelect, { target: { value: 'positive' } });
    expect(impactSelect).toHaveValue('positive');
  });

  /**
   * Test 13: Toggles affected metrics checkboxes
   * Verifies multi-select checkbox behavior
   */
  test('toggles affected metrics checkboxes', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Get checkboxes
    const velocityCheckbox = screen.getByRole('checkbox', { name: /Velocity/i });
    const cycleTimeCheckbox = screen.getByRole('checkbox', { name: /Cycle Time/i });

    // Initially unchecked
    expect(velocityCheckbox).not.toBeChecked();
    expect(cycleTimeCheckbox).not.toBeChecked();

    // Check velocity
    fireEvent.click(velocityCheckbox);
    expect(velocityCheckbox).toBeChecked();

    // Check cycle time
    fireEvent.click(cycleTimeCheckbox);
    expect(cycleTimeCheckbox).toBeChecked();

    // Uncheck velocity
    fireEvent.click(velocityCheckbox);
    expect(velocityCheckbox).not.toBeChecked();
    expect(cycleTimeCheckbox).toBeChecked(); // Should still be checked
  });

  /**
   * Test 14: Calls onSave with form data when Save button is clicked
   * Verifies form submission with correct data structure
   */
  test('calls onSave with form data when Save button is clicked', () => {
    const mockOnSave = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={mockOnSave}
        />
      </ThemeProvider>
    );

    // Fill out form
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-11-14' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Annotation' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test description' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'process' } });
    fireEvent.change(screen.getByLabelText('Impact'), { target: { value: 'positive' } });

    // Select some metrics
    fireEvent.click(screen.getByRole('checkbox', { name: /Velocity/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Cycle Time/i }));

    // Submit form
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should call onSave with form data
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({
      date: '2025-11-14',
      title: 'Test Annotation',
      description: 'Test description',
      type: 'process',
      impact: 'positive',
      affectedMetrics: ['velocity', 'cycle_time_avg'],
      color: '#3b82f6',
    });
  });

  /**
   * Test 15: Calls onSave with updated data in edit mode
   * Verifies form submission preserves unchanged fields
   */
  test('calls onSave with updated data in edit mode', () => {
    const mockOnSave = jest.fn();
    const existingAnnotation = {
      id: 'annotation-1',
      date: '2025-11-14',
      title: 'Original Title',
      description: 'Original description',
      type: 'team',
      impact: 'neutral',
      affectedMetrics: ['velocity'],
    };

    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={mockOnSave}
          annotation={existingAnnotation}
        />
      </ThemeProvider>
    );

    // Update only title and impact
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });
    fireEvent.change(screen.getByLabelText('Impact'), { target: { value: 'positive' } });

    // Submit form
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should call onSave with updated data
    expect(mockOnSave).toHaveBeenCalledWith({
      date: '2025-11-14',
      title: 'Updated Title',
      description: 'Original description',
      type: 'team',
      impact: 'positive',
      affectedMetrics: ['velocity'],
      color: '#3b82f6',
    });
  });

  /**
   * Test 16: Auto-focuses date field when modal opens
   * Verifies accessibility and UX for keyboard navigation
   */
  test('auto-focuses date field when modal opens', async () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Wait for auto-focus (has 100ms delay)
    await waitFor(() => {
      const dateInput = screen.getByLabelText('Date');
      expect(dateInput).toHaveFocus();
    }, { timeout: 200 });
  });

  /**
   * Test 17: Renders all event type options
   * Verifies dropdown contains correct event types from prototype
   */
  test('renders all event type options', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    const typeSelect = screen.getByLabelText('Type');

    // Should have all event types
    expect(typeSelect).toContainHTML('<option value="">Select type</option>');
    expect(typeSelect).toContainHTML('<option value="process">Process Change</option>');
    expect(typeSelect).toContainHTML('<option value="team">Team Change</option>');
    expect(typeSelect).toContainHTML('<option value="tooling">Tooling Update</option>');
    expect(typeSelect).toContainHTML('<option value="external">External Factor</option>');
    expect(typeSelect).toContainHTML('<option value="incident">Incident</option>');
  });

  /**
   * Test 18: Renders all impact options
   * Verifies dropdown contains correct impact options from prototype
   */
  test('renders all impact options', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    const impactSelect = screen.getByLabelText('Impact');

    // Should have all impact options
    expect(impactSelect).toContainHTML('<option value="">Select impact</option>');
    expect(impactSelect).toContainHTML('<option value="positive">Positive</option>');
    expect(impactSelect).toContainHTML('<option value="negative">Negative</option>');
    expect(impactSelect).toContainHTML('<option value="neutral">Neutral</option>');
  });

  /**
   * Test 19: Renders all affected metrics checkboxes
   * Verifies all 7 core metrics are available for selection
   */
  test('renders all affected metrics checkboxes', () => {
    render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Should have all 6 metrics (Velocity + 5 DORA metrics)
    expect(screen.getByRole('checkbox', { name: /Velocity/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cycle Time/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Deployment Frequency/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Lead Time/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /MTTR/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Change Failure Rate/i })).toBeInTheDocument();
  });

  /**
   * Test 20: Prevents body scroll when modal is open
   * Verifies body scroll lock for better UX
   */
  test('prevents body scroll when modal is open', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={false}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Body scroll should be normal initially
    expect(document.body.style.overflow).toBe('');

    // Open modal
    rerender(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Body scroll should be hidden
    expect(document.body.style.overflow).toBe('hidden');

    // Close modal
    rerender(
      <ThemeProvider theme={theme}>
        <AnnotationModal
          isOpen={false}
          onClose={() => {}}
          onSave={() => {}}
        />
      </ThemeProvider>
    );

    // Body scroll should be restored
    expect(document.body.style.overflow).toBe('');
  });
});

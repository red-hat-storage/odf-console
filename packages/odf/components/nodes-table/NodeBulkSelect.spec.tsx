import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeBulkSelect } from './NodeBulkSelect';

// Override the globally-mocked (non-interpolating) translation hook so that
// interpolated strings like "{{count}} selected" render with real values,
// letting us assert the selected count text.
jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_match, name) =>
        String(options?.[name] ?? '')
      ),
  }),
}));

const defaultProps = {
  selectedCount: 0,
  isAllSelected: false,
  isPartiallySelected: false,
  onSelectAll: jest.fn(),
  onSelectNone: jest.fn(),
};

describe('NodeBulkSelect', () => {
  it('shows no count text when nothing is selected', () => {
    render(<NodeBulkSelect {...defaultProps} />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('shows the selected count text when nodes are selected', () => {
    render(<NodeBulkSelect {...defaultProps} selectedCount={3} />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('renders the checkbox checked when all nodes are selected', () => {
    render(
      <NodeBulkSelect {...defaultProps} selectedCount={2} isAllSelected />
    );
    const checkbox = screen.getByLabelText('Select all') as HTMLInputElement;
    expect(checkbox).toBeChecked();
    expect(checkbox.indeterminate).toBe(false);
  });

  it('renders the checkbox indeterminate when partially selected', () => {
    render(
      <NodeBulkSelect {...defaultProps} selectedCount={1} isPartiallySelected />
    );
    const checkbox = screen.getByLabelText('Select all') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it('selects all via the checkbox when nothing is selected', async () => {
    const onSelectAll = jest.fn();
    render(<NodeBulkSelect {...defaultProps} onSelectAll={onSelectAll} />);
    await userEvent.click(screen.getByLabelText('Select all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('deselects all via the checkbox when something is selected', async () => {
    const onSelectNone = jest.fn();
    render(
      <NodeBulkSelect
        {...defaultProps}
        selectedCount={2}
        isAllSelected
        onSelectNone={onSelectNone}
      />
    );
    await userEvent.click(screen.getByLabelText('Select all'));
    expect(onSelectNone).toHaveBeenCalledTimes(1);
  });

  it('exposes "Select all" and "Select none" dropdown actions', async () => {
    const onSelectAll = jest.fn();
    const onSelectNone = jest.fn();
    render(
      <NodeBulkSelect
        {...defaultProps}
        onSelectAll={onSelectAll}
        onSelectNone={onSelectNone}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Bulk selection' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Select all' }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole('button', { name: 'Bulk selection' })
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Select none' })
    );
    expect(onSelectNone).toHaveBeenCalledTimes(1);
  });
});

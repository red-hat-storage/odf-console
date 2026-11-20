import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolbarItem } from '@patternfly/react-core';
import { NodeSearchToolbar } from './NodeSearchToolbar';

// The global mock returns the key verbatim, which is all this component needs
// (its only translated string is the default placeholder).

describe('NodeSearchToolbar', () => {
  it('renders the default placeholder and reflects the query value', () => {
    render(<NodeSearchToolbar query="worker-1" onQueryChange={jest.fn()} />);
    const input = screen.getByPlaceholderText(
      'Find by name, label, or taint'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('worker-1');
  });

  it('accepts a custom placeholder', () => {
    render(
      <NodeSearchToolbar
        query=""
        onQueryChange={jest.fn()}
        placeholder="Search nodes"
      />
    );
    expect(screen.getByPlaceholderText('Search nodes')).toBeInTheDocument();
  });

  it('calls onQueryChange as the user types', async () => {
    const onQueryChange = jest.fn();
    render(<NodeSearchToolbar query="" onQueryChange={onQueryChange} />);

    await userEvent.type(
      screen.getByPlaceholderText('Find by name, label, or taint'),
      'x'
    );
    expect(onQueryChange).toHaveBeenCalledWith('x');
  });

  it('calls onQueryChange with an empty string when cleared', async () => {
    const onQueryChange = jest.fn();
    render(<NodeSearchToolbar query="worker" onQueryChange={onQueryChange} />);

    // The reset/clear button only appears once there is a value.
    await userEvent.click(screen.getByRole('button', { name: /reset|clear/i }));
    expect(onQueryChange).toHaveBeenCalledWith('');
  });

  it('renders extra toolbar items passed as children', () => {
    render(
      <NodeSearchToolbar query="" onQueryChange={jest.fn()}>
        <ToolbarItem>
          <button type="button">Bulk select</button>
        </ToolbarItem>
      </NodeSearchToolbar>
    );
    expect(
      screen.getByRole('button', { name: 'Bulk select' })
    ).toBeInTheDocument();
  });
});

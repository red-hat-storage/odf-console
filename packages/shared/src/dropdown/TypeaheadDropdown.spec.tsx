import React, { ReactNode } from 'react';
import { Screen, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectOptionProps } from '@patternfly/react-core';
import { TypeaheadDropdown } from './TypeaheadDropdown';

const getOption = (rtlScreen: Screen, name: ReactNode) =>
  rtlScreen.queryByRole('option', {
    name: new RegExp(name as string, 'i'),
  });
const getTypeaheadDropdown = (rtlScreen: Screen) =>
  rtlScreen.getByRole<HTMLInputElement>('combobox', {
    name: /type to filter/i,
  });
const items: SelectOptionProps[] = [
  { value: '100', children: '100 TiB' },
  { value: '120', children: '120 TiB' },
  { value: '125', children: '125 TiB' },
  { value: '200', children: '200 TiB' },
  { value: '512', children: '512 TiB' },
];
let onSelect: jest.MockedFunction<(selected: string) => void>;

describe('TypeaheadDropdown', () => {
  it('has empty value if the preselected value does not match any option', () => {
    const selectedValue = 'nonexistent';
    render(<TypeaheadDropdown items={items} selectedValue={selectedValue} />);

    expect(getTypeaheadDropdown(screen)).toHaveValue('');
  });

  it('selects the option value that matches the preselected value text', () => {
    onSelect = jest.fn();
    render(
      <TypeaheadDropdown
        items={items}
        selectedValue="100"
        onSelect={onSelect}
      />
    );

    expect(getTypeaheadDropdown(screen)).toHaveValue(items[0].children);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the option value that matches the preselected value number', () => {
    render(
      <TypeaheadDropdown
        items={items}
        selectedValue={100}
        onSelect={onSelect}
      />
    );

    expect(getTypeaheadDropdown(screen)).toHaveValue(items[0].children);
  });

  it('selects the option value that matches the preselected value on re-render', () => {
    onSelect = jest.fn();
    const { rerender } = render(
      <TypeaheadDropdown items={items} onSelect={onSelect} />
    );

    expect(getTypeaheadDropdown(screen)).toHaveValue('');
    expect(onSelect).not.toHaveBeenCalled();

    rerender(<TypeaheadDropdown items={items} selectedValue="200" />);

    expect(getTypeaheadDropdown(screen)).toHaveValue(items[3].children);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the option value selected by the user', async () => {
    const user = userEvent.setup();
    onSelect = jest.fn();
    render(<TypeaheadDropdown items={items} onSelect={onSelect} />);

    const typeaheadDropdown = getTypeaheadDropdown(screen);
    await user.click(typeaheadDropdown);
    await user.click(getOption(screen, items[3].children) as Element);

    expect(typeaheadDropdown).toHaveValue(items[3].children);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(items[3].value);
  });

  it('clears the value on "Clear Button" click', async () => {
    const user = userEvent.setup();
    onSelect = jest.fn();
    render(
      <TypeaheadDropdown
        items={items}
        selectedValue={100}
        onSelect={onSelect}
      />
    );

    const typeaheadDropdown = getTypeaheadDropdown(screen);
    expect(typeaheadDropdown).toHaveValue(items[0].children);

    const clearButton = screen.getByRole('button', {
      name: /clear selected value/i,
    });
    expect(clearButton).toBeVisible();
    await user.click(clearButton);

    expect(typeaheadDropdown).toHaveValue('');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('shows the options matching the typed text (typeahead)', async () => {
    const user = userEvent.setup();
    render(<TypeaheadDropdown items={items} />);

    const typeaheadDropdown = getTypeaheadDropdown(screen);
    await user.click(typeaheadDropdown);

    expect(getOption(screen, items[0].children)).toBeVisible();

    await user.type(typeaheadDropdown, '12');

    expect(getOption(screen, items[0].children)).not.toBeInTheDocument();
    expect(getOption(screen, items[1].children)).toBeVisible();
    expect(getOption(screen, items[2].children)).toBeVisible();
    expect(getOption(screen, items[3].children)).not.toBeInTheDocument();
    expect(getOption(screen, items[4].children)).toBeVisible();

    await user.type(typeaheadDropdown, '5');

    expect(getOption(screen, items[0].children)).not.toBeInTheDocument();
    expect(getOption(screen, items[1].children)).not.toBeInTheDocument();
    expect(getOption(screen, items[2].children)).toBeVisible();
    expect(getOption(screen, items[3].children)).not.toBeInTheDocument();
    expect(getOption(screen, items[4].children)).not.toBeInTheDocument();
  });
});

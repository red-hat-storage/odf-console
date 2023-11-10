import * as React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { LabelExpressionSelector } from './labelExpressionSelector';

const getOptions = () => ({
  'option-1': {
    key: {
      text: 'option-1',
    },
    values: [{ text: 'value-1' }, { text: 'value-2' }],
  },
  'option-2': {
    key: {
      text: 'option-2',
    },
    values: [{ text: 'value-3' }, { text: 'value-4' }],
  },
});

describe('Label expression selector', () => {
  test('Verify expression selection', async () => {
    const onChange = jest.fn();
    render(
      <LabelExpressionSelector
        options={getOptions()}
        addString={'Add resource'}
        onChange={onChange}
      />
    );
    // Verify add resource
    fireEvent.click(screen.getByText('Add resource'));

    // Verify expand section before selection
    expect(screen.getByText('Expand to enter expression')).toBeInTheDocument();

    // Verify header text
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();

    // Verify label selection
    fireEvent.click(screen.getByText('Select a label'));
    expect(screen.getByText('option-1')).toBeInTheDocument();
    expect(screen.getByText('option-2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('option-1'));
    expect(screen.getByText('option-1')).toBeInTheDocument();

    // Verify operator selection
    fireEvent.click(screen.getByText('In'));
    expect(screen.getByText('NotIn')).toBeInTheDocument();
    expect(screen.getByText('Exists')).toBeInTheDocument();
    expect(screen.getByText('DoesNotExist')).toBeInTheDocument();
    fireEvent.click(screen.getByText('NotIn'));
    expect(screen.getByText('NotIn')).toBeInTheDocument();

    // Verify values for option-1
    fireEvent.click(screen.getByText('Select the values'));
    fireEvent.click(screen.getByText('value-1'));
    fireEvent.click(screen.getByText('value-2'));
    expect(screen.getByText('{{count}} selected')).toBeInTheDocument();

    // Verify expand section after selection
    expect(
      screen.getByText('option-1 does not equal any of value-1, value-2')
    ).toBeInTheDocument();
  });

  test('Verify error validation', async () => {
    const onChange = jest.fn();
    render(
      <LabelExpressionSelector
        options={getOptions()}
        addString={'Add resource'}
        onChange={onChange}
        isValidationEnabled={true}
        preSelected={[
          {
            key: '',
            operator: 'In',
            values: [],
          },
        ]}
      />
    );
    // Verify validation error message
    const errors = screen.getAllByText('Required');
    expect(errors).toHaveLength(2);
    expect(
      screen.getByText('Expand to fix validation errors')
    ).toBeInTheDocument();
  });
});

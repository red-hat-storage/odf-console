import * as React from 'react';
import { MatchExpression } from '@openshift-console/dynamic-plugin-sdk';
import { screen, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LabelExpressionSelector } from './labelExpressionSelector';

const getLabels = () => ({
  'option-1': ['value-1', 'value-2'],
  'option-2': ['value-3', 'value-4'],
});

describe('Label expression selector', () => {
  test('Verify expression selection', async () => {
    const user = userEvent.setup();
    let selectedExpression: MatchExpression[] = [];
    const onChange = jest.fn((expression: MatchExpression[]) => {
      selectedExpression = expression;
    });

    const component = () => (
      <LabelExpressionSelector
        labels={getLabels()}
        addExpressionString={'Add resource'}
        onChange={onChange}
        isValidationEnabled={false}
        selectedExpressions={selectedExpression}
      />
    );

    const { rerender } = render(component());

    // Verify add resource
    await userEvent.click(screen.getByText('Add resource'));

    // Rerender after argument change
    rerender(component());

    // Verify expand section before selection
    expect(screen.getByText('Expand to enter expression')).toBeInTheDocument();

    // Verify header text
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();

    // Step 1: Select label
    const labelInput =
      screen.queryByPlaceholderText(/select a label/i) ||
      screen.queryByRole('textbox', { name: /type to filter/i });

    if (!labelInput) {
      throw new Error('Could not find the "Select a label" input field');
    }

    await user.click(labelInput);

    // Wait for dropdown options to appear
    const option1 = await screen.findByText('option-1');
    const option2 = await screen.findByText('option-2');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();

    await user.click(option1);

    rerender(component());
    expect(screen.getByText('option-1')).toBeInTheDocument();

    // Step 2: Select operator
    // PFv5 renders operator as typeahead input
    const operatorInput =
      screen.queryByPlaceholderText(/select options/i) ||
      screen.queryByRole('textbox', { name: /type to filter/i });

    if (!operatorInput) {
      throw new Error('Could not find the "Operator" input field');
    }

    // Click to open dropdown
    await user.click(operatorInput);

    // Wait for operator options to appear
    const notInOption = await screen.findByText((c) => c.trim() === 'NotIn');
    const existsOption = await screen.findByText((c) => c.trim() === 'Exists');
    const doesNotExistOption = await screen.findByText(
      (c) => c.trim() === 'DoesNotExist'
    );

    expect(notInOption).toBeInTheDocument();
    expect(existsOption).toBeInTheDocument();
    expect(doesNotExistOption).toBeInTheDocument();

    await user.click(notInOption);

    rerender(component());
    expect(screen.getByText('NotIn')).toBeInTheDocument();

    // Step 3: Select values
    // Find the Values section and its combobox input
    const valuesSection = screen
      .getByText('Values')
      .closest('.pf-v6-c-form__group');
    const valueInput = valuesSection?.querySelector('[role="combobox"]');

    if (!valueInput) {
      throw new Error('Could not find the values input field');
    }

    await user.click(valueInput);

    const value1 = await screen.findByText('value-1');
    const value2 = await screen.findByText('value-2');

    await user.click(value1);
    rerender(component());
    await user.click(value2);
    rerender(component());

    //Step 4: Verify final expanded text
    expect(
      screen.getByText('option-1 does not equal any of value-1, value-2')
    ).toBeInTheDocument();
  });

  test('Verify error validation', async () => {
    const selectedExpression: MatchExpression[] = [
      {
        key: '',
        operator: 'In',
        values: [],
      },
    ];
    const onChange = jest.fn();

    render(
      <LabelExpressionSelector
        labels={getLabels()}
        addExpressionString={'Add resource'}
        onChange={onChange}
        isValidationEnabled={true}
        selectedExpressions={selectedExpression}
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

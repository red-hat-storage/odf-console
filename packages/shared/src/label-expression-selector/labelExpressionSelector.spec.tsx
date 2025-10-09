import * as React from 'react';
import { MatchExpression } from '@openshift-console/dynamic-plugin-sdk';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    await user.click(screen.getByText('Add resource'));
    rerender(component());

    // Verify expand section before selection
    expect(screen.getByText('Expand to enter expression')).toBeInTheDocument();

    // Verify header text
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();

    // Verify label selection
    await user.click(screen.getByText('Select a label'));
    expect(screen.getByText('option-1')).toBeInTheDocument();
    expect(screen.getByText('option-2')).toBeInTheDocument();

    await user.click(screen.getByText('option-1'));
    rerender(component());

    expect(screen.getAllByText(/option-1/i)[0]).toBeInTheDocument();

    // Verify operator selection
    await user.click(screen.getByText('In'));
    expect(screen.getByText('NotIn')).toBeInTheDocument();
    expect(screen.getByText('Exists')).toBeInTheDocument();
    expect(screen.getByText('DoesNotExist')).toBeInTheDocument();
    await user.click(screen.getByText('NotIn'));
    rerender(component());
    expect(screen.getAllByText('NotIn')[0]).toBeInTheDocument();
    // Verify values for option-1
    await user.click(screen.getByText('Select the values'));
    await user.click(screen.getByText('value-1'));
    rerender(component());
    await user.click(screen.getByText('value-2'));
    rerender(component());

    expect(screen.getByText('{{count}} selected')).toBeInTheDocument();

    // Verify expand section after selection
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

import * as React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { RadioSelection } from './radioSelection';

enum MockOptions {
  Option1 = 'Option1',
  Option2 = 'Option2',
}

describe('Review and create step test', () => {
  test('Verify review and create step content', async () => {
    let selection: string = MockOptions.Option1;
    const onChange = jest.fn((val: string) => {
      selection = val;
    });
    render(
      <>
        <RadioSelection
          title={'Test title'}
          description={'Test description'}
          selected={selection}
          alertProps={{
            title: 'Alert title',
            description: 'Alert description',
          }}
          radioProps={[
            {
              id: MockOptions.Option1,
              name: MockOptions.Option1,
              value: MockOptions.Option1,
              label: MockOptions.Option1,
              description: 'Option1 description',
              onChange,
            },
            {
              id: MockOptions.Option2,
              name: MockOptions.Option2,
              value: MockOptions.Option2,
              label: MockOptions.Option2,
              description: 'Option2 description',
              onChange,
            },
          ]}
        />
      </>
    );
    expect(screen.getByText('Alert title')).toBeInTheDocument();
    expect(screen.getByText('Alert description')).toBeInTheDocument();
    expect(screen.getByText('Test title')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Option1')).toBeInTheDocument();
    expect(screen.getByText('Option1 description')).toBeInTheDocument();
    expect(screen.getByText('Option2')).toBeInTheDocument();
    expect(screen.getByText('Option2 description')).toBeInTheDocument();
    // By default option1 is selected
    expect(selection === MockOptions.Option1).toBeTruthy();
    // Select option2
    const selectAll = screen.getByLabelText(MockOptions.Option2);
    fireEvent.click(selectAll);
    expect(selection === MockOptions.Option2).toBeTruthy();
  });
});

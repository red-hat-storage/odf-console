import React from 'react';
import { render } from '@testing-library/react';
import { TotalCapacityBody } from './breakdown-capacity';

describe('tests for TotalCapacityBody', () => {
  const defaultProps = {
    capacity: '100',
    prefix: 'Total requests:',
    suffix: 'used',
    className: 'custom-class',
    styleCapacityAsBold: true,
  };

  it('should render the total capacity with prefix, suffix, and custom class when they are passed', () => {
    const { container } = render(<TotalCapacityBody {...defaultProps} />);
    container.querySelector('.capacity-breakdown-card__capacity-body');
    const expectedValue = 'Total requests: 100 used';
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toBeInTheDocument();
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toHaveTextContent(expectedValue);
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toHaveClass('custom-class');
  });

  it('should render the total capacity with bold styling when styleCapacityAsBold is true', () => {
    const { getByText } = render(<TotalCapacityBody {...defaultProps} />);

    const capacityElement = getByText('100');
    expect(capacityElement.tagName).toBe('STRONG');
  });

  it('should render the total capacity with suffix only when they are passed', () => {
    const props = {
      ...defaultProps,
      prefix: undefined,
    };
    const { container } = render(<TotalCapacityBody {...props} />);
    container.querySelector('.capacity-breakdown-card__capacity-body');
    const expectedValue = '100 used';
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toBeInTheDocument();
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toHaveTextContent(expectedValue);
  });

  it('should render the total capacity with prefix only when passed', () => {
    const props = {
      ...defaultProps,
      prefix: undefined,
    };
    const { container } = render(<TotalCapacityBody {...props} />);
    container.querySelector('.capacity-breakdown-card__capacity-body');
    const expectedValue = '100 used';
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toBeInTheDocument();
    expect(
      container.querySelector('.capacity-breakdown-card__capacity-body')
    ).toHaveTextContent(expectedValue);
  });
});

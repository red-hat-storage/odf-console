import * as React from 'react';
import { render } from '@testing-library/react';
import { CamelCaseWrap } from './CamelCaseWrap';

describe('CamelCaseWrap', () => {
  it('should render "-" if value is falsy', () => {
    const { container } = render(<CamelCaseWrap value={''} />);
    expect(container).toHaveTextContent('-');
  });

  it('should add a data-test attribute with the provided value', () => {
    const { container } = render(
      <CamelCaseWrap value="MyValue" dataTest="my-test" />
    );
    expect(
      container.querySelector('[data-test="my-test"]')
    ).toBeInTheDocument();
  });

  it('should render the memoised component when given the same value prop', () => {
    const { container, rerender } = render(
      <CamelCaseWrap value="MyValueNew" dataTest="my-test-1" />
    );
    const firstRendered = container.firstChild;
    expect(
      container.querySelector('[data-test="my-test-1"]')
    ).toBeInTheDocument();

    rerender(<CamelCaseWrap value="MyValueNew" dataTest="my-test-2" />);
    const secondRendered = container.firstChild;

    expect(
      container.querySelector('[data-test="my-test-2"]')
    ).not.toBeInTheDocument();
    expect(firstRendered).toBe(secondRendered);
  });

  it('should render the value with word break points added before capital letters', () => {
    const { container } = render(<CamelCaseWrap value="SomeLongValue" />);
    const renderedText = container.textContent;
    expect(renderedText).toBe('SomeLongValue');
  });

  it('should add a word break point before consecutive capital letters', () => {
    const { container } = render(
      <CamelCaseWrap value="SomeXMLData" dataTest="xml-test" />
    );
    const renderedText = container.textContent;
    expect(renderedText).toBe('SomeXMLData');
    expect(container.querySelectorAll('wbr')).toHaveLength(1);
  });
});

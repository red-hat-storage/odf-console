import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GettingStartedExpandableGrid } from './GettingStartedExpandableGrid';

const children = 'Testing children prop';
const title = 'Getting started test';
const setIsOpen = jest.fn(() => null);

describe('Test getting started expandable card/grid (GettingStartedExpandableGrid)', () => {
  afterEach(() => jest.clearAllMocks());

  it('Renders card/grid with expandable open', async () => {
    const { container } = render(
      <GettingStartedExpandableGrid
        isOpen={true}
        setIsOpen={setIsOpen}
        title={title}
      >
        {children}
      </GettingStartedExpandableGrid>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.getByText(children)).toBeVisible();

    const expandable = container.querySelector(
      '[data-test="getting-started-expandable"]'
    ) as HTMLElement;
    expect(expandable).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: title });
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);
    expect(setIsOpen).toHaveBeenCalledTimes(1);
  });

  it('Renders card/grid with expandable collapsed', async () => {
    const { container } = render(
      <GettingStartedExpandableGrid
        isOpen={false}
        setIsOpen={setIsOpen}
        title={title}
      >
        {children}
      </GettingStartedExpandableGrid>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.getByText(children)).not.toBeVisible();

    const expandable = container.querySelector(
      '[data-test="getting-started-expandable"]'
    ) as HTMLElement;
    expect(expandable).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: title });
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);
    expect(setIsOpen).toHaveBeenCalledTimes(1);
  });

  it('Renders card/grid without expandable', async () => {
    const { container } = render(
      <GettingStartedExpandableGrid
        isOpen={true}
        setIsOpen={setIsOpen}
        title={title}
        hideExpandable={true}
      >
        {children}
      </GettingStartedExpandableGrid>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.getByText(children)).toBeVisible();

    expect(
      container.querySelector('[data-test="getting-started-expandable"]')
    ).not.toBeInTheDocument();

    let error;
    try {
      expect(screen.getByRole('button', { name: title })).toThrow();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
  });
});

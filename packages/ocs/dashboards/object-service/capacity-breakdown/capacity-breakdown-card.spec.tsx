import * as React from 'react';
import { render, screen } from '@testing-library/react';
import BreakdownCard from './capacity-breakdown-card';

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/extensions', () => {
  const originalModule = jest.requireActual<
    typeof import('@openshift-console/dynamic-plugin-sdk/lib/extensions')
  >('@openshift-console/dynamic-plugin-sdk/lib/extensions');
  return {
    ...originalModule,
    useK8sWatchResource: () => [true, false, false],
  };
});

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/utils/flags', () => ({
  useFlag: () => true,
}));

jest.mock(
  '@odf/shared/hooks/custom-prometheus-poll/custom-prometheus-poll-hook',
  () => ({
    useCustomPrometheusPoll: () => [true, false, false],
  })
);

describe('Capacity Breakdown Card', () => {
  it('renders the Capacity Breakdown Card', () => {
    render(<BreakdownCard />);

    expect(screen.getByText('Capacity breakdown')).toBeInTheDocument();
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Service Type Dropdown Toggle')
    ).toBeInTheDocument();
    // Service type seclect items.
    expect(screen.getByText('All')).toBeInTheDocument();
    // Breakdown select items.
    expect(screen.getByText('Total')).toBeInTheDocument();

    expect(screen.getByLabelText('Options menu')).toBeInTheDocument();
  });
});

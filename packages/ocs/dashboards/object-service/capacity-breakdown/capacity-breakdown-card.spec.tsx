import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { OCSDashboardContext } from '../../ocs-dashboard-providers';
import BreakdownCard from './capacity-breakdown-card';

const testNamespace = 'test-ns';

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

jest.mock('@odf/core/hooks', () => ({
  useSafeK8sWatchResource: () => [true, false, false],
}));

jest.mock('@odf/core/redux', () => ({
  ...jest.requireActual('@odf/core/redux'),
  useODFNamespaceSelector: () => ({ odfNamespace: testNamespace }),
  useODFSystemFlagsSelector: () => ({
    systemFlags: {
      [testNamespace]: { isRGWAvailable: true, isNoobaaAvailable: true },
    },
  }),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useParams: () => ({ namespace: testNamespace }),
}));

describe('Capacity Breakdown Card', () => {
  it('renders the Capacity Breakdown Card', () => {
    render(
      <OCSDashboardContext.Provider
        value={{
          selectedCluster: {
            clusterNamespace: testNamespace,
            clusterName: 'test-cluster',
            isExternalMode: false,
          },
          hasMultipleStorageClusters: false,
        }}
      >
        <BreakdownCard />
      </OCSDashboardContext.Provider>
    );

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

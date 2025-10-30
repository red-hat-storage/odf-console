import * as React from 'react';
import { render, screen } from '@testing-library/react';
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
      [testNamespace]: {
        isRGWAvailable: true,
        isNoobaaAvailable: true,
        ocsClusterName: 'test-cluster',
      },
    },
  }),
}));

jest.mock('@odf/core/redux/utils', () => ({
  ...jest.requireActual('@odf/core/redux/utils'),
  useGetClusterDetails: () => ({
    clusterName: 'test-cluster',
    clusterNamespace: testNamespace,
  }),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useParams: () => ({ namespace: testNamespace }),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (!params) return key;
      // Simple interpolation for test purposes
      return key.replace(/\{\{(\w+)\}\}/g, (_, param) => params[param] || '');
    },
  }),
}));

describe('Capacity Breakdown Card', () => {
  it('renders the Capacity Breakdown Card', () => {
    render(<BreakdownCard />);

    expect(screen.getByText('Capacity breakdown')).toBeInTheDocument();
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Service Type Dropdown Toggle')
    ).toBeInTheDocument();
    // Service type select toggle shows exact service type
    expect(screen.getByText('All')).toBeInTheDocument();
    // Breakdown select toggle shows exact metric name
    expect(screen.getByText('Total')).toBeInTheDocument();

    expect(
      screen.getByLabelText('Break By Dropdown Toggle')
    ).toBeInTheDocument();
  });
});

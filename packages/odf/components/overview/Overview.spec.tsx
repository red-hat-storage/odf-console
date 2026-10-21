import * as React from 'react';
import {
  PrometheusData,
  PrometheusResponse,
  PrometheusResult,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import Overview from './Overview';

const odfNamespace = 'test-ns';

const mockUseODFNamespaceSelector = jest.fn(() => ({
  odfNamespace,
  isODFNsLoaded: true,
  odfNsLoadError: null,
  isNsSafe: true,
  isFallbackSafe: true,
}));

jest.mock('@odf/core/redux/selectors', () => ({
  useODFNamespaceSelector: () => mockUseODFNamespaceSelector(),
  useODFSystemFlagsSelector: () => ({
    systemFlags: {
      [odfNamespace]: {
        isInternalMode: true,
        isExternalMode: false,
        isNoobaaStandalone: false,
      },
    },
    areFlagsSafe: true,
  }),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: jest.fn(() => ({ pathname: '/overview', search: '' })),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(() => {
    return [null, true, undefined];
  }),
  useK8sWatchResources: jest.fn(() => ({
    storageClusters: { data: [], loaded: true, loadError: null },
    flashSystemClusters: { data: [], loaded: true, loadError: null },
    remoteClusters: { data: [], loaded: true, loadError: null },
    sanClusters: { data: [], loaded: true, loadError: null },
    daemons: { data: [], loaded: true, loadError: null },
  })),
  useActivePerspective: jest.fn(() => ''),
}));

const promResponse: PrometheusResponse = {
  status: 'success',
  data: {
    result: [
      {
        metric: {},
        value: [1712304917.483, '0'],
      } as PrometheusResult,
    ],
    resultType: 'vector',
  } as PrometheusData,
};
jest.mock('@odf/shared/hooks/custom-prometheus-poll', () => ({
  useCustomPrometheusPoll: jest.fn(() => [promResponse, null, false]),
  usePrometheusBasePath: jest.fn(() => ''),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk-internal'),
  useUtilizationDuration: jest.fn(() => ({ duration: 0 })),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/utils/flags', () => ({
  ...jest.requireActual(
    '@openshift-console/dynamic-plugin-sdk/lib/utils/flags'
  ),
  useFlag: jest.fn(),
}));

const defaultNamespaceSelector = {
  odfNamespace,
  isODFNsLoaded: true,
  odfNsLoadError: null,
  isNsSafe: true,
  isFallbackSafe: true,
};

describe('General Overview', () => {
  beforeEach(() => {
    mockUseODFNamespaceSelector.mockReturnValue(defaultNamespaceSelector);
  });

  it('renders the Infrastructure health card on a non-FDF cluster', () => {
    (useFlag as jest.Mock).mockReturnValue(false);
    render(
      <BrowserRouter>
        <Overview />
      </BrowserRouter>
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Object storage')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('External systems')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure health')).toBeInTheDocument();
  });

  it('hides the Infrastructure health card on an FDF cluster', () => {
    (useFlag as jest.Mock).mockReturnValue(true);
    render(
      <BrowserRouter>
        <Overview />
      </BrowserRouter>
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Object storage')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('External systems')).toBeInTheDocument();
    expect(screen.queryByText('Infrastructure health')).not.toBeInTheDocument();
  });

  it('hides the Infrastructure health card while FDF detection is in flight', () => {
    // Feature flag is undefined until namespace/provider detection resolves.
    (useFlag as jest.Mock).mockReturnValue(undefined);
    render(
      <BrowserRouter>
        <Overview />
      </BrowserRouter>
    );
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.queryByText('Infrastructure health')).not.toBeInTheDocument();
  });

  it('hides the Infrastructure health card when namespace detection failed', () => {
    (useFlag as jest.Mock).mockReturnValue(false);
    mockUseODFNamespaceSelector.mockReturnValue({
      ...defaultNamespaceSelector,
      odfNsLoadError: new Error('namespace detection failed'),
      isNsSafe: false,
    });
    render(
      <BrowserRouter>
        <Overview />
      </BrowserRouter>
    );
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.queryByText('Infrastructure health')).not.toBeInTheDocument();
  });
});

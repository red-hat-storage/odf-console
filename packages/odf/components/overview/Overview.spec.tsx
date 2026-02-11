import * as React from 'react';
import {
  PrometheusData,
  PrometheusResponse,
  PrometheusResult,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom-v5-compat';
import Overview from './Overview';

const odfNamespace = 'test-ns';
jest.mock('@odf/core/redux/selectors', () => ({
  useODFNamespaceSelector: () => ({
    odfNamespace,
    isODFNsLoaded: true,
    odfNsLoadError: null,
    isNsSafe: true,
    isFallbackSafe: true,
  }),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
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

describe('General Overview', () => {
  it('only renders common cards', () => {
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
  });

  it('also renders External Systems card', () => {
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
  });
});

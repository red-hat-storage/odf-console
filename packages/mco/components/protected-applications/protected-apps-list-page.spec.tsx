import * as React from 'react';
import { DRPolicyModel, DRPlacementControlModel } from '@odf/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DR_BASE_ROUTE, ApplicationType } from '../../constants';
import { EmptyRowMessage, NoDataMessage } from './components';
import { ProtectedApplicationsListPage } from './list-page';

const unableToFindError = 'Unable to find an element';
const failingDRPCName = 'test-drpc-1';
const relocatedDRPCName = 'test-drpc-2';
const drPolicyName = 'test-policy';
const deploymentClusterName = 'test-cluster-2';
const namespaces = ['ns-1', 'ns-2', 'ns-3', 'ns-4'];

let noData = false;
let noFilteredData = false;
let filterDRPC = '';

const resetGlobals = () => {
  noData = false;
  noFilteredData = false;
  filterDRPC = '';
};

const failingDRPC = {
  apiVersion: 'ramendr.openshift.io/v1alpha1',
  kind: 'DRPlacementControl',
  metadata: {
    name: failingDRPCName,
    namespace: 'test',
    annotations: {
      'drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster':
        deploymentClusterName,
    },
  },
  spec: {
    action: 'Failover',
    drPolicyRef: { name: 'test-policy' },
    failoverCluster: 'test-cluster-1',
    preferredCluster: 'test-cluster-2',
    placementRef: { name: 'test-ref' },
    pvcSelector: {},
    protectedNamespaces: namespaces,
    kubeObjectProtection: { captureInterval: '5m' },
  },
  status: {
    lastGroupSyncTime: '2024-03-04T11:38:44Z',
    lastKubeObjectSyncTime: '2024-03-04T11:38:44Z',
    phase: 'FailingOver',
  },
};

const relocatedDRPC = {
  apiVersion: 'ramendr.openshift.io/v1alpha1',
  kind: 'DRPlacementControl',
  metadata: {
    name: relocatedDRPCName,
    namespace: 'test',
    annotations: {
      'drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster':
        deploymentClusterName,
    },
  },
  spec: {
    action: 'Failover',
    drPolicyRef: { name: 'test-policy' },
    failoverCluster: 'test-cluster-1',
    preferredCluster: 'test-cluster-2',
    placementRef: { name: 'test-ref' },
    pvcSelector: {},
    protectedNamespaces: namespaces,
    kubeObjectProtection: { captureInterval: '5m' },
  },
  status: {
    lastGroupSyncTime: '2024-03-04T11:38:44Z',
    lastKubeObjectSyncTime: '2024-03-04T11:38:44Z',
    phase: 'Relocated',
  },
};

const drPolicy = {
  apiVersion: 'ramendr.openshift.io/v1alpha1',
  kind: 'DRPolicy',
  metadata: { name: drPolicyName },
  spec: {
    drClusters: ['test-cluster-1', 'test-cluster-2'],
    schedulingInterval: '1m',
  },
};

const failingPAV = {
  apiVersion: 'multicluster.odf.openshift.io/v1alpha1',
  kind: 'ProtectedApplicationView',
  metadata: { name: failingDRPCName, namespace: 'test' },
  spec: { drpcRef: { name: failingDRPCName, namespace: 'test' } },
  status: {
    applicationInfo: {
      type: ApplicationType.Discovered,
      applicationRef: {
        kind: 'DRPlacementControl',
        name: failingDRPCName,
        namespace: 'test',
      },
    },
    placementInfo: {
      placementRef: { name: 'test-ref', kind: 'Placement', namespace: 'test' },
      selectedClusters: ['test-cluster-1', 'test-cluster-2'],
    },
    drInfo: {
      drPolicyRef: { name: drPolicyName },
      drClusters: ['test-cluster-1', 'test-cluster-2'],
      primaryCluster: deploymentClusterName,
      protectedNamespaces: namespaces,
      status: {
        phase: 'FailingOver',
        lastGroupSyncTime: '2024-03-04T11:38:44Z',
      },
    },
  },
};

const relocatedPAV = {
  apiVersion: 'multicluster.odf.openshift.io/v1alpha1',
  kind: 'ProtectedApplicationView',
  metadata: { name: relocatedDRPCName, namespace: 'test' },
  spec: { drpcRef: { name: relocatedDRPCName, namespace: 'test' } },
  status: {
    applicationInfo: {
      type: ApplicationType.Discovered,
      applicationRef: {
        kind: 'DRPlacementControl',
        name: relocatedDRPCName,
        namespace: 'test',
      },
    },
    placementInfo: {
      placementRef: { name: 'test-ref', kind: 'Placement', namespace: 'test' },
      selectedClusters: ['test-cluster-1', 'test-cluster-2'],
    },
    drInfo: {
      drPolicyRef: { name: drPolicyName },
      drClusters: ['test-cluster-1', 'test-cluster-2'],
      primaryCluster: deploymentClusterName,
      protectedNamespaces: namespaces,
      status: { phase: 'Relocated', lastGroupSyncTime: '2024-03-04T11:38:44Z' },
    },
  },
};

const drpcs = [failingDRPC, relocatedDRPC];
const pavs = [failingPAV, relocatedPAV];

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useListPageFilter: jest.fn(() => [
    noData ? [] : pavs,
    noFilteredData
      ? []
      : pavs.filter((pav) => pav.metadata.name !== filterDRPC),
    jest.fn(),
  ]),
  useK8sWatchResource: jest.fn(({ kind, groupVersionKind }) => {
    if (noData) return [[], true, ''];
    if (
      groupVersionKind?.group === 'multicluster.odf.openshift.io' &&
      groupVersionKind?.kind === 'ProtectedApplicationView'
    )
      return [pavs, true, ''];
    if (
      kind ===
        `${DRPlacementControlModel.apiGroup}~${DRPlacementControlModel.apiVersion}~${DRPlacementControlModel.kind}` ||
      groupVersionKind?.kind === DRPlacementControlModel.kind
    )
      return [drpcs, true, ''];
    if (
      kind ===
      `${DRPolicyModel.apiGroup}~${DRPolicyModel.apiVersion}~${DRPolicyModel.kind}`
    )
      return [[drPolicy], true, ''];
    return [[], true, ''];
  }),
  useModal: jest.fn(() => jest.fn()),
  AlertSeverity: { Critical: 'critical' },
  useK8sWatchResources: jest.fn(() => ({})),
}));

jest.mock('../modals/app-manage-policies/helper/consistency-groups', () => ({
  buildMCVResource: jest.fn(() => ({})),
  extractConsistencyGroups: jest.fn(() => ({
    loaded: true,
    loadError: null,
    data: [],
  })),
  ConsistencyGroupsContent: jest.fn(() => null),
  getMCVName: jest.fn(() => ''),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
  Link: jest.fn((props) => <a {...props}>{props.children}</a>),
}));

jest.mock('./components', () => ({
  ...jest.requireActual('./components'),
  EmptyRowMessage: jest.fn(() => null),
  NoDataMessage: jest.fn(() => null),
  NamespacesDetails: jest.fn(({ view }) => (
    <div>
      {view?.status?.drInfo?.protectedNamespaces?.map((ns) => (
        <div key={ns}>{ns}</div>
      ))}
    </div>
  )),
}));

jest.mock('../dr-status-popover/parsers', () => ({
  DRPlacementControlParser: jest.fn(() => <div>DR Status</div>),
}));

jest.mock('@odf/mco/utils', () => ({
  getApplicationName: jest.fn((pav) => pav.metadata.name),
  getDRPlacementControlRef: jest.fn((pav) => pav.spec.drpcRef),
  getPAVDRPolicyName: jest.fn(() => drPolicyName),
  getPrimaryCluster: jest.fn(() => deploymentClusterName),
  getPrimaryClusterName: jest.fn(() => 'test-cluster-1'),
}));

// eslint-disable-next-line no-console
const originalError = console.error.bind(console.error);
let consoleSpy: jest.SpyInstance<
  void,
  [message?: any, ...optionalParams: any[]]
>;

const ignoreErrors = () => {
  consoleSpy = jest.spyOn(console, 'error').mockImplementation((...data) => {
    if (!data.toString().includes('ListPageBody.js')) {
      originalError(...data);
    }
  });
};

describe('Test protected applications list page table (ProtectedApplicationsListPage)', () => {
  let user;
  beforeEach(() => {
    user = userEvent.setup();
    resetGlobals();
  });
  afterEach(() => jest.clearAllMocks());
  beforeAll(() => ignoreErrors());
  afterAll(() => consoleSpy.mockRestore());

  it('"NoDataMessage" FC is rendered when no applications are found', async () => {
    noData = true;
    noFilteredData = true;
    render(<ProtectedApplicationsListPage />);

    expect(NoDataMessage).toHaveBeenCalledTimes(1);
    expect(EmptyRowMessage).toHaveBeenCalledTimes(0);
  });

  it('"EmptyRowMessage" FC is rendered when applications are found but filtered data is empty', async () => {
    noData = false;
    noFilteredData = true;
    render(<ProtectedApplicationsListPage />);

    expect(EmptyRowMessage).toHaveBeenCalledTimes(1);
    expect(NoDataMessage).toHaveBeenCalledTimes(0);
  });

  it('"ComposableTable" FC is rendered, listing all the DRPCs', async () => {
    render(<ProtectedApplicationsListPage />);

    expect(screen.getByText(failingDRPCName)).toBeInTheDocument();
    expect(screen.getByText(relocatedDRPCName)).toBeInTheDocument();
  });

  it('"EnrollApplicationButton" and "PopoverStatus" FCs are rendered, listing different app types', async () => {
    render(<ProtectedApplicationsListPage />);

    const buttonTitle = 'Enroll application';
    const popoverTitle = 'Application types and their enrollment processes';
    const discoveredApps = 'ACM discovered applications';
    const managedApps = 'ACM managed applications';

    expect(screen.getByText(buttonTitle)).toBeInTheDocument();
    await user.click(screen.getByText(buttonTitle));
    expect(screen.getByText(discoveredApps)).toBeInTheDocument();
    expect(screen.getByText(managedApps)).toBeInTheDocument();
    await user.click(screen.getByText(buttonTitle));
    await waitFor(() => {
      expect(screen.queryByText(discoveredApps)).not.toBeVisible();
    });
    await waitFor(() => {
      expect(screen.queryByText(managedApps)).not.toBeInTheDocument();
    });

    expect(screen.getByText(popoverTitle)).toBeInTheDocument();
    expect(screen.getByText(popoverTitle)).toBeEnabled();
  });
});

describe('Test protected applications list page table row (ProtectedAppsTableRow)', () => {
  let user;
  beforeEach(() => {
    user = userEvent.setup();
    resetGlobals();
  });
  afterEach(() => jest.clearAllMocks());
  beforeAll(() => ignoreErrors());
  afterAll(() => consoleSpy.mockRestore());

  it('Table header contains all required columns', async () => {
    render(<ProtectedApplicationsListPage />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getAllByText('DR Status').length).toBeGreaterThan(0);
    expect(screen.getByText('Policy')).toBeInTheDocument();
    expect(screen.getByText('Cluster')).toBeInTheDocument();
  });

  it('"Relocated DRPC" table row contains all required columns', async () => {
    filterDRPC = failingDRPCName;
    const { container } = render(<ProtectedApplicationsListPage />);

    const expandButton = container.querySelector(
      '[data-test="expand-button"]'
    ) as HTMLElement;
    expect(expandButton).toBeInTheDocument();

    expect(() => screen.getByText(failingDRPCName)).toThrow(unableToFindError);
    const nameElement = container.querySelector(
      '[data-label="Name"]'
    ) as HTMLElement;
    expect(nameElement).not.toBeNull();
    expect(nameElement).toHaveTextContent(relocatedDRPCName);
    expect(
      nameElement.querySelector(
        `[data-test='resource-link-${relocatedDRPCName}']`
      )
    ).toHaveAttribute(
      'to',
      `/k8s/ns/${relocatedDRPC.metadata.namespace}/ramendr.openshift.io~v1alpha1~DRPlacementControl/${relocatedDRPCName}`
    );

    const policyElement = container.querySelector(
      '[data-label="Policy"]'
    ) as HTMLElement;
    expect(policyElement).not.toBeNull();
    expect(policyElement).toHaveTextContent(drPolicyName);
    expect(
      policyElement.querySelector(`[data-test='link-${drPolicyName}']`)
    ).toHaveAttribute('to', `${DR_BASE_ROUTE}/policies?name=${drPolicyName}`);

    expect(container.querySelector('[data-label="Cluster"]')).toHaveTextContent(
      deploymentClusterName
    );

    const kebabButton = screen.getByRole('button', { name: /Kebab toggle/i });
    await user.click(kebabButton);
    expect(screen.getByText('Edit configuration')).toBeVisible();
    expect(screen.getByText('Failover')).toBeVisible();
    expect(screen.getByText('Relocate')).toBeVisible();
  });

  it('"FailingOver DRPC" expands to show namespaces when expand button is clicked', async () => {
    filterDRPC = relocatedDRPCName;
    const { container } = render(<ProtectedApplicationsListPage />);

    expect(() => screen.getByText(relocatedDRPCName)).toThrow(
      unableToFindError
    );
    const nameElement = container.querySelector(
      '[data-label="Name"]'
    ) as HTMLElement;
    expect(nameElement).toHaveTextContent(failingDRPCName);
    expect(
      nameElement.querySelector(
        `[data-test='resource-link-${failingDRPCName}']`
      )
    ).toHaveAttribute(
      'to',
      `/k8s/ns/${failingDRPC.metadata.namespace}/ramendr.openshift.io~v1alpha1~DRPlacementControl/${failingDRPCName}`
    );

    const expandButton = container.querySelector(
      '[data-test="expand-button"] button'
    ) as HTMLElement;
    expect(expandButton).toBeInTheDocument();

    await user.click(expandButton);

    expect(screen.getByText(namespaces[0])).toBeInTheDocument();
    expect(screen.getByText(namespaces[1])).toBeInTheDocument();
    expect(screen.getByText(namespaces[2])).toBeInTheDocument();
    expect(screen.getByText(namespaces[3])).toBeInTheDocument();
  });
});

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DR_BASE_ROUTE } from '../../constants';
import { DRPolicyModel, DRPlacementControlModel } from '../../models/ramen';
import {
  EmptyRowMessage,
  NoDataMessage,
  ExpandableComponentType,
} from './components';
import { ProtectedApplicationsListPage } from './list-page';

const unableToFindError = 'Unable to find an element';
const failingDRPCName = 'test-drpc-1';
const relocatedDRPCName = 'test-drpc-2';
const drPolicyName = 'test-policy';
const deploymentClusterName = 'local-test-cluster';
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
const drpcs = [failingDRPC, relocatedDRPC];

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useListPageFilter: jest.fn(() => [
    noData ? [] : drpcs,
    noFilteredData
      ? []
      : drpcs.filter((drpc) => drpc.metadata.name !== filterDRPC),
    jest.fn(),
  ]),
  useK8sWatchResource: jest.fn(({ kind }) => {
    if (noData) return [[], true, ''];
    if (
      kind ===
      `${DRPolicyModel.apiGroup}~${DRPolicyModel.apiVersion}~${DRPolicyModel.kind}`
    )
      return [[drPolicy], true, ''];
    if (
      kind ===
      `${DRPlacementControlModel.apiGroup}~${DRPlacementControlModel.apiVersion}~${DRPlacementControlModel.kind}`
    )
      return [drpcs, true, ''];
    return [[], true, ''];
  }),
  useModal: jest.fn(() => null),
  AlertSeverity: { Critical: 'critical' },
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => null,
  useLocation: () => ({ pathname: '/' }),
  Link: jest.fn((props) => <div {...props} />),
}));

jest.mock('./components', () => ({
  ...jest.requireActual('./components'),
  EmptyRowMessage: jest.fn(() => null),
  NoDataMessage: jest.fn(() => null),
}));

jest.mock('../dr-status-popover/dr-status-popover', () => ({
  __esModule: true,
  default: jest.fn(() => <div>DR Status</div>),
}));

// eslint-disable-next-line no-console
const originalError = console.error.bind(console.error);
let consoleSpy: jest.SpyInstance<
  void,
  [message?: any, ...optionalParams: any[]]
>;

const ignoreErrors = () => {
  // Ignore error messages coming from ListPageBody (third-party dependency).
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

    // Enroll application dropdown
    expect(screen.getByText(buttonTitle)).toBeInTheDocument();
    // Toggle dropdown (open)
    await user.click(screen.getByText(buttonTitle));
    // Dropdown items
    expect(screen.getByText(discoveredApps)).toBeInTheDocument();
    expect(screen.getByText(managedApps)).toBeInTheDocument();
    // Toggle dropdown (close)
    await user.click(screen.getByText(buttonTitle));
    expect(() => screen.getByText(discoveredApps)).toThrow(unableToFindError);
    expect(() => screen.getByText(managedApps)).toThrow(unableToFindError);

    // Application types popover
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
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getAllByText('DR Status').length).toBeGreaterThan(0);
    expect(screen.getByText('Policy')).toBeInTheDocument();
    expect(screen.getByText('Cluster')).toBeInTheDocument();
  });

  it('"Relocated DRPC" table row contains all required columns', async () => {
    // Filter rest and display only a single row item
    filterDRPC = failingDRPCName;
    const { container } = render(<ProtectedApplicationsListPage />);

    // Expand button
    const expandButton = container.querySelector(
      '[data-test="expand-button"]'
    ) as HTMLElement;
    expect(expandButton).toBeInTheDocument();

    // Name
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

    // Details
    expect(
      container.querySelector(`[id=${ExpandableComponentType.NS}]`)
    ).toBeInTheDocument();
    expect(
      container.querySelector(`[id=${ExpandableComponentType.EVENTS}]`)
    ).not.toBeInTheDocument();

    // Policy
    const policyElement = container.querySelector(
      '[data-label="Policy"]'
    ) as HTMLElement;
    expect(policyElement).not.toBeNull();
    expect(policyElement).toHaveTextContent(drPolicyName);
    expect(
      policyElement.querySelector(`[data-test='link-${drPolicyName}']`)
    ).toHaveAttribute('to', `${DR_BASE_ROUTE}/policies?name=${drPolicyName}`);

    // Cluster
    expect(container.querySelector('[data-label="Cluster"]')).toHaveTextContent(
      deploymentClusterName
    );

    // Kebab
    const editConfig = 'Edit configuration';
    const failover = 'Failover';
    const relocate = 'Relocate';
    const kebabButton = screen.getByRole('button', { name: /Kebab toggle/i });
    // Open action (kebab) menu
    await user.click(kebabButton);
    expect(screen.getByText(editConfig)).toBeVisible();
    expect(screen.getByText(failover)).toBeVisible();
    expect(screen.getByText(relocate)).toBeVisible();
  });

  it('"FailingOver DRPC" table row contains all required columns', async () => {
    // Filter rest and display only a single row item
    filterDRPC = relocatedDRPCName;
    const { container } = render(<ProtectedApplicationsListPage />);

    // Name
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

    // Details
    const namespaceElement = container.querySelector(
      `[id=${ExpandableComponentType.NS}]`
    ) as HTMLElement;

    // Click namespace details
    await user.click(namespaceElement);
    expect(screen.getByText(namespaces[0])).toBeInTheDocument();
    expect(screen.getByText(namespaces[1])).toBeInTheDocument();
    expect(screen.getByText(namespaces[2])).toBeInTheDocument();
    expect(screen.getByText(namespaces[3])).toBeInTheDocument();
  });
});

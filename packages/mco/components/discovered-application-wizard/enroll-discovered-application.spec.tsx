import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DRPlacementControlModel, DRPolicyModel } from '../../models';
import {
  DRPlacementControlKind,
  DRPolicyKind,
  SearchQuery,
  SearchResult,
} from '../../types';
import { createRefFromK8Resource } from '../../utils';
import EnrollDiscoveredApplication from './enroll-discovered-application';

let testCase = 0;

const drPolicies: DRPolicyKind[] = [
  {
    apiVersion: `${DRPolicyModel.apiGroup}/${DRPolicyModel.apiVersion}`,
    kind: DRPolicyModel.kind,
    metadata: {
      uid: '1',
      name: 'mock-policy-1',
    },
    spec: {
      drClusters: ['east-1', 'west-1'],
      schedulingInterval: '5m',
    },
    status: {
      phase: '',
      conditions: [
        {
          status: 'True',
          type: 'Validated',
        },
      ],
    },
  },
];

const drPlacements: DRPlacementControlKind[] = [
  {
    apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
    kind: DRPlacementControlModel.kind,
    metadata: {
      name: 'mock-placement-1-drpc',
      namespace: 'mock-appset-1',
    },
    spec: {
      drPolicyRef: createRefFromK8Resource(drPolicies[0]),
      placementRef: {},
      // ToDo: Update with correct spec field which will report all protected namespaces
      // @ts-ignore
      enrolledNamespaces: ['mock-appset-1'],
      pvcSelector: {
        matchLabels: {
          pvc: 'pvc1',
        },
      },
    },
  },
];

const searchResultForEast1: SearchResult = {
  data: {
    searchResult: [
      {
        items: [
          {
            _uid: 'east-1/00f6129f-ade1-41f3-88a5-e9c4e046df9b',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:58:52Z',
            kind: 'Namespace',
            label: 'name=openshift-console-operator',
            name: 'openshift-console-operator',
          },
          {
            _uid: 'east-1/db44ed9a-264f-4f05-b870-e0821fe3516c',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:45:40Z',
            kind: 'Namespace',
            label: 'name=default',
            name: 'default',
          },
          {
            _uid: 'east-1/ea2a503c-8b35-412a-b321-74029c5c981b',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:52:46Z',
            kind: 'Namespace',
            label: 'name=mock-appset-1',
            name: 'mock-appset-1',
          },
          {
            _uid: 'east-1/6c7c423f-46e2-4145-9773-5f551896eb79',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:52:46Z',
            kind: 'Namespace',
            label: 'name=namespace-1',
            name: 'namespace-1',
          },
          {
            _uid: 'east-1/9596e3c9-5be6-46ef-aceb-2c60bd9f8841',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:52:46Z',
            kind: 'Namespace',
            label: 'name=namespace-2',
            name: 'namespace-2',
          },
        ],
      },
    ],
  },
};

const searchResultForWest1: SearchResult = {
  data: {
    searchResult: [
      {
        items: [
          {
            _uid: 'east-1/00f6129f-ade1-41f3-88a5-e9c4e046df9b',
            apiversion: 'v1',
            cluster: 'west-1',
            created: '2024-02-13T02:58:52Z',
            kind: 'Namespace',
            label: 'name=kube-system',
            name: 'kube-system',
          },
          {
            _uid: 'east-1/db44ed9a-264f-4f05-b870-e0821fe3516c',
            apiversion: 'v1',
            cluster: 'west-1',
            created: '2024-02-13T02:45:40Z',
            kind: 'Namespace',
            label: 'name=openshift',
            name: 'openshift',
          },
          {
            _uid: 'east-1/ea2a503c-8b35-412a-b321-74029c5c981b',
            apiversion: 'v1',
            cluster: 'west-1',
            created: '2024-02-13T02:52:46Z',
            kind: 'Namespace',
            label: 'name=namespace-3',
            name: 'namespace-3',
          },
          {
            _uid: 'east-1/6c7c423f-46e2-4145-9773-5f551896eb79',
            apiversion: 'v1',
            cluster: 'west-1',
            created: '2024-02-13T02:52:46Z',
            kind: 'Namespace',
            label: 'name=namespace-4',
            name: 'namespace-4',
          },
          {
            _uid: 'east-1/9596e3c9-5be6-46ef-aceb-2c60bd9f8841',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:52:46Z',
            kind: 'Namespace',
            label: 'name=namespace-2',
            name: 'namespace-2',
          },
        ],
      },
    ],
  },
};

jest.mock('@odf/shared/hooks/useK8sList', () => ({
  __esModule: true,
  useK8sList: jest.fn(() => [drPolicies, true, undefined]),
}));

jest.mock('@odf/mco/hooks/acm-safe-fetch', () => ({
  __esModule: true,
  useACMSafeFetch: jest.fn((searchQuery: SearchQuery) => {
    let clusterName = '';
    searchQuery.variables.input.forEach((param) => {
      const filter = param.filters.find(
        (filter) => filter.property === 'cluster'
      );
      if (!!filter) clusterName = filter.values as string;
    });
    if (clusterName === 'east-1') {
      return [searchResultForEast1, undefined, true];
    } else {
      return [searchResultForWest1, undefined, true];
    }
  }),
}));

jest.mock('@odf/shared/heading/page-heading', () => ({
  __esModule: true,
  default: jest.fn(() => <></>),
}));

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: (_ns: string) => ({ t: (children: any) => children }),
}));

jest.mock(
  '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api',
  () => ({
    ...jest.requireActual(
      '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api'
    ),
    useListPageFilter: jest.fn((userNamespaces) => {
      if ([3].includes(testCase))
        return [userNamespaces, userNamespaces, jest.fn()];
      else return [[], [], jest.fn()];
    }),
    ListPageFilter: jest.fn(() => <></>),
    useK8sWatchResource: jest.fn(() => {
      return [drPlacements, true, undefined];
    }),
  })
);

describe('Test namespace step', () => {
  beforeEach(() => {
    testCase += 1;
    render(<EnrollDiscoveredApplication />);
  });
  test('Namespace selection form test', async () => {
    // Step1 title
    expect(screen.getByText('Namespace selection')).toBeInTheDocument();
    // Step1 title description
    expect(
      screen.getByText(
        'Enable disaster recovery protection by selecting the namespaces of your ACM discovered application.'
      )
    ).toBeInTheDocument();
    // Cluster selection
    expect(screen.getByText('DR cluster')).toBeInTheDocument();
    // Cluster dropdown
    expect(screen.getByText('Select cluster')).toBeInTheDocument();
    // Namespace table
    expect(
      screen.getByText(
        'Select namespaces that belongs to your ACM discovered applications.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Once you select namespaces, applications regardless of their type, within those namespaces cannot be subsequently enrolled separately under disaster recovery protection.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('0 results found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'There are no namespaces to display. Select a cluster first to view namespaces.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This list does not include namespaces where applications are enrolled separately under disaster recovery protection.'
      )
    ).toBeInTheDocument();

    // Footer
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Validation message
    fireEvent.click(screen.getByText('Next'));
    expect(
      screen.getByText('Select a DRCluster to choose your namespace.')
    ).toBeInTheDocument();
    expect(screen.getByText('Select a namespace')).toBeInTheDocument();
    expect(
      screen.getByText(
        '1 or more mandatory fields are empty. To proceed, fill in the required information.'
      )
    ).toBeInTheDocument();
  });

  test('No namespace found test', async () => {
    // Cluster selection
    fireEvent.click(screen.getByText('Select cluster'));
    fireEvent.click(screen.getByText('east-1'));
    // Ensure east-1 selection
    expect(screen.getByText('east-1')).toBeInTheDocument();

    // No namespace found for the cluster
    expect(
      screen.getByText('{{count}} results found for {{clusterName}}')
    ).toBeInTheDocument();
    expect(
      screen.getByText('There are no namespaces to display.')
    ).toBeInTheDocument();
  });

  test('Namespace selection test', async () => {
    // Cluster  east-1 selection
    fireEvent.click(screen.getByText('Select cluster'));
    fireEvent.click(screen.getByText('east-1'));
    // Ensure east-1 selection
    expect(screen.getByText('east-1')).toBeInTheDocument();

    // No namespace found for the cluster
    expect(screen.getByText('namespace-1')).toBeInTheDocument();
    expect(screen.getByText('namespace-2')).toBeInTheDocument();
    // Igoring system namespaces
    expect(() => screen.getByText('default')).toThrow(
      'Unable to find an element'
    );
    expect(() => screen.getByText('openshift-console-operator')).toThrow(
      'Unable to find an element'
    );
    // Igoring protected namespaces
    expect(() => screen.getByText('mock-appset-1')).toThrow(
      'Unable to find an element'
    );

    // Cluster  west-1 selection
    fireEvent.click(screen.getByText('east-1'));
    fireEvent.click(screen.getByText('west-1'));
    // Ensure west-1 selection
    expect(screen.getByText('west-1')).toBeInTheDocument();

    // No namespace found for the cluster
    expect(screen.getByText('namespace-3')).toBeInTheDocument();
    expect(screen.getByText('namespace-4')).toBeInTheDocument();
    // Igoring system namespaces
    expect(() => screen.getByText('kube-system')).toThrow(
      'Unable to find an element'
    );
    expect(() => screen.getByText('openshift')).toThrow(
      'Unable to find an element'
    );
  });
});

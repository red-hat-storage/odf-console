import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
let drpcObj = {};

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
      protectedNamespace: ['mock-appset-1'],
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

const searchResultForRecipe: SearchResult = {
  data: {
    searchResult: [
      {
        items: [
          {
            _uid: 'east-1/00f6129f-ade1-41f3-88a5-e9c4e046df9b',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:58:52Z',
            kind: 'Recipe',
            label: 'name=mock-recipe-1',
            namespace: 'namespace-1',
            name: 'mock-recipe-1',
          },
          {
            _uid: 'east-1/db44ed9a-264f-4f05-b870-e0821fe3516c',
            apiversion: 'v1',
            cluster: 'east-1',
            created: '2024-02-13T02:45:40Z',
            kind: 'Recipe',
            label: 'name=mock-recipe-2',
            namespace: 'namespace-2',
            name: 'mock-recipe-2',
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
    const queryStr = JSON.stringify(searchQuery);
    if (queryStr.includes('recipe')) {
      return [searchResultForRecipe, undefined, true];
    } else {
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
    }
  }),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => null,
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
      if (testCase >= 3) return [userNamespaces, userNamespaces, jest.fn()];
      else return [[], [], jest.fn()];
    }),
    ListPageFilter: jest.fn(() => <></>),
    useK8sWatchResource: jest.fn(() => {
      return [drPlacements, true, undefined];
    }),
    k8sCreate: jest.fn(({ data }) => {
      drpcObj = data;
      return Promise.resolve({ data: {} });
    }),
  })
);

// Mocking as "Popover" is throwing warning for FieldLevelHelp & TextInputWithFieldRequirements
jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Popover: () => <></>,
}));

const moveToStep = async (step: number) => {
  if (step > 1) {
    // Select cluster
    fireEvent.click(screen.getByText('Select cluster'));
    fireEvent.click(screen.getByText('east-1'));

    // Select namespaces
    fireEvent.click(screen.getByLabelText('Select row 0'));
    fireEvent.click(screen.getByLabelText('Select row 1'));

    // Name input
    fireEvent.change(screen.getByLabelText('Name input'), {
      target: { value: 'my-name' },
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('my-name')).toBeInTheDocument();
    });

    // Next wizard step
    fireEvent.click(screen.getByText('Next'));
  }

  if (step > 2) {
    // Select recipe
    fireEvent.click(screen.getByText('Select a recipe'));
    fireEvent.click(screen.getByText('mock-recipe-1'));

    // Next wizard step
    fireEvent.click(screen.getByText('Next'));
  }

  if (step > 3) {
    // Select policy
    fireEvent.click(screen.getByText('Select a policy'));
    fireEvent.click(screen.getByText('mock-policy-1'));

    // Next wizard step
    fireEvent.click(screen.getByText('Next'));
  }
};

describe('Test namespace step', () => {
  beforeEach(() => {
    render(<EnrollDiscoveredApplication />);
  });
  test('Namespace selection form test', async () => {
    testCase = 1;
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
    // Name input
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A unique identifier for ACM discovered applications from selected namespaces.'
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
    testCase = 2;
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
    testCase = 3;
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
    // Name input
    fireEvent.change(screen.getByLabelText('Name input'), {
      target: { value: 'my-name' },
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('my-name')).toBeInTheDocument();
    });
  });
});

describe('Test configure step', () => {
  beforeEach(() => {
    render(<EnrollDiscoveredApplication />);
  });

  test('Configure form test', async () => {
    testCase = 4;
    await moveToStep(2);
    // Step2 title
    expect(screen.getByText('Configure definition')).toBeInTheDocument();
    // Step2 title description
    expect(
      screen.getByText(
        'Choose your configuration preference to protect resources (application volumes/PVCs, or Kubernetes objects).'
      )
    ).toBeInTheDocument();
    // Number of namespace selection
    expect(
      screen.getByText(
        'You have selected {{count}} namespaces, to view or change your selection go back to the previous step.'
      )
    ).toBeInTheDocument();

    // Recipe method
    expect(screen.getByText('Recipe')).toBeInTheDocument();
    // Namespace table
    expect(
      screen.getByText('Secure namespaces as per recipe definition.')
    ).toBeInTheDocument();

    // Recipe selection
    expect(screen.getByText('Recipe list')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Only recipes of the selected namespaces will appear in the list.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Select a recipe')).toBeInTheDocument();

    // Footer
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeEnabled();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Validation message
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(
      screen.getByText(
        '1 or more mandatory fields are empty. To proceed, fill in the required information.'
      )
    ).toBeInTheDocument();

    // Select recipe
    fireEvent.click(screen.getByText('Select a recipe'));
    expect(screen.getByText('mock-recipe-1')).toBeInTheDocument();
    expect(screen.getByText('namespace-1')).toBeInTheDocument();
    expect(screen.getByText('mock-recipe-2')).toBeInTheDocument();
    expect(screen.getByText('namespace-2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('mock-recipe-1'));
    // Ensure recipe selection
    expect(screen.getByText('mock-recipe-1')).toBeInTheDocument();
  });
});

describe('Test replication step', () => {
  beforeEach(() => {
    render(<EnrollDiscoveredApplication />);
  });
  test('Replication form test', async () => {
    testCase = 5;
    await moveToStep(3);
    // Step3 title
    expect(
      screen.getByText('Volume and Kubernetes object replication')
    ).toBeInTheDocument();
    // Step3 title description
    expect(
      screen.getByText(
        'Define where to sync or replicate your application volumes and Kubernetes object using a disaster recovery policy.'
      )
    ).toBeInTheDocument();
    // Policy dropdown
    expect(screen.getByText('Disaster recovery policy')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Select a policy'));
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Replication type: {{type}}, Interval: {{interval}}, Clusters: {{clusters}}'
      )
    ).toBeInTheDocument();

    // kubernetes object replication interval
    expect(
      screen.getByText('Kubernetes object replication interval')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Define the interval for Kubernetes object replication')
    ).toBeInTheDocument();
    // Default interval
    expect(screen.getByDisplayValue(5)).toBeInTheDocument();
    fireEvent.click(screen.getByText('minutes'));
    expect(screen.getByText('hours')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();

    // Footer
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeEnabled();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Validation message
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Required')).toBeInTheDocument();

    // Select policy
    fireEvent.click(screen.getByText('Select a policy'));
    fireEvent.click(screen.getByText('mock-policy-1'));
    // Ensure policy selection
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();

    // kubernetes object replication interval selection
    fireEvent.change(screen.getByDisplayValue(5), { target: { value: 10 } });
    // Ensure interval selection
    expect(screen.getByDisplayValue(10)).toBeInTheDocument();
    // unit selection
    fireEvent.click(screen.getByText('minutes'));
    fireEvent.click(screen.getByText('days'));
    // Ensure unit selection
    expect(screen.getByText('days')).toBeInTheDocument();
  });
});
describe('Test review step', () => {
  beforeEach(() => {
    render(<EnrollDiscoveredApplication />);
  });
  test('Review form test', async () => {
    testCase = 6;
    await moveToStep(4);
    // Namespace selection test
    expect(screen.getAllByText('Namespace').length === 2).toBeTruthy();
    expect(screen.getByText('Cluster:')).toBeInTheDocument();
    expect(screen.getByText('east-1')).toBeInTheDocument();
    expect(screen.getByText('Namespace:')).toBeInTheDocument();
    expect(screen.getByText('namespace-1, namespace-2')).toBeInTheDocument();
    expect(screen.getByText('Name:')).toBeInTheDocument();
    expect(screen.getByText('my-name')).toBeInTheDocument();

    // Configuration selection
    expect(screen.getAllByText('Configuration').length === 2).toBeTruthy();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Recipe')).toBeInTheDocument();
    expect(screen.getByText('Recipe name:')).toBeInTheDocument();
    expect(screen.getByText('mock-recipe-1')).toBeInTheDocument();
    expect(screen.getByText('Recipe namespace:')).toBeInTheDocument();
    expect(screen.getByText('namespace-1')).toBeInTheDocument();

    // Replication selection
    expect(screen.getAllByText('Replication').length === 2).toBeTruthy();
    expect(screen.getByText('Volume replication:')).toBeInTheDocument();
    expect(
      screen.getByText(
        '{{policyName}}, {{replicationType}}, Interval: {{interval}}'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Kubernetes object replication:')
    ).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();

    // Footer
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeEnabled();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Click save
    fireEvent.click(screen.getByText('Save'));
    await waitFor(async () => {
      expect(
        JSON.stringify(drpcObj) ===
          '{"apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPlacementControl","metadata":{"name":"my-name","namespace":"ramen-ops"},"spec":{"preferredCluster":"east-1","protectedNamespace":["namespace-1","namespace-2"],"pvcSelector":{},"kubeObjectProtection":{"captureInterval":"5m","recipeRef":{"name":"mock-recipe-1","namespace":"namespace-1"}},"drPolicyRef":{"name":"mock-policy-1","apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPolicy"},"placementRef":{"name":"my-name-placement-1","namespace":"ramen-ops","apiVersion":"cluster.open-cluster-management.io/v1beta1","kind":"Placement"}}}'
      ).toBeTruthy();
    });
  });
});

import * as React from 'react';
import { DRPlacementControlModel, DRPolicyModel } from '@odf/shared';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
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
      protectedNamespaces: ['mock-appset-1'],
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
  default: jest.fn(() => null),
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
    ListPageFilter: jest.fn(() => null),
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
  Popover: () => null,
}));

const moveToStep = async (step: number, user: UserEvent) => {
  if (step > 1) {
    // Select cluster
    await user.click(screen.getByText('Select cluster'));
    await user.click(screen.getByText('east-1'));

    // Select namespaces
    await user.click(screen.getByLabelText('Select row 0'));
    await user.click(screen.getByLabelText('Select row 1'));

    // Name input
    await user.type(screen.getByLabelText('Name input'), 'my-name');
    await waitFor(() => {
      expect(screen.getByDisplayValue('my-name')).toBeInTheDocument();
    });

    // Next wizard step
    await user.click(screen.getByText('Next'));
  }

  if (step > 2) {
    // Select recipe
    await user.click(screen.getByText('Recipe'));
    await user.click(screen.getByText('Select a recipe'));
    await user.click(screen.getByText('mock-recipe-1'));

    // Next wizard step
    await user.click(screen.getByText('Next'));
  }

  if (step > 3) {
    // Select policy
    await user.click(screen.getByText('Select a policy'));
    await user.click(screen.getByText('mock-policy-1'));

    // Next wizard step
    await user.click(screen.getByText('Next'));
  }
};

describe('Test namespace step', () => {
  test('Namespace selection form test', async () => {
    render(<EnrollDiscoveredApplication />);
    testCase = 1;
    const user = userEvent.setup();
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
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Validation message
    await user.click(screen.getByText('Next'));
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
    render(<EnrollDiscoveredApplication />);
    testCase = 2;
    const user = userEvent.setup();

    // Cluster selection
    await user.click(screen.getByText('Select cluster'));

    const clusterOptions = screen.getAllByText('east-1');
    await user.click(clusterOptions[1]);

    // Ensure east-1 selection
    expect(screen.getByText('east-1')).toBeInTheDocument();

    // Validate "no namespaces" message - the table should show this when cluster is selected but no namespaces
    expect(
      screen.getByText(/There are no namespaces to display/i)
    ).toBeInTheDocument();
  });

  test('Namespace selection test', async () => {
    testCase = 3;
    render(<EnrollDiscoveredApplication />);
    const user = userEvent.setup();

    // Cluster east-1 selection
    await user.click(screen.getByText('Select cluster'));
    await user.click(screen.getByText('east-1')); // (1) select option

    // Ensure east-1 selection (safe check — multiple matches allowed)
    const eastElements = screen.queryAllByText('east-1');
    expect(eastElements.length).toBeGreaterThan(0);

    // Verify namespaces for east-1
    expect(screen.getByText('namespace-1')).toBeInTheDocument();
    expect(screen.getByText('namespace-2')).toBeInTheDocument();

    // Ignore system & protected namespaces
    expect(screen.queryByText('default')).not.toBeInTheDocument();
    expect(
      screen.queryByText('openshift-console-operator')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('mock-appset-1')).not.toBeInTheDocument();

    // Switch to cluster west-1
    // reopen dropdown via visible text (first east-1 occurrence)
    // await user.click(screen.getByText('east-1'));
    await user.click(
      screen.getByText((content, element) => {
        return (
          content === 'east-1' &&
          element !== null &&
          element.classList.contains('pf-v6-c-menu-toggle__text')
        );
      })
    );

    await user.click(screen.getByText('west-1'));

    // Ensure west-1 selection (safe check again)
    const westElements = screen.queryAllByText('west-1');
    expect(westElements.length).toBeGreaterThan(0);

    //  Verify namespaces for west-1
    expect(screen.getByText('namespace-3')).toBeInTheDocument();
    expect(screen.getByText('namespace-4')).toBeInTheDocument();

    // Ignore system namespaces
    expect(screen.queryByText('kube-system')).not.toBeInTheDocument();
    expect(screen.queryByText('openshift')).not.toBeInTheDocument();

    //Name input field
    await user.type(screen.getByLabelText('Name input'), 'my-name');
    expect(screen.getByDisplayValue('my-name')).toBeInTheDocument();
  });
});

describe('Test configure step', () => {
  test('Configure form test', async () => {
    render(<EnrollDiscoveredApplication />);
    testCase = 4;
    const user = userEvent.setup();
    await moveToStep(2, user);
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
      screen.getByText('Secure namespaces as per Recipe definition.')
    ).toBeInTheDocument();

    // Recipe selection
    await user.click(screen.getByText('Recipe'));
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
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(
      screen.getByText(
        '1 or more mandatory fields are empty. To proceed, fill in the required information.'
      )
    ).toBeInTheDocument();

    // Select recipe
    await user.click(screen.getByText('Select a recipe'));

    expect(screen.getByText('mock-recipe-1')).toBeInTheDocument();
    expect(screen.getByText('namespace-1')).toBeInTheDocument();
    expect(screen.getByText('mock-recipe-2')).toBeInTheDocument();
    expect(screen.getByText('namespace-2')).toBeInTheDocument();
    await user.click(screen.getByText('mock-recipe-1'));
    // Ensure recipe selection
    screen.getByText((content, element) => {
      return (
        content === 'mock-recipe-1' &&
        element !== null &&
        element.classList.contains('pf-v6-c-menu-toggle__text')
      );
    });
  });
});

describe('Test replication step', () => {
  test('Replication form test', async () => {
    render(<EnrollDiscoveredApplication />);
    testCase = 5;
    const user = userEvent.setup();
    await moveToStep(3, user);
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
    await user.click(screen.getByText('Select a policy'));
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
    await user.click(screen.getByText('minutes'));
    expect(screen.getByText('hours')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();

    // Footer
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeEnabled();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Validation message
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('Required')).toBeInTheDocument();

    // Select policy
    await user.click(screen.getByText('Select a policy'));

    await user.click(
      screen.getByText((content) => content.includes('mock-policy-1'))
    );
    // Ensure policy selection
    await user.click(
      screen.getByText((content, element) => {
        return (
          content === 'mock-policy-1' &&
          element !== null &&
          element.classList.contains('pf-v6-c-menu__item-text')
        );
      })
    );
    // kubernetes object replication interval selection
    // It seems userEvent does not support number input: https://github.com/testing-library/user-event/issues/411
    // eslint-disable-next-line testing-library/prefer-user-event
    fireEvent.input(screen.getByDisplayValue(5), { target: { value: 10 } });
    // Ensure interval selection
    expect(screen.getByDisplayValue(10)).toBeInTheDocument();
    // unit selection
    await user.click(screen.getByText('minutes'));
    await user.click(screen.getByText('days'));
    // Ensure unit selection
    const toggleButton = screen.getByRole('button', { name: /days/i });
    expect(toggleButton).toBeInTheDocument();
  });
});
describe('Test review step', () => {
  test('Review form test', async () => {
    render(<EnrollDiscoveredApplication />);
    testCase = 6;
    const user = userEvent.setup();
    await moveToStep(4, user);
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
    await user.click(screen.getByText('Save'));
    await waitFor(async () => {
      expect(
        JSON.stringify(drpcObj) ===
          '{"apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPlacementControl","metadata":{"name":"my-name","namespace":"openshift-dr-ops"},"spec":{"preferredCluster":"east-1","protectedNamespaces":["namespace-1","namespace-2"],"pvcSelector":{},"kubeObjectProtection":{"captureInterval":"5m","recipeRef":{"name":"mock-recipe-1","namespace":"namespace-1"},"recipeParameters":{}},"drPolicyRef":{"name":"mock-policy-1","apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPolicy"},"placementRef":{"name":"my-name-placement-1","namespace":"openshift-dr-ops","apiVersion":"cluster.open-cluster-management.io/v1beta1","kind":"Placement"}}}'
      ).toBeTruthy();
    });
  });
});

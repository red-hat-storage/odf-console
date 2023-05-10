import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplyDRPolicyModal from './apply-policy-modal';
import { ApplyPolicyType } from './reducer';

jest.mock('./apply-policy-dual-list-selector', () => ({
  ApplyPolicyDualListSelector: jest.fn().mockReturnValue(''),
}));

jest.mock('./applicationset-handler', () => ({
  useAppSetTypeResources: jest.fn().mockReturnValue([true, false]),
}));

jest.mock('@odf/shared/hooks/k8s-get-hook', () => ({
  __esModule: true,
  useK8sGet: jest.fn().mockReturnValue([undefined, true, undefined]),
}));

jest.mock('./reducer', () => ({
  ApplyPolicyReducer: (state, action) => {
    switch (action.type) {
      case ApplyPolicyType.SET_MESSAGE: {
        return {
          ...state,
          message: action.payload,
        };
      }
      default:
        return state;
    }
  },
  ApplyPolicyType: {
    SET_MESSAGE: 'SET_MESSAGE',
  },

  applyPolicyInitialState: {
    appType: 'ApplicationSet',
    protectedResources: {
      ApplicationSet: [],
    },
    availableResources: {
      ApplicationSet: [
        {
          namespace: 'openshift-gitops',
          placement: 'appset2-placement',
          havePlacementAnnotations: true,
          isAlreadyProtected: true,
          appSetName: 'appset2',
          placementDecision: 'appset2-placement-decision-1',
          decisionClusters: ['local-cluster'],
          selected: true,
          isVisible: true,
        },
      ],
    },
    drpcPvcLabels: {
      ApplicationSet: {},
    },
    loading: false,
    message: {
      text: '',
      variant: 'info',
    },
  },
}));

describe('ApplyDRPolicyModal', () => {
  const closeModal = jest.fn();
  const isOpen = true;
  const extraProps = {
    resource: {},
    resourceModel: {},
  };

  beforeEach(() => {
    render(
      <ApplyDRPolicyModal
        closeModal={closeModal}
        isOpen={isOpen}
        extraProps={extraProps}
      />
    );
  });

  it('should render the modal with the correct title and description', () => {
    expect(
      screen.getByText('Manage policy for ApplicationSets')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Assign policy to protect critical applications and ensure quick recovery. Unassign policy from an application when they no longer require to be managed.'
      )
    ).toBeInTheDocument();
  });

  it('should allow disable drpolciy and show a warning alert when unassign policy for protected app', () => {
    expect(screen.getByText('Warning alert:')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Disabling DR protection for applications will no longer protect the underlying PVCs. You must reapply the policy in order to enable DR protection for your application.'
      )
    ).toBeInTheDocument();
  });

  it('should call the closeModal function when the cancel button is clicked', () => {
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(closeModal).toHaveBeenCalled();
  });
});

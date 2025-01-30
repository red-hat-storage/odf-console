import * as React from 'react';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { StorageClusterModel } from '@odf/shared/models';
import { WizardStep } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { Steps, StepsName } from '../../constants';
import { BackingStorageType, DeploymentType } from '../../types';
import {
  CapacityAndNodes,
  CreateStorageClass,
  ReviewAndCreate,
  CreateLocalVolumeSet,
  SecurityAndNetwork,
  Security,
} from './create-storage-system-steps';
import { WizardDispatch, WizardState } from './reducer';

export const createSteps = (
  t: TFunction,
  state: WizardState,
  dispatch: WizardDispatch,
  infraType: string,
  hasOCS: boolean,
  supportedExternalStorage: ExternalStorage[],
  hasMultipleClusters: boolean
): WizardStep[] => {
  const {
    backingStorage,
    stepIdReached,
    createStorageClass,
    storageClass,
    capacityAndNodes,
    securityAndNetwork,
    nodes,
    createLocalVolumeSet,
    connectionDetails,
  } = state;
  const { systemNamespace, externalStorage, deployment } = backingStorage;
  const { encryption, kms } = securityAndNetwork;

  const isMCG = deployment === DeploymentType.MCG;

  const commonSteps = {
    capacityAndNodes: {
      name: StepsName(t)[Steps.CapacityAndNodes],
      component: (
        <CapacityAndNodes
          dispatch={dispatch}
          state={capacityAndNodes}
          storageClass={storageClass}
          volumeSetName={createLocalVolumeSet.volumeSetName}
          nodes={nodes}
          systemNamespace={systemNamespace}
        />
      ),
    },
    securityAndNetwork: {
      name: StepsName(t)[Steps.SecurityAndNetwork],
      component: (
        <SecurityAndNetwork
          securityAndNetworkState={securityAndNetwork}
          dispatch={dispatch}
          infraType={infraType}
          systemNamespace={systemNamespace}
        />
      ),
    },
    security: {
      name: StepsName(t)[Steps.Security],
      component: (
        <Security
          infraType={infraType}
          encryption={encryption}
          kms={kms}
          dispatch={dispatch}
          isMCG={isMCG}
          systemNamespace={systemNamespace}
        />
      ),
    },
    reviewAndCreate: {
      name: StepsName(t)[Steps.ReviewAndCreate],
      component: (
        <ReviewAndCreate
          state={state}
          hasOCS={hasOCS}
          hasMultipleClusters={hasMultipleClusters}
          supportedExternalStorage={supportedExternalStorage}
        />
      ),
    },
  };

  const rhcsExternalProviderSteps: WizardStep[] = [
    {
      name: StepsName(t)[Steps.SecurityAndNetwork],
      canJumpTo: stepIdReached >= 2,
      id: 2,
      component: (
        <SecurityAndNetwork
          securityAndNetworkState={securityAndNetwork}
          dispatch={dispatch}
          infraType={infraType}
          isExternal={backingStorage.type === BackingStorageType.EXTERNAL}
          connectionDetailState={connectionDetails}
          externalStorage={externalStorage}
          supportedExternalStorage={supportedExternalStorage}
          systemNamespace={systemNamespace}
        />
      ),
    },
    {
      name: StepsName(t)[Steps.ReviewAndCreate],
      canJumpTo: stepIdReached >= 3,
      id: 3,
      ...commonSteps.reviewAndCreate,
    },
  ];

  const nonRhcsExternalProviderStep: WizardStep = {
    canJumpTo: stepIdReached >= 2,
    id: 2,
    name: StepsName(t)[Steps.CreateStorageClass],
    component: (
      <CreateStorageClass
        state={createStorageClass}
        externalStorage={externalStorage}
        dispatch={dispatch}
        storageClass={storageClass}
        supportedExternalStorage={supportedExternalStorage}
      />
    ),
  };

  const createLocalVolumeSetStep: WizardStep = {
    name: StepsName(t)[Steps.CreateLocalVolumeSet],
    canJumpTo: stepIdReached >= 2,
    id: 2,
    component: (
      <CreateLocalVolumeSet
        state={createLocalVolumeSet}
        dispatch={dispatch}
        storageClass={storageClass}
        nodes={nodes}
        stepIdReached={stepIdReached}
        isMCG={isMCG}
        systemNamespace={systemNamespace}
      />
    ),
  };

  switch (backingStorage.type) {
    case BackingStorageType.EXISTING:
      if (isMCG) {
        return [
          {
            id: 2,
            canJumpTo: stepIdReached >= 2,
            ...commonSteps.security,
          },
          {
            id: 3,
            canJumpTo: stepIdReached >= 3,
            ...commonSteps.reviewAndCreate,
          },
        ];
      } else
        return [
          {
            id: 2,
            canJumpTo: stepIdReached >= 2,
            ...commonSteps.capacityAndNodes,
          },
          {
            id: 3,
            canJumpTo: stepIdReached >= 3,
            ...commonSteps.securityAndNetwork,
          },
          {
            id: 4,
            canJumpTo: stepIdReached >= 4,
            ...commonSteps.reviewAndCreate,
          },
        ];
    case BackingStorageType.LOCAL_DEVICES:
      if (isMCG) {
        return [
          createLocalVolumeSetStep,
          {
            id: 3,
            canJumpTo: stepIdReached >= 3,
            ...commonSteps.security,
          },
          {
            id: 4,
            canJumpTo: stepIdReached >= 4,
            ...commonSteps.reviewAndCreate,
          },
        ];
      }
      return [
        createLocalVolumeSetStep,
        {
          canJumpTo: stepIdReached >= 3,
          ...commonSteps.capacityAndNodes,
          id: 3,
        },
        {
          canJumpTo: stepIdReached >= 4,
          name: StepsName(t)[Steps.SecurityAndNetwork],
          ...commonSteps.securityAndNetwork,
          id: 4,
        },
        {
          canJumpTo: stepIdReached >= 5,
          name: StepsName(t)[Steps.ReviewAndCreate],
          ...commonSteps.reviewAndCreate,
          id: 5,
        },
      ];
    case BackingStorageType.EXTERNAL:
      if (externalStorage === StorageClusterModel.kind) {
        return rhcsExternalProviderSteps;
      }
      if (!hasOCS) {
        return isMCG
          ? [
              nonRhcsExternalProviderStep,
              {
                id: 3,
                canJumpTo: stepIdReached >= 3,
                ...commonSteps.security,
              },
              {
                id: 4,
                canJumpTo: stepIdReached >= 4,
                ...commonSteps.reviewAndCreate,
              },
            ]
          : [
              nonRhcsExternalProviderStep,
              {
                canJumpTo: stepIdReached >= 3,
                id: 3,
                ...commonSteps.capacityAndNodes,
              },
              {
                canJumpTo: stepIdReached >= 4,
                id: 4,
                ...commonSteps.securityAndNetwork,
              },
              {
                canJumpTo: stepIdReached >= 5,
                id: 5,
                ...commonSteps.reviewAndCreate,
              },
            ];
      }
      return [
        nonRhcsExternalProviderStep,
        {
          canJumpTo: stepIdReached >= 3,
          id: 3,
          ...commonSteps.reviewAndCreate,
        },
      ];
    default:
      return [];
  }
};

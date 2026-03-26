import * as React from 'react';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { StorageClusterModel } from '@odf/shared/models';
import { InfraProviders } from '@odf/shared/types';
import { TFunction } from 'react-i18next';
import { WizardStepProps } from '@patternfly/react-core';
import { NO_PROVISIONER, Steps, StepsName } from '../../constants';
import { BackingStorageType, DeploymentType } from '../../types';
import {
  AdvancedSettings,
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
  infraType: InfraProviders,
  hasOCS: boolean,
  supportedExternalStorage: ExternalStorage[],
  hasMultipleClusters: boolean
): (Pick<WizardStepProps, 'id' | 'name'> & {
  component: React.ReactElement;
  canJumpTo: boolean;
})[] => {
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
  const isNoProvisioner = storageClass?.provisioner === NO_PROVISIONER;

  const commonSteps = {
    capacityAndNodes: {
      name: StepsName(t)[Steps.CapacityAndNodes],
      component: (
        <CapacityAndNodes
          dispatch={dispatch}
          infraType={infraType}
          state={capacityAndNodes}
          storageClass={storageClass}
          volumeSetName={createLocalVolumeSet.volumeSetName}
          nodes={nodes}
          systemNamespace={systemNamespace}
        />
      ),
    },
    advancedSettings: {
      name: StepsName(t)[Steps.AdvancedSettings],
      component: (
        <AdvancedSettings
          state={state.advancedSettings}
          dispatch={dispatch}
          nodeCount={nodes?.length ?? 0}
          capacity={capacityAndNodes.capacity}
          nodes={nodes}
          isNoProvisioner={isNoProvisioner}
          enableArbiter={capacityAndNodes.enableArbiter}
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
          nodes={nodes}
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

  const rhcsExternalProviderSteps: (Pick<WizardStepProps, 'id' | 'name'> & {
    component: React.ReactElement;
    canJumpTo: boolean;
  })[] = [
    {
      id: 4,
      canJumpTo: stepIdReached >= 4,
      ...commonSteps.advancedSettings,
    },
    {
      name: StepsName(t)[Steps.SecurityAndNetwork],
      canJumpTo: stepIdReached >= 5,
      id: 5,
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
      canJumpTo: stepIdReached >= 6,
      id: 6,
      ...commonSteps.reviewAndCreate,
    },
  ];

  const nonRhcsExternalProviderStep: Pick<WizardStepProps, 'id' | 'name'> & {
    component: React.ReactElement;
    canJumpTo: boolean;
  } = {
    canJumpTo: stepIdReached >= 4,
    id: 4,
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

  const createLocalVolumeSetStep: Pick<WizardStepProps, 'id' | 'name'> & {
    component: React.ReactElement;
    canJumpTo: boolean;
  } = {
    name: StepsName(t)[Steps.CreateLocalVolumeSet],
    canJumpTo: stepIdReached >= 4,
    id: 4,
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
            id: 4,
            canJumpTo: stepIdReached >= 4,
            ...commonSteps.advancedSettings,
          },
          {
            id: 5,
            canJumpTo: stepIdReached >= 5,
            ...commonSteps.security,
          },
          {
            id: 6,
            canJumpTo: stepIdReached >= 6,
            ...commonSteps.reviewAndCreate,
          },
        ];
      }
      return [
        {
          id: 4,
          canJumpTo: stepIdReached >= 4,
          ...commonSteps.capacityAndNodes,
        },
        {
          id: 5,
          canJumpTo: stepIdReached >= 5,
          ...commonSteps.advancedSettings,
        },
        {
          id: 6,
          canJumpTo: stepIdReached >= 6,
          ...commonSteps.securityAndNetwork,
        },
        {
          id: 7,
          canJumpTo: stepIdReached >= 7,
          ...commonSteps.reviewAndCreate,
        },
      ];
    case BackingStorageType.LOCAL_DEVICES:
      if (isMCG) {
        return [
          createLocalVolumeSetStep,
          {
            id: 5,
            canJumpTo: stepIdReached >= 5,
            ...commonSteps.advancedSettings,
          },
          {
            id: 6,
            canJumpTo: stepIdReached >= 6,
            ...commonSteps.security,
          },
          {
            id: 7,
            canJumpTo: stepIdReached >= 7,
            ...commonSteps.reviewAndCreate,
          },
        ];
      }
      return [
        createLocalVolumeSetStep,
        {
          id: 5,
          canJumpTo: stepIdReached >= 5,
          ...commonSteps.capacityAndNodes,
        },
        {
          id: 6,
          canJumpTo: stepIdReached >= 6,
          ...commonSteps.advancedSettings,
        },
        {
          id: 7,
          canJumpTo: stepIdReached >= 7,
          ...commonSteps.securityAndNetwork,
        },
        {
          id: 8,
          canJumpTo: stepIdReached >= 8,
          ...commonSteps.reviewAndCreate,
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
                id: 5,
                canJumpTo: stepIdReached >= 5,
                ...commonSteps.advancedSettings,
              },
              {
                id: 6,
                canJumpTo: stepIdReached >= 6,
                ...commonSteps.security,
              },
              {
                id: 7,
                canJumpTo: stepIdReached >= 7,
                ...commonSteps.reviewAndCreate,
              },
            ]
          : [
              nonRhcsExternalProviderStep,
              {
                id: 5,
                canJumpTo: stepIdReached >= 5,
                ...commonSteps.capacityAndNodes,
              },
              {
                id: 6,
                canJumpTo: stepIdReached >= 6,
                ...commonSteps.advancedSettings,
              },
              {
                id: 7,
                canJumpTo: stepIdReached >= 7,
                ...commonSteps.securityAndNetwork,
              },
              {
                id: 8,
                canJumpTo: stepIdReached >= 8,
                ...commonSteps.reviewAndCreate,
              },
            ];
      }
      return [
        nonRhcsExternalProviderStep,
        {
          id: 5,
          canJumpTo: stepIdReached >= 5,
          ...commonSteps.advancedSettings,
        },
        {
          canJumpTo: stepIdReached >= 6,
          id: 6,
          ...commonSteps.reviewAndCreate,
        },
      ];
    default:
      return [];
  }
};

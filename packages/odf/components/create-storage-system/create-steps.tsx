import * as React from 'react';
import { isFlexibleScaling } from '@odf/core/utils';
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
  hasMultipleClusters: boolean,
  isTNFEnabled: boolean
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

  const isNoProvisioner = storageClass.provisioner === NO_PROVISIONER;
  const flexibleScaling = isFlexibleScaling(
    nodes,
    isNoProvisioner,
    capacityAndNodes.enableArbiter
  );

  const isMCG = deployment === DeploymentType.MCG;
  const nodeCount = nodes?.length ?? 0;

  const includeAdvancedSettingsStep =
    !isMCG &&
    (backingStorage.type === BackingStorageType.LOCAL_DEVICES ||
      isNoProvisioner);

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
          isTNFEnabled={isTNFEnabled}
        />
      ),
    },
    advancedSettings: {
      name: StepsName(t)[Steps.AdvancedSettings],
      component: (
        <AdvancedSettings
          state={state.advancedSettings}
          dispatch={dispatch}
          deployment={deployment}
          nodeCount={nodeCount}
          capacity={capacityAndNodes.capacity}
          flexibleScaling={flexibleScaling}
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
          isTNFEnabled={isTNFEnabled}
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

  const nonRhcsExternalProviderStep: Pick<WizardStepProps, 'id' | 'name'> & {
    component: React.ReactElement;
    canJumpTo: boolean;
  } = {
    canJumpTo: stepIdReached >= 3,
    id: 3,
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
    canJumpTo: stepIdReached >= 3,
    id: 3,
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

  const rhcsExternalProviderSteps: (Pick<WizardStepProps, 'id' | 'name'> & {
    component: React.ReactElement;
    canJumpTo: boolean;
  })[] = [
    {
      name: StepsName(t)[Steps.SecurityAndNetwork],
      canJumpTo: stepIdReached >= 3,
      id: 3,
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
          nodes={nodes}
          isTNFEnabled={isTNFEnabled}
        />
      ),
    },
    {
      name: StepsName(t)[Steps.ReviewAndCreate],
      canJumpTo: stepIdReached >= 4,
      id: 4,
      ...commonSteps.reviewAndCreate,
    },
  ];

  switch (backingStorage.type) {
    case BackingStorageType.EXISTING:
      if (isMCG) {
        return [
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
      if (includeAdvancedSettingsStep) {
        return [
          {
            id: 3,
            canJumpTo: stepIdReached >= 3,
            ...commonSteps.capacityAndNodes,
          },
          {
            id: 4,
            canJumpTo: stepIdReached >= 4,
            ...commonSteps.advancedSettings,
          },
          {
            id: 5,
            canJumpTo: stepIdReached >= 5,
            ...commonSteps.securityAndNetwork,
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
          id: 3,
          canJumpTo: stepIdReached >= 3,
          ...commonSteps.capacityAndNodes,
        },
        {
          id: 4,
          canJumpTo: stepIdReached >= 4,
          ...commonSteps.securityAndNetwork,
        },
        {
          id: 5,
          canJumpTo: stepIdReached >= 5,
          ...commonSteps.reviewAndCreate,
        },
      ];
    case BackingStorageType.LOCAL_DEVICES:
      if (isMCG) {
        return [
          createLocalVolumeSetStep,
          {
            id: 4,
            canJumpTo: stepIdReached >= 4,
            ...commonSteps.security,
          },
          {
            id: 5,
            canJumpTo: stepIdReached >= 5,
            ...commonSteps.reviewAndCreate,
          },
        ];
      }
      if (includeAdvancedSettingsStep) {
        return [
          createLocalVolumeSetStep,
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
      }
      return [
        createLocalVolumeSetStep,
        {
          id: 4,
          canJumpTo: stepIdReached >= 4,
          ...commonSteps.capacityAndNodes,
        },
        {
          id: 5,
          canJumpTo: stepIdReached >= 5,
          ...commonSteps.securityAndNetwork,
        },
        {
          id: 6,
          canJumpTo: stepIdReached >= 6,
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
                id: 4,
                canJumpTo: stepIdReached >= 4,
                ...commonSteps.security,
              },
              {
                id: 5,
                canJumpTo: stepIdReached >= 5,
                ...commonSteps.reviewAndCreate,
              },
            ]
          : [
              nonRhcsExternalProviderStep,
              {
                canJumpTo: stepIdReached >= 4,
                id: 4,
                ...commonSteps.capacityAndNodes,
              },
              {
                canJumpTo: stepIdReached >= 5,
                id: 5,
                ...commonSteps.securityAndNetwork,
              },
              {
                canJumpTo: stepIdReached >= 6,
                id: 6,
                ...commonSteps.reviewAndCreate,
              },
            ];
      }
      return [
        nonRhcsExternalProviderStep,
        {
          canJumpTo: stepIdReached >= 4,
          id: 4,
          ...commonSteps.reviewAndCreate,
        },
      ];
    default:
      return [];
  }
};

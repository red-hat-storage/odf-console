import {
  getDRPCKindObj as getDiscoveredDRPCKindObj,
  getPlacementKindObj,
} from '@odf/mco/components/discovered-application-wizard/utils/k8s-utils';
import { ProtectionMethodType } from '@odf/mco/components/discovered-application-wizard/utils/reducer';
import {
  DISCOVERED_APP_NS,
  DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH,
  DR_SECHEDULER_NAME,
  DRApplication,
  K8S_RESOURCE_SELECTOR,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
  PVC_RESOURCE_SELECTOR,
  PROTECTED_VMS,
  VM_RECIPE_NAME,
  K8S_RESOURCE_SELECTOR_LABEL_KEY,
} from '@odf/mco/constants';
import {
  DRPlacementControlKind,
  ManagedClusterActionType,
} from '@odf/mco/types';
import { convertLabelToExpression, matchClusters } from '@odf/mco/utils';
import { fireManagedClusterAction } from '@odf/mco/utils/managed-cluster-action';
import { fireManagedClusterView } from '@odf/mco/utils/managed-cluster-view';
import { PersistentVolumeClaimModel } from '@odf/shared';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
  DRPolicyModel,
  VirtualMachineModel,
} from '@odf/shared';
import {
  getAPIVersion,
  getAnnotations,
  getName,
  getNamespace,
} from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  k8sDelete,
  k8sPatch,
  k8sCreate,
  Patch,
  ObjectMetadata,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { AssignPolicyViewState } from './reducer';
import {
  DRPlacementControlType,
  PlacementType,
  VMProtectionType,
} from './types';

export const getManagedDRPCKindObj = (
  plsName: string,
  plsNamespace: string,
  plsKind: string,
  plsApiVersion: string,
  drPolicyName: string,
  drClusterNames: string[],
  decisionClusters: string[],
  pvcSelectors: string[],
  annotations?: ObjectMetadata['annotations']
): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: `${plsName}-drpc`,
    namespace: plsNamespace,
    annotations,
  },
  spec: {
    drPolicyRef: {
      name: drPolicyName,
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
    },
    placementRef: {
      name: plsName,
      namespace: plsNamespace,
      apiVersion: plsApiVersion,
      kind: plsKind,
    },
    preferredCluster: matchClusters(drClusterNames, decisionClusters),
    pvcSelector: {
      matchExpressions: convertLabelToExpression(pvcSelectors),
    },
  },
});

// ToDo(Gowtham): https://github.com/red-hat-storage/odf-console/issues/1449
export const doNotDeletePVCAnnotationPromises = (
  drpcs: DRPlacementControlType[]
) => {
  const promises: Promise<K8sResourceKind>[] = [];
  const patch = [
    {
      op: 'add',
      path: `/metadata/annotations/${DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH}`,
      value: 'true',
    },
  ];
  drpcs.forEach((drpc) => {
    promises.push(updateDRPC(getName(drpc), getNamespace(drpc), patch));
  });
  return promises;
};

const updateDRPC = (drpcName: string, drpcNamespace: string, patch: Patch[]) =>
  k8sPatch({
    model: DRPlacementControlModel,
    resource: {
      metadata: {
        name: drpcName,
        namespace: drpcNamespace,
      },
    },
    data: patch,
  });

const deleteDRPC = (drpcName: string, drpcNamespace: string) =>
  k8sDelete({
    model: DRPlacementControlModel,
    resource: {
      metadata: {
        name: drpcName,
        namespace: drpcNamespace,
      },
    },
    requestInit: null,
    json: null,
  });

const deleteDummyPlacement = (placementName: string) =>
  k8sDelete({
    model: ACMPlacementModel,
    resource: {
      metadata: {
        name: placementName,
        namespace: DISCOVERED_APP_NS,
      },
    },
    requestInit: null,
    json: null,
  });

const unAssignPromisesForDiscovered = async (
  drpc: DRPlacementControlType,
  vmName: string,
  vmNamespace: string,
  t: TFunction,
  discoveredVMPVCs: string[]
) => {
  const protectionName = drpc.vmSharedGroupName;
  const clusterName = drpc.placementInfo.deploymentClusters[0];
  const protectedVMNames = drpc.vmSharedGroup;
  const drpcName = getName(drpc);
  const placementName = getName(drpc.placementInfo);

  // Step 1 & 2: Remove label from VM and PVCs
  await Promise.all([
    updateVMLabels(vmName, vmNamespace, protectionName, clusterName, t, true),
    updatePVCLabels(
      discoveredVMPVCs,
      vmNamespace,
      protectionName,
      clusterName,
      t,
      true
    ),
  ]);

  if (drpc.vmSharedGroup.length > 1) {
    const patch = [
      {
        op: 'replace',
        path: `/spec/kubeObjectProtection/recipeParameters/${PROTECTED_VMS}`,
        value: protectedVMNames.filter((name) => name !== vmName),
      },
    ];
    await updateDRPC(drpcName, DISCOVERED_APP_NS, patch);
  } else {
    await Promise.all([
      deleteDRPC(drpcName, DISCOVERED_APP_NS),
      deleteDummyPlacement(placementName),
    ]);
  }
};

export const unAssignPromises = async (
  drpcs: DRPlacementControlType[],
  appName: string,
  appNamespace: string,
  appType: DRApplication,
  t: TFunction,
  discoveredVMPVCs: string[]
) => {
  if (appType !== DRApplication.DISCOVERED) {
    await Promise.all(unAssignPromisesForManaged(drpcs));
  } else {
    await unAssignPromisesForDiscovered(
      drpcs[0],
      appName,
      appNamespace,
      t,
      discoveredVMPVCs
    );
  }
};

export const unAssignPromisesForManaged = (drpcs: DRPlacementControlType[]) => [
  doNotDeletePVCAnnotationPromises(drpcs),
  drpcs.map((drpc) => deleteDRPC(getName(drpc), getNamespace(drpc))),
];

const placementAssignPromise = (placement: PlacementType) => {
  const patch = [];
  if (_.isEmpty(getAnnotations(placement))) {
    patch.push({
      op: 'add',
      path: `/metadata/annotations`,
      value: {},
    });
  }
  patch.push({
    op: 'add',
    path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
    value: 'true',
  });
  return k8sPatch({
    model: ACMPlacementModel,
    resource: {
      metadata: {
        name: getName(placement),
        namespace: getNamespace(placement),
      },
    },
    data: patch,
  });
};

const placementRuleAssignPromise = (placement: PlacementType) => {
  return k8sPatch({
    model: ACMPlacementRuleModel,
    resource: {
      metadata: {
        name: getName(placement),
        namespace: getNamespace(placement),
      },
    },
    data: [
      {
        op: 'replace',
        path: '/spec/schedulerName',
        value: DR_SECHEDULER_NAME,
      },
    ],
  });
};

const getPlacement = (placementName: string, placements: PlacementType[]) =>
  placements.find((placement) => getName(placement) === placementName);

export const assignPromisesForManaged = async (
  state: AssignPolicyViewState,
  placements: PlacementType[]
): Promise<void> => {
  const { policy, persistentVolumeClaim } = state;
  const { pvcSelectors } = persistentVolumeClaim;

  const promises: Promise<K8sResourceKind>[] = [];

  pvcSelectors?.forEach((pvcSelector) => {
    const { placementName, labels } = pvcSelector;
    const placement = getPlacement(placementName, placements);

    // Push appropriate placement assignment promises
    promises.push(
      placement.kind === ACMPlacementModel.kind
        ? placementAssignPromise(placement)
        : placementRuleAssignPromise(placement)
    );

    // Push DRPC creation promise
    promises.push(
      k8sCreate({
        model: DRPlacementControlModel,
        data: getManagedDRPCKindObj(
          getName(placement),
          getNamespace(placement),
          placement.kind,
          getAPIVersion(placement),
          getName(policy),
          policy.drClusters,
          placement.deploymentClusters,
          labels
        ),
      })
    );
  });

  // Ensure all promises complete
  await Promise.all(promises);
};

export const updateVMLabels = async (
  vmName: string,
  vmNamespace: string,
  protectionName: string,
  clusterName: string,
  t: TFunction,
  deleteLabel?: boolean
): Promise<K8sResourceKind> => {
  // Fetch VM details
  const mcvResponse = await fireManagedClusterView(
    vmName,
    vmNamespace,
    VirtualMachineModel.kind,
    VirtualMachineModel.apiVersion,
    VirtualMachineModel.apiGroup,
    clusterName,
    t
  );

  const vmData = mcvResponse.result;

  // Ensure labels exist and update
  vmData.metadata.labels ||= {};
  if (deleteLabel) {
    // Remove label if exists
    delete vmData.metadata.labels[K8S_RESOURCE_SELECTOR_LABEL_KEY];
  } else {
    // Add or update the label
    vmData.metadata.labels[K8S_RESOURCE_SELECTOR_LABEL_KEY] = protectionName;
  }

  // Apply the updated labels and return updated VM object
  const mcaResponse = await fireManagedClusterAction(
    ManagedClusterActionType.UPDATE,
    clusterName,
    VirtualMachineModel.kind,
    VirtualMachineModel.apiVersion,
    VirtualMachineModel.apiGroup,
    vmName,
    vmNamespace,
    mcvResponse.result,
    t
  );

  return mcaResponse.result;
};

export const updatePVCLabels = async (
  pvcNames: string[],
  pvcNamespace: string,
  protectionName: string,
  clusterName: string,
  t: TFunction,
  deleteLabel?: boolean
): Promise<K8sResourceKind[]> => {
  return Promise.all(
    pvcNames.map(async (pvcName) => {
      const mcvResponse = await fireManagedClusterView(
        pvcName,
        pvcNamespace,
        PersistentVolumeClaimModel.kind,
        PersistentVolumeClaimModel.apiVersion,
        PersistentVolumeClaimModel.apiGroup,
        clusterName,
        t
      );

      const pvcData = mcvResponse.result;

      // Ensure labels exist and update
      pvcData.metadata.labels ||= {};
      if (deleteLabel) {
        // Remove label if exists
        delete pvcData.metadata.labels[K8S_RESOURCE_SELECTOR_LABEL_KEY];
      } else {
        // Add or update the label
        pvcData.metadata.labels[K8S_RESOURCE_SELECTOR_LABEL_KEY] =
          protectionName;
      }

      // Apply updated labels and return updated PVC object
      const mcaResponse = await fireManagedClusterAction(
        ManagedClusterActionType.UPDATE,
        clusterName,
        PersistentVolumeClaimModel.kind,
        PersistentVolumeClaimModel.apiGroup,
        PersistentVolumeClaimModel.apiVersion,
        pvcName,
        pvcNamespace,
        mcvResponse.result,
        t
      );

      return mcaResponse.result;
    })
  );
};

export const assignPromisesForDiscovered = async (
  state: AssignPolicyViewState,
  placements: PlacementType[],
  vmNamespace: string,
  vmName: string,
  t: TFunction,
  discoveredVMPVCs: string[]
): Promise<void> => {
  const {
    protectionType: { protectionName, protectionType, protectedVMNames },
    replication: { k8sSyncInterval, policy },
  } = state;
  const drpcName = `${protectionName}-drpc`;

  const clusterName = placements[0]?.deploymentClusters?.[0];

  // Step 1 & 2: Label VM and PVCs
  await Promise.all([
    updateVMLabels(vmName, vmNamespace, protectionName, clusterName, t),
    updatePVCLabels(
      discoveredVMPVCs,
      vmNamespace,
      protectionName,
      clusterName,
      t
    ),
  ]);

  if (protectionType === VMProtectionType.STANDALONE) {
    // Step 3: Create DRPC after labeling is successful
    const placementName = `${protectionName}-placement-1`;
    await Promise.all([
      k8sCreate({
        model: ACMPlacementModel,
        data: getPlacementKindObj(placementName),
      }),
      k8sCreate({
        model: DRPlacementControlModel,
        data: getDiscoveredDRPCKindObj({
          name: drpcName,
          preferredCluster: clusterName,
          namespaces: [vmNamespace],
          protectionMethod: ProtectionMethodType.RECIPE,
          recipeName: VM_RECIPE_NAME,
          recipeNamespace: DISCOVERED_APP_NS,
          drPolicyName: getName(policy),
          k8sResourceReplicationInterval: k8sSyncInterval,
          placementName,
          pvcLabelExpressions: [],
          recipeParameters: {
            [K8S_RESOURCE_SELECTOR]: [protectionName],
            [PVC_RESOURCE_SELECTOR]: [protectionName],
            [PROTECTED_VMS]: [vmName],
          },
        }),
      }),
    ]);
  } else {
    // Step 3: Update DRPC after labeling is successful
    const patch = [
      {
        op: 'add',
        path: `/spec/kubeObjectProtection/recipeParameters/${PROTECTED_VMS}`,
        value: [...protectedVMNames, vmName],
      },
    ];
    await k8sPatch({
      model: DRPlacementControlModel,
      resource: {
        metadata: {
          name: drpcName,
          namespace: DISCOVERED_APP_NS,
        },
      },
      data: patch,
    });
  }
};

export const assignPromises = async (
  state: AssignPolicyViewState,
  placements: PlacementType[],
  appType: DRApplication,
  workloadNamespace: string,
  appName: string,
  t: TFunction,
  discoveredVMPVCs: string[]
) => {
  if (appType === DRApplication.DISCOVERED) {
    await assignPromisesForDiscovered(
      state,
      placements,
      workloadNamespace,
      appName,
      t,
      discoveredVMPVCs
    );
  } else {
    await assignPromisesForManaged(state, placements);
  }
};

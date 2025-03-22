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
  VM_NAMESPACE,
  ODF_RESOURCE_TYPE_LABEL,
} from '@odf/mco/constants';
import { DRPlacementControlKind } from '@odf/mco/types';
import { convertLabelToExpression, matchClusters } from '@odf/mco/utils';
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
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { AssignPolicyViewState } from './reducer';
import { DRPlacementControlType, PlacementType } from './types';

export const getManagedDRPCKindObj = (
  plsName: string,
  plsNamespace: string,
  plsKind: string,
  plsApiVersion: string,
  drPolicyName: string,
  drClusterNames: string[],
  decisionClusters: string[],
  pvcSelectors: string[]
): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: `${plsName}-drpc`,
    namespace: plsNamespace,
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
    promises.push(
      k8sPatch({
        model: DRPlacementControlModel,
        resource: {
          metadata: {
            name: getName(drpc),
            namespace: getNamespace(drpc),
          },
        },
        data: patch,
      })
    );
  });
  return promises;
};

// ToDo(Gowtham): https://github.com/red-hat-storage/odf-console/issues/1449
export const unAssignPromises = (drpcs: DRPlacementControlType[]) => {
  const promises: Promise<K8sResourceKind>[] = [];
  drpcs.forEach((drpc) => {
    promises.push(
      k8sDelete({
        model: DRPlacementControlModel,
        resource: {
          metadata: {
            name: getName(drpc),
            namespace: getNamespace(drpc),
          },
        },
        requestInit: null,
        json: null,
      })
    );
  });
  return promises;
};

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

export const assignPromisesForManaged = (
  state: AssignPolicyViewState,
  placements: PlacementType[]
) => {
  const { policy, persistentVolumeClaim } = state;
  const { pvcSelectors } = persistentVolumeClaim;
  const promises: Promise<K8sResourceKind>[] = [];
  pvcSelectors?.forEach((pvcSelector) => {
    const { placementName, labels } = pvcSelector;
    const placement = getPlacement(placementName, placements);
    if (placement.kind === ACMPlacementModel.kind) {
      promises.push(placementAssignPromise(placement));
    } else {
      promises.push(placementRuleAssignPromise(placement));
    }
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

  return promises;
};

export const assignPromisesForDiscovered = (
  state: AssignPolicyViewState,
  placements: PlacementType[],
  vmNamespace: string,
  vmName: string
): Promise<K8sResourceKind>[] => {
  const {
    protectionType: { protectionName },
    replication: { k8sSyncInterval, policy },
  } = state;
  const placementName = `${protectionName}-drpc-placement-1`;

  return [
    k8sCreate({
      model: ACMPlacementModel,
      data: getPlacementKindObj(placementName),
    }),
    k8sCreate({
      model: DRPlacementControlModel,
      data: getDiscoveredDRPCKindObj({
        name: `${protectionName}-drpc`,
        preferredCluster: placements[0].deploymentClusters[0],
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
          [VM_NAMESPACE]: [vmNamespace],
        },
        labels: {
          [ODF_RESOURCE_TYPE_LABEL]: VirtualMachineModel.kind.toLowerCase(),
        },
      }),
    }),
  ];
};

export const assignPromises = (
  state: AssignPolicyViewState,
  placements: PlacementType[],
  appType: DRApplication,
  vmNamespace?: string,
  vmName?: string
): Promise<K8sResourceKind>[] =>
  appType === DRApplication.DISCOVERED
    ? assignPromisesForDiscovered(state, placements, vmNamespace, vmName)
    : assignPromisesForManaged(state, placements);

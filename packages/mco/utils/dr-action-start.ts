import { DRPlacementControlModel } from '@odf/shared';
import {
  k8sGet,
  k8sPatch,
  K8sResourceKind,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { DRActionType } from '../constants';
import { DRPlacementControlKind, Phase, Progression } from '../types';

export type DRActionStartPatchParams = {
  action: DRActionType;
  failoverCluster: string;
  preferredCluster: string;
  // When set, prepends a JSON Patch test on /metadata/generation.
  generation?: number;
};

// True when starting Failover / Relocate (or a future Test) would race an
// in-flight DRPC change.
// Standing spec.action after a completed Failover/Relocate is NOT busy -
// Ramen leaves action set; blocking on that alone would permanently disable Start.
export const isDRPCBusyForNewAction = (
  drpc?: DRPlacementControlKind | null
): boolean => {
  if (!drpc) return true;

  // Test failover (dryRun) or hold progression - even before Test UI lands.
  if (drpc.spec?.dryRun) return true;
  if (drpc.status?.progression === Progression.TestingFailover) return true;

  // Mirror protected-applications kebab disable (action required for phase path).
  const action = drpc.spec?.action;
  if (!action) return false;

  const phase = drpc.status?.phase;
  if (phase === Phase.FailingOver || phase === Phase.Relocating) return true;
  if (phase === Phase.Initiating || phase === Phase.Deploying) return true;

  const progression = drpc.status?.progression;
  return !!progression && progression !== Progression.Completed;
};

export const getDRPCBusyMessage = (
  drpc: DRPlacementControlKind,
  t: TFunction
): string => {
  if (
    drpc.spec?.dryRun ||
    drpc.status?.progression === Progression.TestingFailover
  ) {
    return t(
      'Cannot start this action because a failover test is in progress. Clean up or convert the test first, then try again.'
    );
  }
  return t(
    'Cannot start this action because another disaster recovery operation is already in progress. Wait for it to finish, then try again.'
  );
};

export const buildDRActionStartPatch = ({
  action,
  failoverCluster,
  preferredCluster,
  generation,
}: DRActionStartPatchParams) => {
  const patch: Array<{
    op: string;
    path: string;
    value: string | number;
  }> = [];

  if (typeof generation === 'number') {
    patch.push({
      op: 'test',
      path: '/metadata/generation',
      value: generation,
    });
  }

  patch.push(
    { op: 'replace', path: '/spec/action', value: action },
    { op: 'replace', path: '/spec/failoverCluster', value: failoverCluster },
    { op: 'replace', path: '/spec/preferredCluster', value: preferredCluster }
  );

  return patch;
};

export type PatchDRPCWithStartGateParams = {
  name: string;
  namespace: string;
  action: DRActionType;
  failoverCluster: string;
  preferredCluster: string;
};

// Fresh GET, then refuse if busy, then PATCH with generation test and action fields.
// Narrows the race window when the modal holds a frozen DRPC snapshot.
export const patchDRPCWithStartGate = async (
  params: PatchDRPCWithStartGateParams,
  t: TFunction
): Promise<K8sResourceKind> => {
  const latest = (await k8sGet({
    model: DRPlacementControlModel,
    name: params.name,
    ns: params.namespace,
  })) as DRPlacementControlKind;

  if (isDRPCBusyForNewAction(latest)) {
    throw new Error(getDRPCBusyMessage(latest, t));
  }

  return k8sPatch({
    model: DRPlacementControlModel,
    resource: {
      metadata: {
        name: params.name,
        namespace: params.namespace,
      },
    },
    data: buildDRActionStartPatch({
      action: params.action,
      failoverCluster: params.failoverCluster,
      preferredCluster: params.preferredCluster,
      generation: latest.metadata?.generation,
    }),
  });
};

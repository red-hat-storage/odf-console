import { DRPlacementControlKind } from '@odf/mco/types';
import { Operator as VMOperator } from '@odf/shared/label-expression-selector';
import {
  getAPIVersion,
  getName,
  getNamespace,
  getUID,
} from '@odf/shared/selectors';
import { groupVersionFor, referenceFor } from '@odf/shared/utils';
import {
  ObjectReference,
  K8sResourceCommon,
  ObjectMetadata,
  MatchExpression,
  Operator,
} from '@openshift-console/dynamic-plugin-sdk';
import { getPrimaryClusterName } from './disaster-recovery';

export const getGVKFromK8Resource = (resource: K8sResourceCommon) => {
  const { group, version } = groupVersionFor(resource?.apiVersion || '');
  return referenceFor(group)(version)(resource?.kind);
};

export const createRefFromK8Resource = (
  resource: K8sResourceCommon
): ObjectReference => ({
  name: getName(resource),
  namespace: getNamespace(resource),
  apiVersion: getAPIVersion(resource),
  kind: resource?.kind,
  uid: getUID(resource),
});

export const getMajorVersion = (version: string): string => {
  return !!version
    ? version.split('.')[0] + '.' + version.split('.')[1] + '.0'
    : '';
};

export const convertLabelToExpression = (
  labels: string[]
): MatchExpression[] => {
  // appName: busybox-1, appName: busybox-2 will be converted to {key: appName, operator: Equals, values: [busybox-1, busybox-2]}
  const labelExpressions = labels.reduce(
    (acc, label) => {
      const [key, value = ''] = label.split('=');
      if (key in acc) {
        acc[key].values.push(value);
      } else {
        acc[key] = {
          key,
          operator: Operator.In,
          values: [value],
        };
      }
      return acc;
    },
    {} as { [key in string]: MatchExpression }
  );
  return Object.values(labelExpressions);
};

export const convertExpressionToLabel = (
  labelExpressions: MatchExpression[]
): string[] =>
  // {key: appName, operator: Equals, values: [busybox-1, busybox-2]} will be converted to appName: busybox-1, appName: busybox-2
  labelExpressions?.reduce((acc, labelExpression) => {
    const { key, values } = labelExpression;
    acc.push(...values.map((value) => `${key}=${value}`));
    return acc;
  }, []);

const matchKubeObjectSelector = (
  vmLabels: ObjectMetadata['labels'] = {},
  drpc: DRPlacementControlKind
) => {
  const selector = drpc?.spec?.kubeObjectProtection?.kubeObjectSelector;
  const matchExpressions = selector?.matchExpressions || [];
  const matchLabels = selector?.matchLabels || [];

  if (!matchExpressions.length && !matchLabels.length) return false;

  const labelsMatch = !!matchLabels.length
    ? Object.entries(matchLabels).every(
        ([key, value]) => vmLabels[key] === value
      )
    : true;

  const expressionsMatch = !!matchExpressions.length
    ? matchExpressions.every((expr) => {
        const { key, operator, values = [] } = expr;
        const vmValue = vmLabels[key];

        switch (operator) {
          case VMOperator.In:
            return vmValue !== undefined && values.includes(vmValue);
          case VMOperator.NotIn:
            return vmValue === undefined || !values.includes(vmValue);
          case VMOperator.Exists:
            return key in vmLabels;
          case VMOperator.DoesNotExist:
            return !(key in vmLabels);
          default:
            return false;
        }
      })
    : true;

  return labelsMatch && expressionsMatch;
};

const findDRPC = (
  drpc: DRPlacementControlKind,
  vmNs: string,
  vmCluster: string | undefined,
  vmName: string,
  vmLabels: ObjectMetadata['labels']
): boolean => {
  const nsOk = drpc.spec?.protectedNamespaces?.includes?.(vmNs) ?? false;

  const clusterOk = getPrimaryClusterName(drpc) === vmCluster;

  // VMs protected via Recipe
  const protectedVMs =
    drpc.spec?.kubeObjectProtection?.recipeParameters?.PROTECTED_VMS ?? [];
  const nameOk = protectedVMs.includes(vmName);

  // VMs protected via label selectors
  const labelOK = matchKubeObjectSelector(vmLabels, drpc);

  return nsOk && clusterOk && (nameOk || labelOK);
};

export const findDRPCByNsClusterAndVMName = (
  drpcs: DRPlacementControlKind[],
  vmNs: string,
  vmCluster: string | undefined,
  vmName: string,
  vmLabels: ObjectMetadata['labels']
): DRPlacementControlKind | undefined =>
  drpcs.find((d) => findDRPC(d, vmNs, vmCluster, vmName, vmLabels));

export const getVMClusterName = (virtualMachine: K8sResourceCommon) =>
  virtualMachine?.['status']?.cluster || virtualMachine?.['cluster'];

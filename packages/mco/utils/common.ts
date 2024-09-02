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
  MatchExpression,
  Operator,
} from '@openshift-console/dynamic-plugin-sdk';

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
  const labelExpressions = labels.reduce((acc, label) => {
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
  }, {} as { [key in string]: MatchExpression });
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

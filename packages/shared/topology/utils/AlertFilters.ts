import { Alert, K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { NodeModel, StorageClusterModel } from '../../models';
import { cephFilter, noobaaFilter, rgwFilter } from '../../utils';

export const commonFilter =
  (name: string) =>
  (alert: Alert): boolean => {
    return (
      _.get(alert, 'annotations.description', '').includes(name) ||
      _.get(alert, 'annotations.message', '').includes(name)
    );
  };

export const nodeFilter = (name: string) => (alert: Alert) =>
  alert?.labels?.node === name || commonFilter(name)(alert);

export const filterRelevantAlerts = (
  resourceName: string,
  resourceModel: K8sModel,
  alerts: Alert[]
): Alert[] => {
  if (!resourceName || _.isEmpty(alerts)) return [];
  let filter = commonFilter(resourceName);
  if (_.isEqual(resourceModel, NodeModel)) {
    filter = nodeFilter(resourceName);
  }
  if (_.isEqual(StorageClusterModel, resourceModel)) {
    filter = (alert: Alert) =>
      rgwFilter(alert) || noobaaFilter(alert) || cephFilter(alert);
  }
  return alerts.filter(filter);
};

export const getFilteredAlerts = (
  alerts: Alert[],
  filter: (alert: Alert) => boolean
): Alert[] => alerts.filter(filter);

import { Alert } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

const rookRegex = /.*rook.*/;
export const cephFilter = (alert: Alert) =>
  alert?.annotations?.storage_type === 'ceph' ||
  Object.values(alert?.labels || {})?.some((item: string) =>
    rookRegex.test(item)
  );

export const filterCephAlerts = (alerts: Alert[]): Alert[] => {
  return alerts ? alerts?.filter(cephFilter) : [];
};

export const noobaaFilter = (alert: Alert) =>
  _.get(alert, 'annotations.storage_type') === 'NooBaa';

export const filterNooBaaAlerts = (alerts: Alert[]): Alert[] =>
  alerts?.filter(noobaaFilter);

export const rgwFilter = (alert: Alert) =>
  alert?.annotations?.storage_type === 'RGW';

export const filterRGWAlerts = (alerts: Alert[]): Alert[] =>
  alerts?.filter(rgwFilter);

import { Alert } from '@openshift-console/dynamic-plugin-sdk';

export type AlertsResponse = {
  alerts: Alert[];
  loaded: boolean;
  loadError: object;
};

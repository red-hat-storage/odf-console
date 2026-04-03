import { Alert } from '@openshift-console/dynamic-plugin-sdk';

export type AlertsResponse = {
  alerts: Alert[];
  loaded: boolean;
  loadError: object;
};

export type OsdInformation = {
  osdID: string;
  deviceClass: string;
  osdIP: string;
  nodeIP: string;
  podName: string;
};

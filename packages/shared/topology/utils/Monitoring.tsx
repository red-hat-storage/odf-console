import useAlerts from '@odf/shared/monitoring/useAlert';
import { AlertSeverity } from '@openshift-console/dynamic-plugin-sdk';
import { Alert } from '@openshift-console/dynamic-plugin-sdk';
import {
  filterCephAlerts,
  filterNooBaaAlerts,
  filterRGWAlerts,
} from '../../utils';
import { getFilteredAlerts, nodeFilter } from './AlertFilters';

export enum AlertFiringComponent {
  Cluster = 'Cluster',
  Node = 'Node',
  Deployment = 'Deployment',
}

type MonitoringResponse = {
  [key in AlertFiringComponent]?: Alert[];
};

const alertFilterGenerator = (severity: AlertSeverity) => (alert: Alert) =>
  alert.labels.severity === severity;

export const isCriticalAlert = alertFilterGenerator(AlertSeverity.Critical);
export const isWarningAlert = alertFilterGenerator(AlertSeverity.Warning);

const useMonitoring = (
  component: AlertFiringComponent,
  name?: string
): [MonitoringResponse[AlertFiringComponent], boolean, any] => {
  // Response [monResponse, loading, error]
  const [alerts, loaded, error] = useAlerts();

  const cephAlerts = filterCephAlerts(alerts);
  const mcgAlerts = filterNooBaaAlerts(alerts);
  const rgwAlerts = filterRGWAlerts(alerts);

  const clusterAlerts = [...cephAlerts, ...mcgAlerts, ...rgwAlerts];
  const filter = nodeFilter(name);
  const nodeAlerts = getFilteredAlerts(alerts, filter);

  const firedAlerts = {
    [AlertFiringComponent.Cluster]: clusterAlerts,
    [AlertFiringComponent.Node]: nodeAlerts,
  };

  return [firedAlerts[component], loaded, error];
};

export default useMonitoring;

import useAlerts from '@odf/shared/monitoring/useAlert';
import { AlertSeverity } from '@openshift-console/dynamic-plugin-sdk';
import { Alert } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export type MonitoringResponseInternals = {
  [key in AlertSeverity]: Alert[];
};

export enum AlertFiringComponent {
  Cluster = 'Cluster',
  Node = 'Node',
  Deployment = 'Deployment',
}

type MonitoringResponse = {
  [key in AlertFiringComponent]?: MonitoringResponseInternals;
};

const alertFilterGenerator = (severity: AlertSeverity) => (alert: Alert) =>
  alert.labels.severity === severity;

const isCriticalAlert = alertFilterGenerator(AlertSeverity.Critical);
const isWarningAlert = alertFilterGenerator(AlertSeverity.Warning);
const isInfoAlert = alertFilterGenerator(AlertSeverity.Info);
const isNoneAlert = alertFilterGenerator(AlertSeverity.None);

const filterCephAlerts = (alerts: Alert[]): Alert[] => {
  const rookRegex = /.*rook.*/;
  return alerts
    ? alerts?.filter(
        (alert) =>
          alert?.annotations?.storage_type === 'ceph' ||
          Object.values(alert?.labels)?.some((item) => rookRegex.test(item))
      )
    : [];
};

const filterNooBaaAlerts = (alerts: Alert[]): Alert[] =>
  alerts?.filter(
    (alert) => _.get(alert, 'annotations.storage_type') === 'NooBaa'
  );

const filterRGWAlerts = (alerts: Alert[]): Alert[] =>
  alerts?.filter((alert) => alert?.annotations?.storage_type === 'RGW');

const useMonitoring = (
  component: AlertFiringComponent
): [MonitoringResponse[AlertFiringComponent], boolean, any] => {
  // Response [monResponse, loading, error]
  const [alerts, loading, error] = useAlerts();

  const cephAlerts = filterCephAlerts(alerts);
  const mcgAlerts = filterNooBaaAlerts(alerts);
  const rgwAlerts = filterRGWAlerts(alerts);

  const clusterAlerts = [...cephAlerts, ...mcgAlerts, ...rgwAlerts];

  const clusterAlertsBySeverity = {
    [AlertSeverity.Critical]: clusterAlerts.filter(isCriticalAlert) ?? [],
    [AlertSeverity.Warning]: clusterAlerts.filter(isWarningAlert) ?? [],
    [AlertSeverity.Info]: clusterAlerts.filter(isInfoAlert) ?? [],
    [AlertSeverity.None]: clusterAlerts.filter(isNoneAlert) ?? [],
  };

  const firedAlerts = {
    [AlertFiringComponent.Cluster]: clusterAlertsBySeverity,
  };

  return [firedAlerts[component], loading, error];
};

export default useMonitoring;

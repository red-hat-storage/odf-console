import * as React from 'react';
import AlertsPanel from '@odf/shared/alert/AlertsPanel';
import { NodeModel } from '@odf/shared/models';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { K8sResourceKind } from '@odf/shared/types';
import { Alert } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

const getAlertsFilter = (
  resource: K8sResourceKind
): ((alert: Alert) => boolean) => {
  const defaultAlertsFilter = (alert: Alert) =>
    _.get(alert, 'annotations.description', '').includes(
      resource.metadata.name
    ) ||
    _.get(alert, 'annotations.message', '').includes(resource.metadata.name);
  let alertsFilter;
  switch (resource.kind) {
    case NodeModel.kind:
      alertsFilter = (alert: Alert) =>
        alert?.labels?.node === resource.metadata.name ||
        defaultAlertsFilter(alert);
      break;
    default:
      alertsFilter = defaultAlertsFilter;
  }
  return alertsFilter;
};

type TopologyAlertsProps = {
  resource: K8sResourceKind;
  expandedAlertSeverity?: string;
  setExpandedAlertSeverity?: (id: string) => void;
};

const TopologyAlerts: React.FC<TopologyAlertsProps> = ({ resource }) => {
  const [alerts, loaded, loadError] = useAlerts();
  const alertsFilter = getAlertsFilter(resource);

  return (
    <AlertsPanel
      alerts={alerts}
      alertsFilter={alertsFilter}
      loaded={loaded}
      loadError={loadError}
    />
  );
};

export default TopologyAlerts;

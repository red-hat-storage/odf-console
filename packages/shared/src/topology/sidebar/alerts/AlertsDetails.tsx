import * as React from 'react';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { Alert } from '@openshift-console/dynamic-plugin-sdk';
import AlertsPanel from '../../../alert/AlertsPanel';

type AlertsTabProps = {
  alertsFilter: (alert: Alert) => boolean;
};

const AlertsDetails: React.FC<AlertsTabProps> = ({ alertsFilter }) => {
  const [alerts, loaded, loadError] = useAlerts();

  return (
    <AlertsPanel
      alerts={alerts}
      alertsFilter={alertsFilter}
      loaded={loaded}
      loadError={loadError}
    />
  );
};

export default AlertsDetails;

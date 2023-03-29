import * as React from 'react';
import { filterDRAlerts } from '@odf/mco/utils';
import AlertsPanel from '@odf/shared/alert/AlertsPanel';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { Card, CardBody } from '@patternfly/react-core';
import { ACM_ENDPOINT, HUB_CLUSTER_NAME } from '../../../../constants';
import AlertItem from './alert-item';
import './alert-card.scss';

export const AlertsCard: React.FC = () => {
  const [alerts, loaded, loadError] = useAlerts(ACM_ENDPOINT, HUB_CLUSTER_NAME);

  return (
    <Card data-test="alerts-card">
      <CardBody className="mco-alert">
        <AlertsPanel
          alerts={alerts}
          AlertItemComponent={AlertItem}
          alertsFilter={filterDRAlerts}
          loaded={loaded}
          loadError={loadError}
        />
      </CardBody>
    </Card>
  );
};

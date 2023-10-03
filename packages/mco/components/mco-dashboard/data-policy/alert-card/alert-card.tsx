import * as React from 'react';
import { filterDRAlerts } from '@odf/mco/utils';
import AlertsPanel from '@odf/shared/alert/AlertsPanel';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { Card, CardBody } from '@patternfly/react-core';
import AlertItem from './alert-item';
import './alert-card.scss';

export const AlertsCard: React.FC = () => {
  const [alerts, loaded, loadError] = useAlerts();
  const { t } = useCustomTranslation();

  return (
    <Card data-test="alerts-card">
      <CardBody className="mco-alert">
        <AlertsPanel
          alerts={alerts}
          AlertItemComponent={AlertItem}
          alertsFilter={filterDRAlerts}
          titleToolTip={
            <Trans t={t}>
              Alerts are displayed for both <b>ApplicationSet</b> and{' '}
              <b>Subscription</b> type applications.
            </Trans>
          }
          loaded={loaded}
          loadError={loadError}
        />
      </CardBody>
    </Card>
  );
};

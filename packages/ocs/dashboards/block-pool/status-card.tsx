import * as React from 'react';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const StatusCard: React.FC = () => {
  const { t } = useTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);

  return (
    <Card data-test-id="status-card">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <Status status={obj.status?.phase} />
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

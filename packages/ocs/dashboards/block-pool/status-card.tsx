import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);

  return (
    <Card data-test-id="status-card">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Status status={obj.status?.phase} />
      </CardBody>
    </Card>
  );
};

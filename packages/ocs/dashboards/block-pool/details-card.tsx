import * as React from 'react';
import { PoolType } from '@odf/ocs/constants';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const volumeType = PoolType.BLOCK;
  const deviceType = obj.spec?.deviceClass?.toUpperCase() ?? '-';

  return (
    <Card data-test-id="details-card">
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem isLoading={!obj} title={t('Pool name')}>
            {obj.metadata?.name}
          </DetailItem>
          <DetailItem isLoading={!obj} title={t('Volume type')}>
            {volumeType}
          </DetailItem>
          <DetailItem isLoading={!obj} title={t('Device type')}>
            {deviceType}
          </DetailItem>
          <DetailItem isLoading={!obj} title={t('Replicas')}>
            {obj.spec?.replicated?.size}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const volumeType = obj.spec?.deviceClass?.toUpperCase() ?? '-';

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
          <DetailItem isLoading={!obj} title={t('Replicas')}>
            {obj.spec?.replicated?.size}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

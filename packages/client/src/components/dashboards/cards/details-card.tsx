import * as React from 'react';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import { Card, CardHeader, CardTitle, CardBody } from '@patternfly/react-core';
import { CLIENT_OPERATOR } from '../../../constants';

const getOperatorVersion = (operator: K8sResourceKind): string =>
  operator?.spec?.version || '';

export const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: CLIENT_OPERATOR,
  });

  const subscriptionVersion = getOperatorVersion(csv);

  const serviceName = t('Data Foundation');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem key="service_name" title={t('Service name')}>
            {serviceName}
          </DetailItem>
          <DetailItem key="mode" title={t('Mode')}>
            {t('Client')}
          </DetailItem>
          <DetailItem
            key="version"
            title={t('Version')}
            isLoading={!csvLoaded}
            error={csvError?.message}
            data-test-id="cluster-subscription"
          >
            {subscriptionVersion}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;

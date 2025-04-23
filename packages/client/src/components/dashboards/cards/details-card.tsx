import * as React from 'react';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOprVersionFromCSV } from '@odf/shared/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  DescriptionList,
} from '@patternfly/react-core';
import { CLIENT_OPERATOR } from '../../../constants';

export const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: CLIENT_OPERATOR,
  });

  const subscriptionVersion = getOprVersionFromCSV(csv);

  const serviceName = t('Data Foundation');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DescriptionList>
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
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;

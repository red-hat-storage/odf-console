import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

export const ThroughputCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card data-test="nfs-throughput-card">
      <CardHeader>
        <CardTitle>{t('Throughput')}</CardTitle>
      </CardHeader>
      <CardBody>{/** ToDo: add card here */}</CardBody>
    </Card>
  );
};

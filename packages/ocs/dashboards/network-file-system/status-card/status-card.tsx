import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card data-test="nfs-status-card">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>{/** ToDo: add card here */}</CardBody>
    </Card>
  );
};

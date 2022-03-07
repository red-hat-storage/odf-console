import * as React from 'react';
import { useTranslation } from 'react-i18next';

export const DataPoliciesList: React.FC<{}> = () => {
  const { t } = useTranslation('plugin__odf-console');
  return <>{t('Data Policies')}</>;
};

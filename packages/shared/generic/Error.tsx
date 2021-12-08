import * as React from 'react';
import { useTranslation } from 'react-i18next';

export const DataUnavailableError: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  return (
    <div className="centerComponent">
      <div className="text-muted">{t('No data available')}</div>
    </div>
  );
};

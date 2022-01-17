import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@patternfly/react-core';

export const DataUnavailableError: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  return (
    <div className="centerComponent">
      <div className="text-muted">{t('No data available')}</div>
    </div>
  );
};

export const ErrorAlert: React.FC<Props> = ({ message, title }) => {
  const { t } = useTranslation('plugin__odf-console');

  return (
    <Alert
      isInline
      className="co-alert co-alert--scrollable"
      title={title || t('An error occurred')}
      variant="danger"
    >
      {message}
    </Alert>
  );
};

type Props = {
  message: string;
  title?: string;
};

import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';
import '../style.scss';

export const DataUnavailableError: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <div className="centerComponent">
      <div className="text-muted">{t('No data available')}</div>
    </div>
  );
};

export const ErrorAlert: React.FC<Props> = ({ message, title }) => {
  const { t } = useCustomTranslation();

  return (
    <Alert
      isInline
      className="odf-alert odf-alert--scrollable"
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

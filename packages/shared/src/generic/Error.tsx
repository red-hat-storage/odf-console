import * as React from 'react';
import classNames from 'classnames';
import { Alert } from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const DataUnavailableError: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t } = useCustomTranslation();
  return (
    <div className={classNames('centerComponent', className)}>
      <div className="text-muted">{t('No data available')}</div>
    </div>
  );
};

export const ErrorAlert: React.FC<Props> = ({ message, title }) => {
  const { t } = useCustomTranslation();

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

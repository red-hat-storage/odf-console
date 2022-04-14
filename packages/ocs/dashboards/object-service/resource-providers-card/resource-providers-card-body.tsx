import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useTranslation } from 'react-i18next';

export const ResourceProvidersBody: React.FC<ResourceProvidersBodyProps> = ({
  isLoading,
  hasProviders,
  children,
  error,
}) => {
  const { t } = useTranslation();

  let body: React.ReactNode;

  if (isLoading) {
    body = <LoadingInline />;
  }
  if (error || !hasProviders) {
    body = (
      <div className="nb-resource-providers-card__not-available text-secondary">
        {t('Not available')}
      </div>
    );
  }
  return <>{body || children}</>;
};

type ResourceProvidersBodyProps = {
  children: React.ReactNode;
  hasProviders: boolean;
  isLoading: boolean;
  error: boolean;
};

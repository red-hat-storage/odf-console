import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';

export const LoadingComponent: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <span
      className="pf-v6-c-spinner"
      role="progressbar"
      aria-label={t('Loading...')}
      aria-valuetext={t('Loading...')}
    >
      <span className="pf-v6-c-spinner__clipper" />
      <span className="pf-v6-c-spinner__lead-ball" />
      <span className="pf-v6-c-spinner__tail-ball" />
    </span>
  );
};

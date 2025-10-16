import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import {
  Alert,
  AlertVariant,
  AlertActionLink,
  AlertGroup,
} from '@patternfly/react-core';

type ThirdPartyStorageWarningProps = {
  docHref: string;
  className?: string;
};

const ThirdPartyStorageWarning: React.FC<ThirdPartyStorageWarningProps> = ({
  docHref,
  className,
}) => {
  const { t } = useCustomTranslation();
  return (
    <AlertGroup isLiveRegion>
      <Alert
        className={className}
        variant={AlertVariant.warning}
        title={t('Before you use Third-party storage')}
        actionLinks={
          <AlertActionLink
            component="a"
            href={docHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('View documentation')}
          </AlertActionLink>
        }
      >
        {t(
          `Ensure the third party storage supports Disaster Recovery pre-requisites and enable the required configuration for the same.`
        )}
      </Alert>
    </AlertGroup>
  );
};

export default ThirdPartyStorageWarning;

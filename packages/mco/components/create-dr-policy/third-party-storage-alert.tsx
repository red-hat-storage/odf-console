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
        title={t('Before you use third-party storage')}
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
          `Ensure that it supports disaster recovery requirements, including replication, failover, and recovery. Configure the necessary settings accordingly.`
        )}
      </Alert>
    </AlertGroup>
  );
};

export default ThirdPartyStorageWarning;

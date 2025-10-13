import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import {
  Alert,
  AlertVariant,
  AlertActionLink,
  AlertGroup,
} from '@patternfly/react-core';

type ThirdPartyStorageWarningProps = {
  className?: string;
};

const ThirdPartyStorageWarning: React.FC<ThirdPartyStorageWarningProps> = ({
  className,
}) => {
  const { t } = useCustomTranslation();
  const doc =
    'https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.20/html-single/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#third-party-storage-prerequisites';
  return (
    <AlertGroup isLiveRegion>
      <Alert
        className={className}
        variant={AlertVariant.warning}
        title={t('Before you use Third-party storage')}
        actionLinks={
          <AlertActionLink
            component="a"
            href={doc}
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

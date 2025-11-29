import * as React from 'react';
import { AccessKeyMetadata } from '@aws-sdk/client-iam';
import { MAX_ACCESS_KEYS } from '@odf/core/constants/s3-iam';
import { GenerateAnotherAccessKeyModal } from '@odf/core/modals/s3-iam/GenerateAnotherAccessKeyModal';
import { IAMUserDetails } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Alert, AlertVariant, Button, Grid } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useUserAccessKeys } from '../hooks/useUserAccessKeys';
import { useUserDetails } from '../hooks/useUserDetails';
import AccessKeyCard from './AccessKeyCard';

type IAMAccesskeysDetailsProps = {
  obj: IAMUserDetails;
};

/**
 * Displays AccessKeysDetails in a Card.
 * Create Another Accesskey if only one Accesskey exists
 * @param userName @param iamClient
 */
export const AccessKeysDetails: React.FC<IAMAccesskeysDetailsProps> = ({
  obj,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  const { userName, iamClient } = obj;

  // Fetch user details
  const {
    userDetails,
    isLoading: isLoadingUserDetails,
    error: userDetailsError,
  } = useUserDetails(userName, iamClient);

  // Fetch user access keys
  const {
    iamAccessKeys,
    isLoading: isLoadingAccessKeys,
    error: accessKeysError,
    refetch: refetchAccessKeys,
  } = useUserAccessKeys(userName, iamClient);

  const isLoading = isLoadingUserDetails && isLoadingAccessKeys;
  const error = userDetailsError || accessKeysError;

  const launchModalOnClick = (modalComponent: ModalComponent) => () => {
    launchModal(modalComponent, {
      isOpen: true,
      userName,
      refetchAll: refetchAccessKeys,
      iamClient,
    });
  };

  if (isLoading || error) {
    return <StatusBox loaded={!isLoading} loadError={isLoading ? '' : error} />;
  }
  return (
    <div className="odf-m-pane__body">
      <div className="pf-v5-u-mt-md">
        {iamAccessKeys.length > 0 && (
          <>
            <Alert
              title={t('You can define only {{maxKeys}} access keys', {
                maxKeys: MAX_ACCESS_KEYS,
              })}
              variant={AlertVariant.info}
              isInline
            >
              {t('State the reason, how it is helpful')}
            </Alert>
            <Grid hasGutter>
              {iamAccessKeys.map(
                (iamAccessKey: AccessKeyMetadata, index: number) => (
                  <AccessKeyCard
                    key={iamAccessKey.AccessKeyId}
                    accessKeyCard={iamAccessKey}
                    accessKeyNumber={index + 1}
                    tags={userDetails?.Tags || []}
                    refetch={refetchAccessKeys}
                    iamClient={iamClient}
                  />
                )
              )}
            </Grid>
          </>
        )}
        {iamAccessKeys.length < MAX_ACCESS_KEYS && (
          <Button
            variant="secondary"
            onClick={launchModalOnClick(GenerateAnotherAccessKeyModal)}
            icon={<PlusCircleIcon />}
            aria-label={t('Generate another access key')}
          >
            {t('Generate another access key')}
          </Button>
        )}
      </div>
    </div>
  );
};

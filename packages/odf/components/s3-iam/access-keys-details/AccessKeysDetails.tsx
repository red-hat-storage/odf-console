import * as React from 'react';
import { AccessKeyMetadata } from '@aws-sdk/client-iam';
import { MAX_ACCESS_KEYS } from '@odf/core/constants/s3-iam';
import { GenerateAnotherAccessKeyModal } from '@odf/core/modals/s3-iam/GenerateAnotherAccessKeyModal';
import { IamUserDetails } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import { LoadingBox, StatusBox } from '@odf/shared/generic/status-box';
import { IamCommands } from '@odf/shared/iam';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  Grid,
  EmptyState,
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { KeyIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useUserAccessKeys } from '../hooks/useUserAccessKeys';
import { useUserDetails } from '../hooks/useUserDetails';
import AccessKeyCard from './AccessKeyCard';

type IamAccesskeysDetailsProps = {
  obj: IamUserDetails;
};

type AccessKeysDetailsContentProps = {
  userName: string;
  iamClient: IamCommands;
  triggerRefresh: () => void;
};

const AccessKeysDetailsContent: React.FC<AccessKeysDetailsContentProps> = ({
  userName,
  iamClient,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  // Fetch user details (for tags)
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
  } = useUserAccessKeys(userName, iamClient);

  const tags = userDetails?.Tags || [];
  const isLoading = isLoadingUserDetails || isLoadingAccessKeys;
  const error = userDetailsError || accessKeysError;

  const launchModalOnClick = React.useCallback(() => {
    launchModal(GenerateAnotherAccessKeyModal, {
      isOpen: true,
      userName,
      refreshTokens: triggerRefresh,
      iamClient,
    });
  }, [launchModal, userName, triggerRefresh, iamClient]);

  if (isLoading || error) {
    return <StatusBox loaded={!isLoading} loadError={error} />;
  }

  return (
    <div className="odf-m-pane__body">
      <div className="pf-v6-u-mt-md">
        <Alert
          title={t('You can define only {{maxKeys}} access keys', {
            maxKeys: MAX_ACCESS_KEYS,
          })}
          variant={AlertVariant.info}
          isInline
        >
          {t(
            'An access key enables secure access to Object storage resources.'
          )}
        </Alert>
        <Grid hasGutter>
          {iamAccessKeys.map(
            (iamAccessKey: AccessKeyMetadata, index: number) => (
              <AccessKeyCard
                key={iamAccessKey.AccessKeyId}
                accessKeyCard={iamAccessKey}
                accessKeyNumber={index + 1}
                tags={tags}
                refreshTokens={triggerRefresh}
                iamClient={iamClient}
              />
            )
          )}
        </Grid>
        {iamAccessKeys.length === 0 && (
          <EmptyState
            headingLevel="h4"
            icon={KeyIcon}
            titleText={t('No access keys found')}
            variant={EmptyStateVariant.lg}
          >
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  variant="secondary"
                  onClick={launchModalOnClick}
                  icon={<PlusCircleIcon />}
                  aria-label={t('Generate access key')}
                >
                  {t('Generate access key')}
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        )}
        {iamAccessKeys.length > 0 && iamAccessKeys.length < MAX_ACCESS_KEYS && (
          <Button
            variant="secondary"
            onClick={launchModalOnClick}
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

/**
 * Displays AccessKeysDetails in a Card.
 * Create Another Accesskey if only one Accesskey exists
 * @param userName @param iamClient @param fresh @param triggerRefresh
 */
export const AccessKeysDetails: React.FC<IamAccesskeysDetailsProps> = ({
  obj,
}) => {
  const { userName, iamClient, fresh, triggerRefresh } = obj;

  return fresh ? (
    <AccessKeysDetailsContent
      userName={userName}
      iamClient={iamClient}
      triggerRefresh={triggerRefresh}
    />
  ) : (
    <LoadingBox />
  );
};

import * as React from 'react';
import {
  AccessKeyStatus,
  IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY,
} from '@odf/core/constants/s3-iam';
import { DASH, useUserSettingsLocalStorage } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { TFunction } from 'react-i18next';
import {
  Modal,
  Button,
  ModalVariant,
  Text,
  TextInput,
  TextInputTypes,
  FormGroup,
  Alert,
  AlertVariant,
  ButtonVariant,
  Spinner,
  FlexItem,
  List,
  ListItem,
  AlertActionLink,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useUserAccessKeys } from '../../components/s3-iam/hooks/useUserAccessKeys';
import { useUserDetails } from '../../components/s3-iam/hooks/useUserDetails';

type DeleteIamUserModalProps = {
  userName: string;
  iamClient: IamCommands;
  refreshTokens: () => void;
};

const getTextInputLabel = (t: TFunction) => (
  <Trans t={t as any}>
    <b>
      To confirm deletion, type <i>{{ delete: 'delete' }}</i>:
    </b>
  </Trans>
);

const getDescription = (t: TFunction) => (
  <div className="text-muted">
    {t(
      'Delete the IAM user permanently? All user data, access keys, secret keys and inline policies related to this user will also be deleted'
    )}
  </div>
);

/**
 * Delete IAM User Modal, deactivate the Access Keys before deletion
 * @param userName @param iamClient @param refreshTokens
 */
export const DeleteIamUserModal: React.FC<
  CommonModalProps<DeleteIamUserModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { userName, iamClient, refreshTokens },
}) => {
  const { t } = useCustomTranslation();
  const [deleteText, setDeleteText] = React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();
  const [deactivateSuccess, setDeactivateSuccess] = React.useState(false);

  // Fetch user details
  const {
    userDetails,
    isLoading: isLoadingUser,
    error: userError,
  } = useUserDetails(userName, iamClient);

  // Fetch user access keys
  const {
    iamAccessKeys,
    hasActiveAccessKeys,
    isLoading: isLoadingAccessKeys,
    error: accessKeysError,
  } = useUserAccessKeys(userName, iamClient);

  const isChecking = isLoadingUser || isLoadingAccessKeys;
  const fetchError = userError || accessKeysError;

  const creationDate = userDetails?.CreateDate
    ? new Date(userDetails.CreateDate).toLocaleDateString()
    : DASH;

  const lastUsed = userDetails?.PasswordLastUsed
    ? new Date(userDetails.PasswordLastUsed).toLocaleDateString()
    : DASH;

  const [, setFavorites] = useUserSettingsLocalStorage<string[]>(
    IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await iamClient.deleteIamUser({
        UserName: userName,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((user) => user !== userName)
      );
      refreshTokens();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  const onDeactivate = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      const keysToDeactivate = iamAccessKeys ?? [];

      const deactivatePromises = keysToDeactivate
        .filter((key) => key.Status === AccessKeyStatus.ACTIVE)
        .map((key) =>
          iamClient.updateAccessKey({
            AccessKeyId: key.AccessKeyId,
            Status: AccessKeyStatus.INACTIVE,
            UserName: userName,
          })
        );

      await Promise.all(deactivatePromises);

      setInProgress(false);
      setDeactivateSuccess(true);
      refreshTokens();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Delete user?')}
      titleIconVariant="danger"
      isOpen={isOpen}
      onClose={closeModal}
      description={getDescription(t)}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          key="actions"
          inProgress={inProgress}
          errorMessage={error?.message || fetchError?.message}
        >
          <span>
            <Button
              className="pf-v5-u-mr-xs"
              variant={ButtonVariant.danger}
              isLoading={inProgress}
              isDisabled={
                deleteText !== t('delete') ||
                inProgress ||
                hasActiveAccessKeys ||
                !!error ||
                !!fetchError
              }
              onClick={onDelete}
            >
              {t('Delete user')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v5-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Table variant="compact" borders={true} className="pf-v5-u-mb-md">
        <Thead>
          <Tr>
            <Th>{t('User name')}</Th>
            <Th>{t('Creation date')}</Th>
            <Th>{t('Last activity')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td dataLabel={t('User name')}>{userName || DASH}</Td>
            <Td dataLabel={t('Creation date')}>{creationDate}</Td>
            <Td dataLabel={t('Last activity')}>{lastUsed}</Td>
          </Tr>
        </Tbody>
      </Table>
      {isChecking && <Spinner size="md" className="pf-v5-u-mb-md" />}
      {hasActiveAccessKeys && !deactivateSuccess && (
        <FlexItem>
          <Alert
            variant="warning"
            isInline
            title={t('User has one or more active access keys')}
            actionLinks={
              <AlertActionLink onClick={onDeactivate} isDisabled={inProgress}>
                {t('Deactivate access keys')}
              </AlertActionLink>
            }
          >
            <Text>
              {t('IAM user has {{count}} active access keys', {
                count: iamAccessKeys.filter(
                  (ak) => ak.Status === AccessKeyStatus.ACTIVE
                ).length,
              })}
            </Text>
            <List component="ol" className="pf-v5-u-mt-sm">
              {iamAccessKeys.map(
                (accessKey) =>
                  accessKey.Status === AccessKeyStatus.ACTIVE && (
                    <ListItem key={accessKey.AccessKeyId}>
                      {accessKey.AccessKeyId}
                    </ListItem>
                  )
              )}
            </List>
            <Text className="pf-v5-u-mt-md">
              <b>
                {t(
                  'You must deactivate the access keys before deleting this user'
                )}
              </b>
            </Text>
          </Alert>
        </FlexItem>
      )}
      {deactivateSuccess && (
        <Alert
          variant={AlertVariant.success}
          isInline
          title={t('Access keys deactivated successfully')}
          className="co-alert pf-v5-u-mb-md"
        >
          <p>
            {t('All access keys assigned to the user have been deactivated')}
          </p>
        </Alert>
      )}
      <FormGroup
        label={getTextInputLabel(t)}
        className="pf-v5-u-mt-lg pf-v5-u-mb-sm"
        fieldId="delete-user"
      >
        <TextInput
          value={deleteText}
          id="delete-user"
          onChange={(_event, value) => setDeleteText(value)}
          type={TextInputTypes.text}
          placeholder={t('delete')}
        />
      </FormGroup>
    </Modal>
  );
};

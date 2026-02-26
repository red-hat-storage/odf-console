import * as React from 'react';
import {
  AccessKeyStatus,
  IAM_BASE_ROUTE,
  IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY,
} from '@odf/core/constants/s3-iam';
import { DASH, useUserSettingsLocalStorage } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Button,
  Content,
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
import { cleanupAllPolicies } from '../../utils/s3-iam';

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
 * Delete IAM User Modal, delete the Access Keys before deletion
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
  const [deleteSuccess, setDeleteSuccess] = React.useState(false);

  const navigate = useNavigate();

  // Fetch user details
  const {
    userDetails,
    isLoading: isLoadingUser,
    error: userError,
  } = useUserDetails(userName, iamClient);

  // Fetch user access keys
  const {
    iamAccessKeys,
    isLoading: isLoadingAccessKeys,
    error: accessKeysError,
  } = useUserAccessKeys(userName, iamClient);

  const hasAccessKeys = iamAccessKeys.length > 0;

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
      // Clean up all inline policies before deleting user
      await cleanupAllPolicies(iamClient, userName);

      await iamClient.deleteIamUser({
        UserName: userName,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((user) => user !== userName)
      );
      refreshTokens();
      navigate(IAM_BASE_ROUTE);
    } catch (err) {
      setError(err as Error);
    } finally {
      setInProgress(false);
    }
  };

  const onDeleteAccessKeys = async (event: React.FormEvent) => {
    event.preventDefault();
    setInProgress(true);

    try {
      const accessKeys = iamAccessKeys ?? [];
      if (accessKeys.length === 0) {
        setDeleteSuccess(true);
        return;
      }

      const deactivateAccessKeysPromises = accessKeys
        .filter((key) => key.Status === AccessKeyStatus.ACTIVE)
        .map((key) =>
          iamClient.updateAccessKey({
            AccessKeyId: key.AccessKeyId,
            Status: AccessKeyStatus.INACTIVE,
            UserName: userName,
          })
        );

      if (deactivateAccessKeysPromises.length > 0) {
        await Promise.all(deactivateAccessKeysPromises);
      }

      const deleteAccessKeysPromises = accessKeys.map((key) =>
        iamClient.deleteAccessKey({
          UserName: key.UserName,
          AccessKeyId: key.AccessKeyId,
        })
      );

      await Promise.all(deleteAccessKeysPromises);

      setDeleteSuccess(true);
    } catch (err) {
      setError(err as Error);
    } finally {
      setInProgress(false);
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
              className="pf-v6-u-mr-xs"
              variant={ButtonVariant.danger}
              isLoading={inProgress}
              isDisabled={deleteText !== t('delete') || inProgress}
              onClick={onDelete}
            >
              {t('Delete user')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Table variant="compact" borders={true} className="pf-v6-u-mb-md">
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
      {isChecking ? (
        <Spinner size="md" className="pf-v6-u-mb-md" />
      ) : (
        hasAccessKeys &&
        !deleteSuccess && (
          <FlexItem>
            <Alert
              variant="warning"
              isInline
              title={t('User has one or more access keys')}
              actionLinks={
                <AlertActionLink
                  onClick={onDeleteAccessKeys}
                  isDisabled={inProgress}
                >
                  {t('Delete access keys')}
                </AlertActionLink>
              }
            >
              <Content component="p">
                {t('IAM user has {{count}} access keys', {
                  count: iamAccessKeys.length,
                })}
              </Content>
              <List component="ol" className="pf-v6-u-mt-sm">
                {iamAccessKeys.map(
                  (accessKey) =>
                    accessKey.Status === AccessKeyStatus.ACTIVE && (
                      <ListItem key={accessKey.AccessKeyId}>
                        {accessKey.AccessKeyId}
                      </ListItem>
                    )
                )}
              </List>
              <Content component="p" className="pf-v6-u-mt-md">
                <b>
                  {t(
                    'You must delete the access keys before deleting this user'
                  )}
                </b>
              </Content>
            </Alert>
          </FlexItem>
        )
      )}
      {deleteSuccess && (
        <Alert
          variant={AlertVariant.success}
          isInline
          title={t('Access keys deleted successfully')}
          className="co-alert pf-v6-u-mb-md"
        >
          <p>{t('All access keys assigned to the user have been deleted')}</p>
        </Alert>
      )}
      <FormGroup
        label={getTextInputLabel(t)}
        className="pf-v6-u-mt-lg pf-v6-u-mb-sm"
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

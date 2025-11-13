import * as React from 'react';
import { useUserSettingsLocalStorage } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { S3IAMCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
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
  CardHeader,
  CardTitle,
  Card,
  CardBody,
  List,
  ListItem,
  CardFooter,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useFetchUserAndAccessKeys } from '../hooks/useFetchUserAndAccessKeys';
import { accessKeysMock, GetUserMock } from '../mock';

const IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY = 'console.iamUsersBookmarks';
const DELETE = 'delete';

type DeleteIAMUserModalProps = {
  userName: string;
  noobaaS3IAM: S3IAMCommands;
  refreshTokens?: () => void;
};

const getTextInputLabel = (t) => (
  <Trans t={t as any}>
    <b>
      To confirm deletion, type <i>{{ delete: DELETE }}</i>:
    </b>
  </Trans>
);

const getDescription = (t) => (
  <div className="text-muted">
    {t(
      'Deleting an IAM user cannot be undone. All user data and inline policies related to this user will also be deleted.'
    )}
  </div>
);

/**
 * Delete IAM User Modal, deactivate the AccessKeys before deletion
 * @param userName @param noobaaS3IAM @param refreshTokens
 */
export const DeleteIAMUserModal: React.FC<
  CommonModalProps<DeleteIAMUserModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { userName, noobaaS3IAM, refreshTokens },
}) => {
  const { t } = useCustomTranslation();
  const [deleteText, setDeleteText] = React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  // Fetch user and access keys
  const {
    // userDetails,
    // accessKeys,
    error: fetchError,
    isLoading: isChecking,
    hasActiveAccessKeys,
    refetchAll,
  } = useFetchUserAndAccessKeys(userName, noobaaS3IAM);

  const userDetails = GetUserMock.User;
  const accessKeys = accessKeysMock.AccessKeyMetadata;
  const creationDate = userDetails.CreateDate
    ? new Date(userDetails.CreateDate).toLocaleDateString()
    : '-';

  const lastUsed = userDetails.PasswordLastUsed
    ? new Date(userDetails.PasswordLastUsed).toLocaleDateString()
    : '-';

  const [, setFavorites] = useUserSettingsLocalStorage<string[]>(
    IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await noobaaS3IAM.deleteIAMUser({
        UserName: userName,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((user) => user !== userName)
      );
      refreshTokens?.();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  const onDeactivate = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      const keysToDeactivate = accessKeys ?? [];

      const deactivatePromises = keysToDeactivate
        .filter((key) => key.Status === 'Active')
        .map((key) =>
          noobaaS3IAM.updateAccessKey({
            AccessKeyId: key.AccessKeyId,
            Status: 'Inactive',
            UserName: userName,
          })
        );

      await Promise.all(deactivatePromises);

      setInProgress(false);
      // Refetch to update the UI
      refetchAll();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Delete user permanently?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={getDescription(t)}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          key="actions"
          inProgress={inProgress}
          // errorMessage={error?.message || fetchError?.message}
        >
          <span>
            <Button
              variant={ButtonVariant.danger}
              onClick={onDelete}
              isDisabled={
                deleteText !== DELETE ||
                inProgress ||
                hasActiveAccessKeys ||
                !!error ||
                !!fetchError
              }
              className="pf-v5-u-mr-xs"
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
            <Td dataLabel={t('User name')}>{userName || '-'}</Td>
            <Td dataLabel={t('Creation date')}>{creationDate}</Td>
            <Td dataLabel={t('Last activity')}>{lastUsed}</Td>
          </Tr>
        </Tbody>
      </Table>
      {isChecking ? (
        <Spinner size="md" className="pf-v5-u-mb-md" />
      ) : !hasActiveAccessKeys ? (
        <FlexItem>
          <Card className="pf-v5-u-m-md">
            <CardHeader>
              <CardTitle>
                {t('User has one or more active accesskeys')}
              </CardTitle>
              <Text>
                {t('IAM user has {{count}} active accesskeys', {
                  count: accessKeys.filter((ak) => ak.Status === 'Active')
                    .length,
                })}
              </Text>
            </CardHeader>
            <CardBody className="pf-v5-py-m-sm">
              <List component="ol">
                {accessKeys.map(
                  (accessKey) =>
                    accessKey.Status === 'Active' && (
                      <ListItem key={accessKey.AccessKeyId}>
                        {accessKey.AccessKeyId}
                      </ListItem>
                    )
                )}
              </List>
            </CardBody>
            <CardFooter>
              <Text>
                <b>
                  {t(
                    'You must deactivate the acceskeys before deleting this user'
                  )}
                </b>
              </Text>
            </CardFooter>
          </Card>
          <Button
            variant="warning"
            onClick={onDeactivate}
            isDisabled={inProgress}
          >
            {t('Deactivate accesskeys')}
          </Button>
        </FlexItem>
      ) : (
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
          placeholder={DELETE}
        />
      </FormGroup>
    </Modal>
  );
};

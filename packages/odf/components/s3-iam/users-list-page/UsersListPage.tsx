import * as React from 'react';
import { USERS_CREATE_PAGE_PATH } from '@odf/core/constants/s3-iam';
import { ODF_ADMIN } from '@odf/core/features';
import { IamUserCrFormat, S3ProviderType } from '@odf/core/types';
import { useRefresh } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidFilteredData } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  useFlag,
  useModal,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button, ButtonVariant, Flex, FlexItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { ActionsColumn } from '@patternfly/react-table';
import {
  getAcountBadge,
  getAccountActionsItems,
} from '../../s3-browser/buckets-list-page/bucketsListPage';
import { ClientType } from '../../s3-common/types';
import { IamContext, IamProvider } from '../iam-context';
import { UsersListTable } from './UsersListTable';
import { UsersPagination } from './UsersPagination';

type UsersInfo = [IamUserCrFormat[], boolean, any];

type UsersListPageBodyProps = {
  usersInfo: UsersInfo;
  setUsersInfo: React.Dispatch<React.SetStateAction<UsersInfo>>;
};

const UsersListPageBody: React.FC<UsersListPageBodyProps> = ({
  usersInfo,
  setUsersInfo,
}) => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const [users, loaded, loadError] = usersInfo;
  const [allUsers, filteredUsers, onFilterChange] = useListPageFilter(users);
  return (
    <ListPageBody>
      <Flex className="pf-v6-u-mt-md">
        <Flex flex={{ default: 'flex_1' }}>
          <FlexItem className="pf-v6-u-mr-md">
            <ListPageFilter
              loaded={true}
              hideLabelFilter={true}
              nameFilterPlaceholder={t('Find by accountname')}
              data={getValidFilteredData(allUsers)}
              onFilterChange={onFilterChange}
            />
          </FlexItem>
          <FlexItem>
            <Button
              icon={<SyncAltIcon />}
              data-test="users-list-sync-button"
              variant={ButtonVariant.plain}
              onClick={triggerRefresh}
              isDisabled={!fresh}
            />
          </FlexItem>
        </Flex>
        <Flex>
          <FlexItem>
            {fresh && <UsersPagination setUsersInfo={setUsersInfo} />}
          </FlexItem>
        </Flex>
      </Flex>
      {fresh && (
        <UsersListTable
          allUsers={users}
          filteredUsers={filteredUsers}
          loaded={loaded}
          error={loadError}
          triggerRefresh={triggerRefresh}
        />
      )}
    </ListPageBody>
  );
};

const UsersListPageContent: React.FC = () => {
  const { t } = useCustomTranslation();

  const [usersInfo, setUsersInfo] = React.useState<UsersInfo>([
    [],
    false,
    undefined,
  ]);

  const isAdmin = useFlag(ODF_ADMIN);
  const { logout, setSecretRef } = React.useContext(IamContext);
  const launcher = useModal();

  return (
    <>
      <ListPageHeader
        title={t('IAM user')}
        {...(!isAdmin ? { badge: getAcountBadge(t) } : {})}
      >
        <ListPageCreateLink to={USERS_CREATE_PAGE_PATH}>
          {t('Create IAM user')}
        </ListPageCreateLink>
        {!isAdmin && (
          <ActionsColumn
            items={getAccountActionsItems(
              t,
              launcher,
              S3ProviderType.Noobaa,
              logout,
              setSecretRef,
              ClientType.IAM
            )}
          />
        )}
      </ListPageHeader>
      <div className="pf-v6-u-ml-lg pf-v6-u-mr-lg text-muted">
        {t('IAM account is used to manage users, access keys and policies')}
      </div>
      <UsersListPageBody usersInfo={usersInfo} setUsersInfo={setUsersInfo} />
    </>
  );
};

const UsersListPage: React.FC = () => {
  return (
    <IamProvider>
      <UsersListPageContent />
    </IamProvider>
  );
};

export default UsersListPage;

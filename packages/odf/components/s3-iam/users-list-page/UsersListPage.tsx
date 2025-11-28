import * as React from 'react';
import { USERS_CREATE_PAGE_PATH } from '@odf/core/constants/s3-iam';
import { useRefresh } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageHeader,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  SearchInput,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { IAMUsers } from '../../../types';
import { IamProvider } from '../iam-context';
import { UsersListTable } from './UsersListTable';
import { UsersPagination } from './UsersPagination';

type UsersInfo = [IAMUsers[], boolean, any];

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
  const [searchInput, setSearchInput] = React.useState('');

  const filteredUsers = React.useMemo(() => {
    if (!searchInput) return users;
    const lowerSearch = searchInput.toLowerCase();
    return users.filter((user) =>
      user.userDetails?.UserName?.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchInput]);
  return (
    <ListPageBody>
      <Flex className="pf-v5-u-mt-md">
        <Flex flex={{ default: 'flex_1' }}>
          <FlexItem className="pf-v5-u-mr-md">
            <SearchInput
              placeholder={t('Search by name')}
              value={searchInput}
              onChange={(_event, value) => setSearchInput(value)}
              onClear={() => setSearchInput('')}
            />
          </FlexItem>
          <FlexItem>
            <Button
              data-test="users-list-sync-button"
              variant={ButtonVariant.plain}
              onClick={triggerRefresh}
              isDisabled={!fresh}
            >
              <SyncAltIcon />
            </Button>
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

  return (
    <>
      <ListPageHeader title={t('IAM user')}>
        <ListPageCreateLink to={USERS_CREATE_PAGE_PATH}>
          {t('Create IAM user')}
        </ListPageCreateLink>
      </ListPageHeader>
      <div className="pf-v5-u-ml-lg pf-v5-u-mr-lg text-muted">
        {t('IAM account is used to manage users, access keys and policies')}
      </div>
      <UsersListPageBody usersInfo={usersInfo} setUsersInfo={setUsersInfo} />
    </>
  );
};

const UsersListPage: React.FC = () => {
  return (
    <IamProvider loading={false}>
      <UsersListPageContent />
    </IamProvider>
  );
};

export default UsersListPage;

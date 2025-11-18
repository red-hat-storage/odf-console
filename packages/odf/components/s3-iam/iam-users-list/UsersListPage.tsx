import * as React from 'react';
import { useRefresh } from '@odf/shared/hooks';
import { USERS_CREATE_PAGE_PATH } from '@odf/shared/iam/constants';
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
import { usersMock } from '../mock';
import { UsersListTable } from './UsersListTable';
// import { NoobaaS3IAMProvider } from '../iam-context';
// import { UsersPagination } from './UsersPagination';

type UsersInfo = [IAMUsers[], boolean, any];

type UsersListPageBodyProps = {
  usersInfo: UsersInfo;
  setUsersInfo: React.Dispatch<React.SetStateAction<UsersInfo>>;
};

const UsersListPageBody: React.FC<UsersListPageBodyProps> = ({
  usersInfo,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  setUsersInfo,
}) => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  /* eslint-disable @typescript-eslint/no-unused-vars */
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
            {/* {fresh && <UsersPagination setUsersInfo={setUsersInfo} />} */}
          </FlexItem>
        </Flex>
      </Flex>
      {fresh && (
        <UsersListTable
          allUsers={users}
          filteredUsers={filteredUsers}
          // loaded={loaded}
          loaded={true}
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
    // [], false, undefined
    usersMock,
    true,
    undefined,
  ]);

  return (
    <>
      <ListPageHeader title={t('IAM Users')}>
        <ListPageCreateLink to={USERS_CREATE_PAGE_PATH}>
          {t('Create IAM User')}
        </ListPageCreateLink>
      </ListPageHeader>
      <div className="pf-v5-u-ml-lg pf-v5-u-mr-lg text-muted">
        {t(
          'IAM users are used to manage access keys, permissions, and policies for object storage.'
        )}
      </div>
      <UsersListPageBody usersInfo={usersInfo} setUsersInfo={setUsersInfo} />
    </>
  );
};

const UsersListPage: React.FC = () => {
  return (
    <UsersListPageContent />
    // <NoobaaS3IAMProvider loading={false}>
    //   <UsersListPageContent />
    // </NoobaaS3IAMProvider>
  );
};

export default UsersListPage;

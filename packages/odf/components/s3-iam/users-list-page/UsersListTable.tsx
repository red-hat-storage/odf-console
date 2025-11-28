import * as React from 'react';
import { IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY } from '@odf/core/constants/s3-iam';
import { IAMUsersCrFormat } from '@odf/core/types';
import { DASH } from '@odf/shared';
import { useUserSettingsLocalStorage } from '@odf/shared/hooks/useUserSettingsLocalStorage';
import { IamCommands } from '@odf/shared/iam';
import {
  ComposableTable,
  RowComponentType,
} from '@odf/shared/table/composable-table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import { Bullseye } from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  TableVariant,
  Td,
  Tr,
} from '@patternfly/react-table';
import { DeleteIamUserModal } from '../../../modals/s3-iam/DeleteIamUserModal';
import { IamContext } from '../iam-context';

const getUsersActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  userName: string,
  iamClient: IamCommands,
  refreshTokens: () => void
): IAction[] => [
  {
    title: t('Delete user'),
    onClick: () =>
      launcher(DeleteIamUserModal as any, {
        isOpen: true,
        extraProps: {
          userName,
          iamClient,
          refreshTokens,
        },
      }),
  },
];

const getColumnNames = (t: TFunction<string>) => [
  '', // favorites
  t('Name'),
  t('Access Keys'),
  t('Tags'),
  t('Description'),
  t('Creation Date'),
  '', // action kebab
];

const getHeaderColumns = (t: TFunction<string>, favorites: string[]) => {
  const columnNames = getColumnNames(t);
  return [
    {
      columnName: columnNames[0],
      sortFunction: (a, b, c) =>
        sortRows(a, b, c, 'userDetails.UserName', favorites),
    },
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'userDetails.UserName'),
    },
    {
      columnName: columnNames[2],
      thProps: {
        className: 'pf-v5-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[3],
      thProps: {
        className: 'pf-v5-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[4],
      thProps: {
        className: 'pf-v5-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[5],
      thProps: {
        className: 'pf-v5-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[6],
    },
  ];
};

const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="pf-v5-u-mt-xl">{t('No IAM users found')}</Bullseye>
  );
};

const UsersTableRow: React.FC<RowComponentType<IAMUsersCrFormat>> = ({
  row: user,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const {
    launcher,
    favorites,
    setFavorites,
    triggerRefresh,
    iamClient,
  }: RowExtraPropsType = extraProps;

  const { userDetails, accessKeys } = user;
  const userName = userDetails.UserName || DASH;

  const tags = userDetails.Tags || [];
  const tagCount = Array.isArray(tags) ? tags.length : 0;
  const accessKeyCount = Array.isArray(accessKeys) ? accessKeys.length : 0;

  // display the Tag 'Value' as description for which Accesskey is 'Key'
  const accessKeyIds = user.accessKeys?.map((ak) => ak.AccessKeyId) || [];
  const accessKeyTags = tags.filter((tag) => accessKeyIds.includes(tag.Key));
  const description = accessKeyTags.map((tag) => tag.Value).join(', ') || DASH;

  const creationDate = userDetails.CreateDate
    ? new Date(userDetails.CreateDate).toLocaleDateString()
    : DASH;

  // Construct path for resource link
  const path = `/odf/object-storage/iam/${userName}`;

  const onSetFavorite = (key, active) => {
    setFavorites((oldFavorites) => [
      ...oldFavorites.filter((oldFavorite) => oldFavorite !== key),
      ...(active ? [key] : []),
    ]);
  };

  return (
    <Tr key={rowIndex}>
      <Td
        dataLabel={columnNames[0]}
        favorites={{
          isFavorited: favorites.includes(userName),
          onFavorite: (_event, isFavoriting) =>
            onSetFavorite(userName, isFavoriting),
          rowIndex,
        }}
      />
      <Td dataLabel={columnNames[1]}>
        <Link to={path}>{userName}</Link>
      </Td>
      <Td dataLabel={columnNames[2]}>{accessKeyCount}</Td>
      <Td dataLabel={columnNames[3]}>{tagCount}</Td>
      <Td dataLabel={columnNames[4]}>{description}</Td>
      <Td dataLabel={columnNames[5]}>{creationDate}</Td>
      <Td dataLabel={columnNames[6]} isActionCell>
        <ActionsColumn
          items={getUsersActionsItems(
            t,
            launcher,
            userName,
            iamClient,
            triggerRefresh
          )}
        />
      </Td>
    </Tr>
  );
};

export const UsersListTable: React.FC<UsersListTableProps> = ({
  allUsers,
  filteredUsers,
  loaded,
  error,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const { iamClient } = React.useContext(IamContext);
  const [favorites, setFavorites] = useUserSettingsLocalStorage<string[]>(
    IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  const launcher = useModal();

  return (
    <ComposableTable
      rows={filteredUsers}
      columns={getHeaderColumns(t, favorites)}
      RowComponent={UsersTableRow}
      emptyRowMessage={EmptyRowMessage}
      unfilteredData={allUsers as []}
      loaded={loaded}
      loadError={error}
      isFavorites={true}
      variant={TableVariant.compact}
      extraProps={{
        launcher,
        favorites,
        setFavorites,
        triggerRefresh,
        iamClient,
      }}
    />
  );
};

type UsersListTableProps = {
  allUsers: IAMUsersCrFormat[];
  filteredUsers: IAMUsersCrFormat[];
  loaded: boolean;
  error: any;
  triggerRefresh: () => void;
};

type RowExtraPropsType = {
  launcher: LaunchModal;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  triggerRefresh: () => void;
  iamClient: IamCommands;
};

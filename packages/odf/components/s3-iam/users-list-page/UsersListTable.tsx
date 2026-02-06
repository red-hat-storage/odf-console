import * as React from 'react';
import {
  IAM_BASE_ROUTE,
  IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY,
} from '@odf/core/constants/s3-iam';
import { IamUserCrFormat } from '@odf/core/types';
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
      launcher(DeleteIamUserModal, {
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
  t('Creation Date'),
  t('Last activity'),
  '', // action kebab
];

const getHeaderColumns = (t: TFunction<string>, favorites: string[]) => {
  const columnNames = getColumnNames(t);
  return [
    {
      columnName: columnNames[0],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'UserName', favorites),
    },
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'UserName'),
    },
    {
      columnName: columnNames[2],
      thProps: {
        className: 'pf-v6-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[3],
      thProps: {
        className: 'pf-v6-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[4],
    },
  ];
};

const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="pf-v6-u-mt-xl">{t('No IAM users found')}</Bullseye>
  );
};

const UsersTableRow: React.FC<RowComponentType<IamUserCrFormat>> = ({
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

  const userName = user.UserName || DASH;

  const creationDate = user.CreateDate
    ? new Date(user.CreateDate).toLocaleDateString()
    : DASH;

  const passwordLastUsed = user.PasswordLastUsed
    ? new Date(user.PasswordLastUsed).toLocaleDateString()
    : DASH;

  const path = `${IAM_BASE_ROUTE}/${userName}`;

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
      <Td dataLabel={columnNames[2]}>{creationDate}</Td>
      <Td dataLabel={columnNames[3]}>{passwordLastUsed}</Td>
      <Td dataLabel={columnNames[4]} isActionCell>
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
  allUsers: IamUserCrFormat[];
  filteredUsers: IamUserCrFormat[];
  loaded: boolean;
  error: Error | null;
  triggerRefresh: () => void;
};

type RowExtraPropsType = {
  launcher: LaunchModal;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  triggerRefresh: () => void;
  iamClient: IamCommands;
};

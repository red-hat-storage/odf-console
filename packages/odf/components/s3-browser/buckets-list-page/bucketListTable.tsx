import * as React from 'react';
import {
  BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
  BUCKETS_BASE_ROUTE,
} from '@odf/core/constants';
import { BucketCrFormat } from '@odf/core/types';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { EmptyPage } from '@odf/shared/empty-state-page';
import { useUserSettingsLocalStorage } from '@odf/shared/hooks/useUserSettingsLocalStorage';
import {
  ComposableTable,
  RowComponentType,
} from '@odf/shared/table/composable-table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import { Bullseye, Label } from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  TableVariant,
  Td,
  Tr,
} from '@patternfly/react-table';

const getRowActions = (t: TFunction<string>): IAction[] => [
  // ToDo: add empty/delete bucket action
  {
    title: (
      <>
        {t('Empty bucket')}
        <p className="text-muted pf-v5-u-font-size-xs">
          {t('Erase the contents of your bucket')}
        </p>
      </>
    ),
    onClick: () => undefined,
  },
  {
    title: t('Delete bucket'),
    onClick: () => undefined,
  },
];

const getColumnNames = (t: TFunction<string>) => [
  '', // favoritable,
  t('Name'),
  t('Storage endpoint'),
  t('Create on'),
  t('Owner'),
  '', // action kebab
];

const getHeaderColumns = (t: TFunction<string>, favorites: string[]) => {
  const columnNames = getColumnNames(t);
  return [
    {
      columnName: columnNames[0],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name', favorites),
    },
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
    {
      columnName: columnNames[2],
      thProps: {
        className: 'pf-v5-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[3],
      sortFunction: (a, b, c) =>
        sortRows(a, b, c, 'metadata.creationTimestamp'),
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
    },
  ];
};

const NoBucketMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyPage
      ButtonComponent={() => null}
      title={t('Create and manage your buckets')}
      isLoaded
      canAccess
    >
      {t(
        'Navigate through your buckets effortlessly. View the contents of your S3-managed and Openshift-managed buckets, making it easy to locate and inspect objects.'
      )}
    </EmptyPage>
  );
};

const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return <Bullseye className="pf-v5-u-mt-xl">{t('No buckets found')}</Bullseye>;
};

const BucketsTableRow: React.FC<RowComponentType<BucketCrFormat>> = ({
  row: bucket,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const {
    apiResponse: { owner },
    metadata: { name, creationTimestamp },
  } = bucket;
  const { favorites, setFavorites }: RowExtraPropsType = extraProps;

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
          isFavorited: favorites.includes(name),
          onFavorite: (_event, isFavoriting) =>
            onSetFavorite(name, isFavoriting),
          rowIndex,
        }}
      />
      <Td dataLabel={columnNames[1]}>
        <Link to={`${BUCKETS_BASE_ROUTE}/${name}`}>{name}</Link>
      </Td>
      <Td dataLabel={columnNames[2]}>
        {/* ToDo: Currently we only support MCG, make is configurable once RGW is supported as well */}
        <Label color="gold">{t('MCG')}</Label>
      </Td>
      <Td dataLabel={columnNames[3]}>
        {<Timestamp timestamp={creationTimestamp} ignoreRelativeTime />}
      </Td>
      <Td dataLabel={columnNames[4]}>
        <UserIcon /> <span data-test="owner">{owner}</span>
      </Td>
      <Td dataLabel={columnNames[5]} isActionCell>
        <ActionsColumn items={getRowActions(t)} />
      </Td>
    </Tr>
  );
};

export const BucketsListTable: React.FC<BucketsListTableProps> = ({
  allBuckets,
  filteredBuckets,
  loaded,
  error,
}) => {
  const { t } = useCustomTranslation();
  const [favorites, setFavorites] = useUserSettingsLocalStorage<string[]>(
    BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  return (
    <ComposableTable
      rows={filteredBuckets}
      columns={getHeaderColumns(t, favorites)}
      RowComponent={BucketsTableRow}
      noDataMsg={NoBucketMessage}
      emptyRowMessage={EmptyRowMessage}
      unfilteredData={allBuckets as []}
      loaded={loaded}
      loadError={error}
      isFavorites={true}
      variant={TableVariant.compact}
      extraProps={{ favorites, setFavorites }}
    />
  );
};

type BucketsListTableProps = {
  allBuckets: BucketCrFormat[];
  filteredBuckets: BucketCrFormat[];
  loaded: boolean;
  error: any;
};

type RowExtraPropsType = {
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
};

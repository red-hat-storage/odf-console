import * as React from 'react';
import {
  BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
  getBucketOverviewBaseRoute,
} from '@odf/core/constants';
import { EmptyBucketResponse } from '@odf/core/modals/s3-browser/delete-and-empty-bucket/EmptyBucketModal';
import {
  LazyDeleteBucketModal,
  LazyEmptyBucketModal,
} from '@odf/core/modals/s3-browser/delete-and-empty-bucket/lazy-delete-and-empty-bucket';
import { BucketCrFormat, S3ProviderType } from '@odf/core/types';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { EmptyPage } from '@odf/shared/empty-state-page';
import { useUserSettingsLocalStorage } from '@odf/shared/hooks/useUserSettingsLocalStorage';
import { S3Commands } from '@odf/shared/s3';
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
import { Bullseye, Label } from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  TableVariant,
  Td,
  Tr,
} from '@patternfly/react-table';
import { getProviderLabel } from '../../../utils';
import { S3Context } from '../s3-context';

const getRowActions = (
  t: TFunction<string>,
  launcher: LaunchModal,
  bucketName: string,
  s3Client: S3Commands,
  refreshTokens: () => void,
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >
): IAction[] => [
  {
    title: (
      <>
        {t('Empty bucket')}
        <p className="text-muted pf-v6-u-font-size-xs">
          {t('Erase the contents of your bucket')}
        </p>
      </>
    ),
    onClick: () =>
      launcher(LazyEmptyBucketModal, {
        isOpen: true,
        extraProps: {
          bucketName,
          s3Client,
          refreshTokens,
          setEmptyBucketResponse,
        },
      }),
  },
  {
    title: t('Delete bucket'),
    onClick: () =>
      launcher(LazyDeleteBucketModal, {
        isOpen: true,
        extraProps: {
          bucketName,
          s3Client,
          launcher,
          refreshTokens,
          setEmptyBucketResponse,
        },
      }),
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
        className: 'pf-v6-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[3],
      sortFunction: (a, b, c) =>
        sortRows(a, b, c, 'metadata.creationTimestamp'),
      thProps: {
        className: 'pf-v6-u-w-16-on-lg',
      },
    },
    {
      columnName: columnNames[4],
      thProps: {
        className: 'pf-v6-u-w-16-on-lg',
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
  return <Bullseye className="pf-v6-u-mt-xl">{t('No buckets found')}</Bullseye>;
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
  const {
    favorites,
    setFavorites,
    triggerRefresh,
    setEmptyBucketResponse,
    launcher,
  }: RowExtraPropsType = extraProps;

  const { s3Client } = React.useContext(S3Context);

  const onSetFavorite = (key, active) => {
    setFavorites((oldFavorites) => [
      ...oldFavorites.filter((oldFavorite) => oldFavorite !== key),
      ...(active ? [key] : []),
    ]);
  };

  const providerType = s3Client.providerType as S3ProviderType;

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
        <Link to={`${getBucketOverviewBaseRoute(name, providerType)}/objects`}>
          {name}
        </Link>
      </Td>
      <Td dataLabel={columnNames[2]}>
        <Label color="yellow">{getProviderLabel(providerType)}</Label>
      </Td>
      <Td dataLabel={columnNames[3]}>
        {<Timestamp timestamp={creationTimestamp} ignoreRelativeTime />}
      </Td>
      <Td dataLabel={columnNames[4]}>
        <UserIcon /> <span data-test="owner">{owner}</span>
      </Td>
      <Td dataLabel={columnNames[5]} isActionCell>
        <ActionsColumn
          items={getRowActions(
            t,
            launcher,
            name,
            s3Client,
            triggerRefresh,
            setEmptyBucketResponse
          )}
        />
      </Td>
    </Tr>
  );
};

export const BucketsListTable: React.FC<BucketsListTableProps> = ({
  allBuckets,
  filteredBuckets,
  loaded,
  error,
  setEmptyBucketResponse,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [favorites, setFavorites] = useUserSettingsLocalStorage<string[]>(
    BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  const launcher = useModal();

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
      extraProps={{
        favorites,
        setFavorites,
        triggerRefresh,
        setEmptyBucketResponse,
        launcher,
      }}
    />
  );
};

type BucketsListTableProps = {
  allBuckets: BucketCrFormat[];
  filteredBuckets: BucketCrFormat[];
  loaded: boolean;
  error: any;
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >;
  triggerRefresh: () => void;
};

type RowExtraPropsType = {
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  triggerRefresh: () => void;
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >;
  launcher: LaunchModal;
};

import * as React from 'react';
import {
  getVectorBucketOverviewBaseRoute,
  VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
} from '@odf/core/constants/s3-vectors';
import { LazyDeleteVectorBucketModal } from '@odf/core/modals/s3-vectors/delete-vector-bucket/lazy-delete-vector-bucket';
import { S3ProviderType } from '@odf/core/types/s3-browser';
import {
  ComposableTable,
  EmptyPage,
  RowComponentType,
  useCustomTranslation,
  useUserSettingsLocalStorage,
} from '@odf/shared';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { sortRows } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import { Bullseye, Label } from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  TableVariant,
  Td,
  Tr,
} from '@patternfly/react-table';
import { S3VectorsContext } from '../s3-vectors-context';

const getRowActions = (
  t: TFunction,
  launcher: LaunchModal,
  vectorBucketName: string,
  s3VectorsClient: S3VectorsCommands,
  refreshTokens: () => void
): IAction[] => [
  {
    title: t('Delete bucket'),
    onClick: () =>
      launcher(LazyDeleteVectorBucketModal, {
        isOpen: true,
        extraProps: {
          vectorBucketName,
          s3VectorsClient,
          launcher,
          refreshTokens,
        },
      }),
  },
];
const getColumnNames = (t: TFunction<string>) => [
  '', // favorites,
  t('Name'),
  t('Bucket type'),
  t('Created on'),
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
    },
    {
      columnName: columnNames[4],
    },
  ];
};

const NoVectorBucketMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyPage
      ButtonComponent={() => null}
      title={t('No vector buckets found')}
      isLoaded
      canAccess
    >
      {t('Create a vector bucket to store and manage your vector indexes.')}
    </EmptyPage>
  );
};

const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="pf-v6-u-mt-xl">
      {t('No vector buckets found')}
    </Bullseye>
  );
};

const VectorBucketsTableRow: React.FC<RowComponentType<K8sResourceCommon>> = ({
  row: vectorBucket,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const {
    metadata: { name, creationTimestamp },
  } = vectorBucket;
  const {
    favorites,
    setFavorites,
    triggerRefresh,
    launcher,
  }: RowExtraPropsType = extraProps;

  const { s3VectorsClient } = React.useContext(S3VectorsContext);

  const onSetFavorite = (key, active) => {
    setFavorites((oldFavorites) => [
      ...oldFavorites.filter((oldFavorite) => oldFavorite !== key),
      ...(active ? [key] : []),
    ]);
  };
  const providerType = s3VectorsClient.providerType as S3ProviderType;

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
        <Link to={getVectorBucketOverviewBaseRoute(name, providerType)}>
          {name}
        </Link>
      </Td>
      <Td dataLabel={columnNames[2]}>
        <Label color="green">{t('S3 Vector')}</Label>
      </Td>
      <Td dataLabel={columnNames[3]}>
        {<Timestamp timestamp={creationTimestamp} ignoreRelativeTime />}
      </Td>
      <Td dataLabel={columnNames[4]} isActionCell>
        <ActionsColumn
          items={getRowActions(
            t,
            launcher,
            name,
            s3VectorsClient,
            triggerRefresh
          )}
        />
      </Td>
    </Tr>
  );
};

export const VectorBucketsListTable: React.FC<VectorBucketsListTableProps> = ({
  allVectorBuckets,
  filteredVectorBuckets,
  loaded,
  error,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [favorites, setFavorites] = useUserSettingsLocalStorage<string[]>(
    VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  const launcher = useModal();
  return (
    <ComposableTable
      rows={filteredVectorBuckets}
      columns={getHeaderColumns(t, favorites)}
      RowComponent={VectorBucketsTableRow}
      noDataMsg={NoVectorBucketMessage}
      emptyRowMessage={EmptyRowMessage}
      unfilteredData={allVectorBuckets as []}
      loaded={loaded}
      loadError={error}
      isFavorites={true}
      variant={TableVariant.compact}
      extraProps={{
        favorites,
        setFavorites,
        triggerRefresh,
        launcher,
      }}
    />
  );
};

type VectorBucketsListTableProps = {
  allVectorBuckets: K8sResourceCommon[];
  filteredVectorBuckets: K8sResourceCommon[];
  loaded: boolean;
  error: Error | null;
  triggerRefresh: () => void;
};

type RowExtraPropsType = {
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  triggerRefresh: () => void;
  launcher: LaunchModal;
};

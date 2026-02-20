import * as React from 'react';
import {
  getVectorBucketOverviewBaseRoute,
  VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
} from '@odf/core/constants/s3-vectors';
import { LazyDeleteVectorBucketModal } from '@odf/core/modals/s3-vectors/delete-vector-bucket/lazy-delete-vector-bucket';
import { S3ProviderType } from '@odf/core/types/s3-browser';
import { VectorBucketCrFormat } from '@odf/core/types/s3-vectors';
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
import { S3VectorsContext } from '../s3-vectors-context';

const getRowActions = (
  t: TFunction,
  launcher: LaunchModal,
  vectorBucketName: string,
  vectorBucketArn: string,
  s3VectorsClient: S3VectorsCommands,
  refreshTokens: () => void
): IAction[] => [
  {
    title: t('Delete user'),
    onClick: () =>
      launcher(LazyDeleteVectorBucketModal, {
        isOpen: true,
        extraProps: {
          vectorBucketName,
          vectorBucketArn,
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
  t('Create on'),
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

const NoVectorBucketMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyPage
      ButtonComponent={() => null}
      title={t('Create and manage your vector buckets')}
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
  return (
    <Bullseye className="pf-v5-u-mt-xl">
      {t('No vector buckets found')}
    </Bullseye>
  );
};

const VectorBucketsTableRow: React.FC<
  RowComponentType<VectorBucketCrFormat>
> = ({ row: vectorBucket, rowIndex, extraProps }) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const {
    metadata: { name, creationTimestamp },
    apiResponse: { arn },
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
  const providerType = S3ProviderType.Noobaa;

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
        {<Timestamp timestamp={creationTimestamp} ignoreRelativeTime />}
      </Td>
      <Td dataLabel={columnNames[3]} isActionCell>
        <ActionsColumn
          items={getRowActions(
            t,
            launcher,
            name,
            arn,
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
  allVectorBuckets: VectorBucketCrFormat[];
  filteredVectorBuckets: VectorBucketCrFormat[];
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

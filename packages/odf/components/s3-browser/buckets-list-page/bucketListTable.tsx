import * as React from 'react';
import {
  BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
  BUCKETS_BASE_ROUTE,
} from '@odf/core/constants';
import {
  LazyDeleteBucketModal,
  LazyEmptyBucketModal,
} from '@odf/core/modals/s3-browser/delete-buckets/LazyDeleteBucket';
import { BucketCrFormat } from '@odf/core/types';
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
import { NoobaaS3Context } from '../noobaa-context';

const getRowActions = (
  t: TFunction<string>,
  launcher: LaunchModal,
  bucketName: string,
  noobaaS3: S3Commands
): IAction[] => [
  {
    title: (
      <>
        {t('Empty bucket')}
        <p className="text-muted pf-v5-u-font-size-xs">
          {t('Erase the contents of your bucket')}
        </p>
      </>
    ),
    onClick: () =>
      launcher(LazyEmptyBucketModal, {
        isOpen: true,
        extraProps: { bucketName, noobaaS3 },
      }),
  },
  {
    title: t('Delete bucket'),
    onClick: () =>
      launcher(LazyDeleteBucketModal, {
        isOpen: true,
        extraProps: { bucketName, noobaaS3, launcher },
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
      ButtonComponent={() => <></>}
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
  const launcher = useModal();
  const columnNames = getColumnNames(t);
  const {
    apiResponse: { owner },
    metadata: { name, creationTimestamp },
  } = bucket;
  const { favorites, setFavorites }: RowExtraPropsType = extraProps;

  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const onSetFavorite = (key, active) => {
    setFavorites((oldFavorites) => [
      ...oldFavorites.filter((oldFavorite) => oldFavorite !== key),
      ...(active ? [key] : []),
    ]);
  };

  return (
    <Tr translate={null} key={rowIndex}>
      <Td
        translate={null}
        dataLabel={columnNames[0]}
        favorites={{
          isFavorited: favorites.includes(name),
          onFavorite: (_event, isFavoriting) =>
            onSetFavorite(name, isFavoriting),
          rowIndex,
        }}
      />
      <Td translate={null} dataLabel={columnNames[1]}>
        <Link to={`${BUCKETS_BASE_ROUTE}/${name}`}>{name}</Link>
      </Td>
      <Td translate={null} dataLabel={columnNames[2]}>
        {/* ToDo: Currently we only support MCG, make is configurable once RGW is supported as well */}
        <Label color="gold">{t('MCG')}</Label>
      </Td>
      <Td translate={null} dataLabel={columnNames[3]}>
        {<Timestamp timestamp={creationTimestamp} ignoreRelativeTime />}
      </Td>
      <Td translate={null} dataLabel={columnNames[4]}>
        <UserIcon /> <span data-test="owner">{owner}</span>
      </Td>
      <Td translate={null} dataLabel={columnNames[5]} isActionCell>
        <ActionsColumn
          items={getRowActions(t, launcher, name, noobaaS3)}
          translate={null}
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

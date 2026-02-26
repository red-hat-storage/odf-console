import * as React from 'react';
import {
  DiskSize as QuotaSize,
  diskSizeUnitOptions as QuotaSizeUnitOptions,
} from '@odf/core/constants';
import {
  ClusterVersionKind,
  ClusterVersionModel,
  getName,
  Kebab,
  StorageConsumerModel,
} from '@odf/shared';
import { ODF_OPERATOR } from '@odf/shared/constants/common';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { useFetchCsv, useK8sGet } from '@odf/shared/hooks';
import { ModalKeys } from '@odf/shared/modals';
import { StorageConsumerKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOprVersionFromCSV, humanizeBinaryBytes } from '@odf/shared/utils';
import { referenceForModel } from '@odf/shared/utils/common';
import {
  K8sResourceKind,
  ListPageBody,
  ListPageFilter,
  ListPageHeader,
  RedExclamationCircleIcon,
  RowProps,
  TableColumn,
  TableData,
  Timestamp,
  VirtualizedTable,
  YellowExclamationTriangleIcon,
  useActiveColumns,
  useK8sWatchResource,
  useListPageFilter,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Button, Popover, PopoverPosition } from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import { useODFNamespaceSelector } from '../../redux';
import {
  getClientClusterId,
  isLocalClientCluster,
  isClientClusterOnboarded,
} from '../../utils';
import {
  clientHeartBeatFilter,
  getMajorMinorVersion,
  versionMismatchFilter,
} from './list-filter';
import { StorageQuotaUtilizationProgress } from './QuotaUtilizationProgress';
import { RotateKeysModal } from './rotate-keys-modal';
import './client-list.scss';

export const getClusterName = (client: StorageConsumerKind) => {
  const clusterName = client.status?.client?.clusterName;
  const clientClusterId = getClientClusterId(client);
  let name = '';
  if (!clusterName && !clientClusterId) {
    name = '-';
  } else {
    name = `${clusterName || '-'} (${clientClusterId || '-'})`;
  }
  return name;
};

const StorageQuotaPopoverContent: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Trans t={t} ns="plugin__odf-console">
      <p className="pf-v6-u-mb-md">
        The amount of storage allocated to the client cluster for usage.
      </p>
      <p>
        Due to simultaneous usage by multiple client clusters, actual available
        storage may vary affecting your allocated storage quota.
      </p>
    </Trans>
  );
};

const tableColumns = [
  {
    className: '',
    id: 'name',
  },
  {
    className: 'pf-m-width-20',
    id: 'clusterName',
  },
  {
    className: '',
    id: 'storageQuota',
  },
  {
    className: '',
    id: 'storageQuotaUtilRatio',
  },
  {
    className: '',
    id: 'openshiftVersion',
  },
  {
    className: '',
    id: 'dataFoundationVersion',
  },
  {
    className: '',
    id: 'lastHeartBeat',
  },
  {
    className: Kebab.columnClass,
    id: 'kebab',
  },
];

type ClientListProps = {
  data: K8sResourceKind[];
  unfilteredData: K8sResourceKind[];
  loaded: boolean;
  loadError: any;
  rowData?: any;
};

const ClientsList: React.FC<ClientListProps> = (props) => {
  const { t } = useCustomTranslation();
  const clientListTableColumns = React.useMemo<
    TableColumn<StorageConsumerKind>[]
  >(
    () =>
      tableColumns.map((tableColumn) => {
        const column: TableColumn<StorageConsumerKind> = {
          id: tableColumn.id,
          props: { className: tableColumn.className },
          title: '',
          sort: '',
          transforms: null,
        };
        switch (column.id) {
          case 'name':
            column.title = t('Name');
            column.sort = 'metadata.name';
            column.transforms = [sortable];
            break;
          case 'clusterName':
            column.title = t('Cluster name (ID)');
            column.sort = 'status.client.clusterName';
            break;
          case 'storageQuota':
            column.title = t('Storage quota');
            column.sort = 'status.storageQuotaInGiB';
            column.props.info = { popover: <StorageQuotaPopoverContent /> };
            break;
          case 'storageQuotaUtilRatio':
            column.title = t('Storage quota utilization ratio');
            column.sort = 'status.client.storageQuotaUtilization';
            column.transforms = [sortable];
            break;
          case 'openshiftVersion':
            column.title = t('Openshift version');
            column.sort = 'status.client.platformVersion';
            column.transforms = [sortable];
            break;
          case 'dataFoundationVersion':
            column.title = t('Data Foundation version');
            column.sort = 'status.client.operatorVersion';
            column.transforms = [sortable];
            break;
          case 'lastHeartBeat':
            column.title = t('Last heartbeat');
            column.sort = 'status.lastHeartbeat';
            column.transforms = [sortable];
            break;
          case 'kebab':
            break;
          default:
            throw new Error(`Column not found: ${column.id}`);
        }
        return column;
      }),
    [t]
  );

  const [columns] = useActiveColumns({
    columns: clientListTableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('StorageConsumers')}
      columns={columns}
      Row={StorageClientRow}
    />
  );
};

const getOpenshiftVersion = (obj: StorageConsumerKind) =>
  obj?.status?.client?.platformVersion;

const getStorageQuotaUtilizationRatio = (obj: StorageConsumerKind) =>
  `${obj?.status?.client?.storageQuotaUtilizationRatio}`;

const getDataFoundationVersion = (obj: StorageConsumerKind) =>
  obj?.status?.client?.operatorVersion;

type LastHeartBeatProps = {
  heartbeat: string;
};
export const LastHeartBeat: React.FC<LastHeartBeatProps> = ({ heartbeat }) => {
  const { t } = useCustomTranslation();
  const difference = getTimeDifferenceInSeconds(heartbeat);
  const Component = (() => {
    if (difference > 120 && difference <= 300) {
      return YellowExclamationTriangleIcon;
    }
    if (difference > 300) {
      return RedExclamationCircleIcon;
    }
    return null;
  })();
  return _.isEmpty(heartbeat) ? (
    <>-</>
  ) : (
    <span>
      {Component && <Component />}
      &nbsp;
      <Timestamp timestamp={heartbeat} omitSuffix simple />
      &nbsp;
      {t('ago')}
    </span>
  );
};

type DataFoundationVersionProps = {
  obj: StorageConsumerKind;
  currentVersion: string;
};

const DataFoundationVersion: React.FC<DataFoundationVersionProps> = ({
  obj,
  currentVersion,
}) => {
  const { t } = useCustomTranslation();
  const clientVersion = getDataFoundationVersion(obj);
  const isVersionMismatch =
    getMajorMinorVersion(clientVersion) !==
    getMajorMinorVersion(currentVersion);
  if (_.isEmpty(clientVersion)) {
    return <>-</>;
  }
  return isVersionMismatch ? (
    <Popover
      position={PopoverPosition.top}
      headerContent={t('Client version is out of date')}
      bodyContent={t(
        'Due to the mismatch in the client and provider version this provider cluster cannot be upgraded.'
      )}
      enableFlip
      maxWidth={'21rem'}
    >
      <span>
        <YellowExclamationTriangleIcon />
        <Button
          variant="link"
          isInline
          className="co-status-card__popup"
          data-test="health-popover-link"
        >
          {clientVersion}
        </Button>
      </span>
    </Popover>
  ) : (
    <>{clientVersion}</>
  );
};

const StorageClientRow: React.FC<
  RowProps<
    StorageConsumerKind,
    {
      currentVersion: string;
      localClusterId: string;
    }
  >
> = ({ obj, activeColumnIDs, rowData: { currentVersion, localClusterId } }) => {
  const { t } = useCustomTranslation();
  const humanizedStorageQuota = obj?.spec?.storageQuotaInGiB
    ? humanizeBinaryBytes(
        obj?.spec?.storageQuotaInGiB,
        QuotaSizeUnitOptions[QuotaSize.Gi]
      ).string
    : t('Unlimited');
  const isLocalClient = isLocalClientCluster(obj, localClusterId);
  const isClientOnboarded = isClientClusterOnboarded(obj);
  const hasDeletionTimestamp = !!obj?.metadata?.deletionTimestamp;
  return (
    <>
      {tableColumns.map((tableColumn) => {
        let data: string | JSX.Element;
        switch (tableColumn.id) {
          case 'name':
            data = getName(obj);
            break;
          case 'clusterName':
            data = getClusterName(obj);
            break;
          case 'storageQuota':
            data = humanizedStorageQuota;
            break;
          case 'storageQuotaUtilRatio':
            data = (
              <StorageQuotaUtilizationProgress
                quotaUtilizationRatio={Number(
                  getStorageQuotaUtilizationRatio(obj)
                )}
                storageQuota={obj?.spec?.storageQuotaInGiB}
              />
            );
            break;
          case 'openshiftVersion':
            data = getOpenshiftVersion(obj) || '-';
            break;
          case 'dataFoundationVersion':
            data = (
              <DataFoundationVersion
                obj={obj}
                currentVersion={currentVersion}
              />
            );
            break;
          case 'lastHeartBeat':
            data = <LastHeartBeat heartbeat={obj?.status?.lastHeartbeat} />;
            break;
          case 'kebab':
            data = (
              <Kebab
                extraProps={{
                  resource: obj,
                  resourceModel: StorageConsumerModel,
                  forceDeletion: true,
                }}
                customKebabItems={[
                  {
                    key: ModalKeys.EDIT_RES,
                    value: t('Edit storage quota'),
                    component: React.lazy(
                      () => import('./update-storage-quota-modal')
                    ),
                    isDisabled: isLocalClient || hasDeletionTimestamp,
                  },
                  {
                    key: 'GENERATE_ONBOARDING_TOKEN',
                    value: t('Generate client onboarding token'),
                    isDisabled:
                      isLocalClient ||
                      isClientOnboarded ||
                      hasDeletionTimestamp,
                    component: React.lazy(() =>
                      import('./onboarding-modal').then((m) => ({
                        default: m.ClientOnBoardingModal,
                      }))
                    ),
                  },
                  {
                    key: 'DISTRIBUTE_RESOURCES',
                    value: t('Distribute resources'),
                    isDisabled: isLocalClient || hasDeletionTimestamp,
                    component: React.lazy(
                      () =>
                        import(
                          '../../modals/ResourceDistributionModal/ResourceDistributionModal'
                        )
                    ),
                  },
                  {
                    key: ModalKeys.DELETE,
                    value: t('Delete StorageConsumer'),
                    isDisabled: isLocalClient,
                    component: React.lazy(
                      () => import('./remove-client-modal')
                    ),
                  },
                ]}
                hideItems={[ModalKeys.EDIT_LABELS, ModalKeys.EDIT_ANN]}
              />
            );
            break;
          default:
            throw new Error(`Data not found for column: ${tableColumn.id}`);
        }
        return (
          <TableData {...tableColumn} activeColumnIDs={activeColumnIDs}>
            {data}
          </TableData>
        );
      })}
    </>
  );
};

type ClientListPageProps = {
  showTitle?: boolean;
  namespace?: string;
  selector?: any;
  hideLabelFilter?: boolean;
  hideNameLabelFilters?: boolean;
  hideColumnManagement?: boolean;
};

export const ClientListPage: React.FC<ClientListPageProps> = () => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();
  const [storageClients, loaded, loadError] = useK8sWatchResource<
    StorageConsumerKind[]
  >({
    kind: referenceForModel(StorageConsumerModel),
    isList: true,
  });

  const [cv, cvLoaded, cvLoadError] = useK8sGet<ClusterVersionKind>(
    ClusterVersionModel,
    'version'
  );
  const localClusterId = cv?.spec?.clusterID;

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });
  const serviceVersion = getOprVersionFromCSV(csv);

  const rowFilters = React.useMemo(() => {
    const customFilters = [
      clientHeartBeatFilter(t),
      versionMismatchFilter(t, serviceVersion),
    ];
    return customFilters;
  }, [t, serviceVersion]);

  const [data, filteredData, onFilterChange] = useListPageFilter(
    storageClients,
    rowFilters
  );

  const launchModalOnClick = (modalComponent: ModalComponent) => () => {
    launchModal(modalComponent, { isOpen: true });
  };

  const navigate = useNavigate();

  return (
    <>
      <ListPageHeader title={t('Storage Consumers')}>
        <Button
          variant="primary"
          className="pf-v6-u-mr-sm"
          onClick={() => navigate('/odf/storage-consumers/create')}
        >
          {t('Create Storage Consumer')}
        </Button>
        <Button
          variant="tertiary"
          onClick={launchModalOnClick(RotateKeysModal)}
        >
          {t('Rotate signing keys')}
        </Button>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded && csvLoaded && cvLoaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
          rowFilters={rowFilters}
        />
        <ClientsList
          data={filteredData}
          unfilteredData={storageClients}
          loaded={loaded && csvLoaded}
          loadError={loadError || csvLoadError || cvLoadError}
          rowData={{ currentVersion: serviceVersion, localClusterId }}
        />
      </ListPageBody>
    </>
  );
};

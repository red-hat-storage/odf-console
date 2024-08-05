import * as React from 'react';
import {
  DiskSize as QuotaSize,
  diskSizeUnitOptions as QuotaSizeUnitOptions,
} from '@odf/core/constants';
import { GrayInfoCircleIcon, Kebab } from '@odf/shared';
import { ODF_OPERATOR } from '@odf/shared/constants/common';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { useFetchCsv } from '@odf/shared/hooks';
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
import {
  Button,
  Flex,
  FlexItem,
  Popover,
  PopoverPosition,
} from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import { StorageConsumerModel } from '../../models';
import { useODFNamespaceSelector } from '../../redux';
import {
  clientHeartBeatFilter,
  getMajorMinorVersion,
  versionMismatchFilter,
} from './list-filter';
import { ClientOnBoardingModal } from './onboarding-modal';
import { RotateKeysModal } from './rotate-keys-modal';
import './client-list.scss';

const StorageQuotaPopoverContent: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Trans t={t} ns="plugin__odf-console">
      <p className="pf-v5-u-mb-md">
        The amount of storage allocated to the client cluster for usage.
      </p>
      <p>
        Due to simultaneous usage by multiple client clusters, actual available
        storage may vary affecting your allocated storage quota.
      </p>
    </Trans>
  );
};

const NoClientsMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <>
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsLg' }}
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        className="pf-v5-u-font-size-lg odf-storage-client-list__no-client-msg"
      >
        <FlexItem>
          <GrayInfoCircleIcon className="odf-storage-client-list__no-client-msg-icon" />
        </FlexItem>
        <FlexItem className="pf-v5-u-font-weight-bold">
          {t('No storage clients found.')}
        </FlexItem>
        <FlexItem className="odf-storage-client-list__no-client-msg-text">
          {t(
            'You do not have any storage clients connected to this Data Foundation provider cluster.'
          )}
        </FlexItem>
        <FlexItem className="odf-storage-client-list__no-client-msg-text">
          <Trans t={t} ns="plugin__odf-console">
            To connect a storage client to the Data Foundation provider cluster,
            click{' '}
            <span className="pf-v5-u-font-weight-bold">
              Generate client onboarding token
            </span>{' '}
            and use the token to deploy the client cluster.
          </Trans>
        </FlexItem>
      </Flex>
    </>
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
            column.sort = 'status.client.name';
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
      aria-label={t('Storage Clients')}
      columns={columns}
      Row={StorageClientRow}
      NoDataEmptyMsg={NoClientsMessage}
    />
  );
};

const getOpenshiftVersion = (obj: StorageConsumerKind) =>
  obj?.status?.client?.platformVersion;

const getDataFoundationVersion = (obj: StorageConsumerKind) =>
  obj?.status?.client?.operatorVersion;

type LastHeartBeatProps = {
  heartbeat: string;
};
const LastHeartBeat: React.FC<LastHeartBeatProps> = ({ heartbeat }) => {
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
    }
  >
> = ({ obj, activeColumnIDs, rowData: { currentVersion } }) => {
  const { t } = useCustomTranslation();
  const [allowDeletion, setAllowDeletion] = React.useState(false);
  const DELETE_THRESHOLD = 300; // wait till 5 minutes before activating the delete button
  const humanizedStorageQuota = obj?.spec?.storageQuotaInGiB
    ? humanizeBinaryBytes(
        obj?.spec?.storageQuotaInGiB,
        QuotaSizeUnitOptions[QuotaSize.Gi]
      ).string
    : t('Unlimited');

  React.useEffect(() => {
    const setter = () => {
      const timeDifference = getTimeDifferenceInSeconds(
        obj?.status?.lastHeartbeat
      );
      if (timeDifference > DELETE_THRESHOLD && !allowDeletion) {
        setAllowDeletion(true);
      } else if (timeDifference < DELETE_THRESHOLD && allowDeletion) {
        setAllowDeletion(false);
      }
    };
    setter();
    const id = setInterval(setter, 10000);
    return () => clearInterval(id);
  }, [allowDeletion, setAllowDeletion, obj?.status?.lastHeartbeat]);
  return (
    <>
      {tableColumns.map((tableColumn) => {
        let data: string | JSX.Element;
        switch (tableColumn.id) {
          case 'name':
            data = obj?.status?.client?.name || '-';
            break;
          case 'clusterName':
            data = `${obj?.status?.client?.clusterName || '-'} (${
              obj?.status?.client?.clusterId || '-'
            })`;
            break;
          case 'storageQuota':
            data = humanizedStorageQuota;
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
                }}
                customKebabItems={[
                  {
                    key: ModalKeys.EDIT_RES,
                    value: t('Edit storage quota'),
                    component: React.lazy(
                      () => import('./update-storage-quota-modal')
                    ),
                  },
                  {
                    key: ModalKeys.DELETE,
                    value: t('Delete storage client'),
                    isDisabled: !allowDeletion,
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

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });
  const serviceVersion = getOprVersionFromCSV(csv);

  const rowFilters = React.useMemo(
    () => [clientHeartBeatFilter(t), versionMismatchFilter(t, serviceVersion)],
    [t, serviceVersion]
  );

  const [data, filteredData, onFilterChange] = useListPageFilter(
    storageClients,
    rowFilters
  );

  const launchModalOnClick = (modalComponent: ModalComponent) => () => {
    launchModal(modalComponent, { isOpen: true });
  };

  return (
    <>
      <ListPageHeader title={t('Storage clients')}>
        <Button
          variant="primary"
          className="pf-v5-u-mr-sm"
          onClick={launchModalOnClick(ClientOnBoardingModal)}
        >
          {t('Generate client onboarding token')}
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
          loaded={loaded && csvLoaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
          rowFilters={rowFilters}
        />
        <ClientsList
          data={filteredData}
          unfilteredData={storageClients}
          loaded={loaded && csvLoaded}
          loadError={loadError || csvLoadError}
          rowData={{ currentVersion: serviceVersion }}
        />
      </ListPageBody>
    </>
  );
};

import * as React from 'react';
import { ODF_OPERATOR } from '@odf/shared/constants/common';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { useFetchCsv } from '@odf/shared/hooks';
import { getName } from '@odf/shared/selectors/k8s';
import { StorageConsumerKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
import { Button, Popover, PopoverPosition } from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import { StorageConsumerModel } from '../../models';
import { useODFNamespaceSelector } from '../../redux';
import {
  clientHeartBeatFilter,
  getMajorMinorVersion,
  versionMismatchFilter,
} from './list-filter';
import { ClientOnBoardingModal } from './onboarding-modal';

const tableColumns = [
  {
    className: '',
    id: 'name',
  },
  {
    className: '',
    id: 'clusterID',
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
    () => [
      {
        title: t('Name'),
        sort: 'metadata.name',
        transforms: [sortable],
        props: {
          className: tableColumns[0].className,
        },
        id: tableColumns[0].id,
      },
      {
        title: t('Cluster ID'),
        props: {
          className: tableColumns[1].className,
        },
        id: tableColumns[1].id,
      },
      {
        title: t('Openshift version'),
        sort: 'status.client.platformVersion',
        transforms: [sortable],
        props: {
          className: tableColumns[2].className,
        },
        id: tableColumns[2].id,
      },
      {
        title: t('Data Foundation version'),
        sort: 'status.client.operatorVersion',
        transforms: [sortable],
        props: {
          className: tableColumns[3].className,
        },
        id: tableColumns[3].id,
      },
      {
        title: t('Last heartbeat'),
        sort: 'status.lastHeartbeat',
        transforms: [sortable],
        props: {
          className: tableColumns[4].className,
        },
        id: tableColumns[4].id,
      },
    ],
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
    />
  );
};

const getOpenshiftVersion = (obj: StorageConsumerKind) =>
  obj.status.client.platformVersion;

const getDataFoundationVersion = (obj: StorageConsumerKind) =>
  obj.status.client.operatorVersion;

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
  return (
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

const DataFoudationVersion: React.FC<DataFoundationVersionProps> = ({
  obj,
  currentVersion,
}) => {
  const { t } = useCustomTranslation();
  const clientVersion = getDataFoundationVersion(obj);
  const isVersionMismatch =
    getMajorMinorVersion(clientVersion) !==
    getMajorMinorVersion(currentVersion);
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
  RowProps<StorageConsumerKind, { currentVersion: string }>
> = ({ obj, activeColumnIDs, rowData: { currentVersion } }) => {
  return (
    <>
      <TableData {...tableColumns[0]} activeColumnIDs={activeColumnIDs}>
        {getName(obj)}
      </TableData>
      <TableData {...tableColumns[1]} activeColumnIDs={activeColumnIDs}>
        {getName(obj).split('storageconsumer-')[1]}
      </TableData>
      <TableData {...tableColumns[2]} activeColumnIDs={activeColumnIDs}>
        {getOpenshiftVersion(obj)}
      </TableData>
      <TableData {...tableColumns[3]} activeColumnIDs={activeColumnIDs}>
        <DataFoudationVersion obj={obj} currentVersion={currentVersion} />
      </TableData>
      <TableData {...tableColumns[4]} activeColumnIDs={activeColumnIDs}>
        <LastHeartBeat heartbeat={obj.status.lastHeartbeat} />
      </TableData>
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

const getOperatorVersion = (operator: K8sResourceKind): string =>
  operator?.spec?.version;

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
  const serviceVersion = getOperatorVersion(csv);

  const rowFilters = React.useMemo(
    () => [clientHeartBeatFilter(t), versionMismatchFilter(t, serviceVersion)],
    [t, serviceVersion]
  );

  const [data, filteredData, onFilterChange] = useListPageFilter(
    storageClients,
    rowFilters
  );

  const onClick = (modalLauncher: typeof launchModal) => () => {
    const modalComponentProps = { isOpen: true };
    modalLauncher(ClientOnBoardingModal, modalComponentProps);
  };

  return (
    <>
      <ListPageHeader title={t('Storage clients')}>
        <Button variant="primary" onClick={onClick(launchModal)}>
          {t('Generate client onboarding token')}
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

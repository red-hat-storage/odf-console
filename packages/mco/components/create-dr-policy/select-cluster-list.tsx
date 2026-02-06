import * as React from 'react';
import { getManagedClusterResourceObj } from '@odf/mco/hooks';
import { ACMManagedClusterViewModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@odf/shared/status/icons';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { RowComponentType } from '@odf/shared/table';
import {
  SelectableTable,
  TableVariant,
} from '@odf/shared/table/selectable-table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getPageRange, referenceForModel } from '@odf/shared/utils';
import {
  ListPageFilter,
  useK8sWatchResource,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import cn from 'classnames';
import {
  Grid,
  GridItem,
  Pagination,
  PaginationVariant,
  Text,
} from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import {
  MCO_CREATED_BY_LABEL_KEY,
  MCO_CREATED_BY_MC_CONTROLLER,
} from '../../constants';
import { ACMManagedClusterKind, ACMManagedClusterViewKind } from '../../types';
import {
  ClusterListColumns,
  COUNT_PER_PAGE_NUMBER,
  getColumnHelper,
  getColumns,
  getManagedClusterInfoTypes,
  INITIAL_PAGE_NUMBER,
  isRowSelectable,
} from './utils/cluster-list-utils';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from './utils/reducer';

const ClusterRow: React.FC<RowComponentType<ManagedClusterInfoType>> = ({
  row: cluster,
}) => {
  const { t } = useCustomTranslation();
  const { odfInfo, isManagedClusterAvailable } = cluster;
  const clientName = odfInfo?.storageClusterInfo?.clientInfo?.name;
  const odfVersion = odfInfo?.odfVersion;
  /*   const providers = cluster.providers || [];
  const count = providers.reduce((acc, provider) => acc + provider.count, 0);
  const storageProvisioners = !count ? (
        DASH
      ) : (
        <Popover
          headerContent={t('Storage provisioners')}
          bodyContent={
            <ul className="pf-v5-u-m-0 pf-v5-u-pl-xs">
              {providers.map((p) => (
                <li key={p.displayName}>
                  {p.displayName}
                  {p.count > 1 && ` (${p.count})`}
                </li>
              ))}
            </ul>
          }
          maxWidth="20rem"
        >
          <Button variant="link" isInline>
            {count > 1
              ? t('{{count}} provisioners', {
                  count: count,
                })
              : t('{{count}} provisioner', { count })}
          </Button>
        </Popover>
      ) */
  return (
    <>
      <Td
        dataLabel={
          getColumnHelper(ClusterListColumns.ManagedCluster, t).columnName
        }
      >
        <Text>{getName(cluster)}</Text>
      </Td>
      <Td
        dataLabel={
          getColumnHelper(ClusterListColumns.AvailabilityStatus, t).columnName
        }
      >
        {isManagedClusterAvailable ? (
          <StatusIconAndText
            icon={<GreenCheckCircleIcon />}
            title={t('Online')}
          />
        ) : (
          <StatusIconAndText
            icon={<RedExclamationCircleIcon />}
            title={t('Offline')}
          />
        )}
      </Td>
      <Td
        dataLabel={
          getColumnHelper(ClusterListColumns.DataFoundation, t).columnName
        }
      >
        <Text className={cn({ 'text-muted': !odfVersion })}>
          {odfVersion || t('Not Installed')}
        </Text>
      </Td>

      <Td
        dataLabel={
          getColumnHelper(ClusterListColumns.StorageClients, t).columnName
        }
      >
        <Text className={cn({ 'text-muted': !clientName })}>
          {!!clientName ? clientName : t('Unavailable')}
        </Text>
      </Td>
    </>
  );
};

const PaginatedClusterTable: React.FC<PaginatedClusterTableProps> = ({
  selectedClusters,
  clusters,
  isLoaded,
  error,
  onChange,
}) => {
  const { t } = useCustomTranslation();
  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(COUNT_PER_PAGE_NUMBER);
  const [data, filteredData, onFilterChange] = useListPageFilter(clusters);
  const paginatedData: ManagedClusterInfoType[] = React.useMemo(() => {
    const [start, end] = getPageRange(page, perPage);
    return filteredData.slice(start, end) || [];
  }, [filteredData, page, perPage]);

  const handleSelectionChange = React.useCallback(
    (newSelectedClusters: ManagedClusterInfoType[]) => {
      // Merge selections: keep existing selections not in current paginated view,
      // and add new selections from current view
      const paginatedDataIds = new Set(paginatedData.map((c) => getName(c)));
      const preservedSelections = selectedClusters.filter(
        (cluster) => !paginatedDataIds.has(getName(cluster))
      );
      onChange([...preservedSelections, ...newSelectedClusters]);
    },
    [onChange, selectedClusters, paginatedData]
  );

  const visibleSelectedClusters = React.useMemo(() => {
    const paginatedDataIds = new Set(paginatedData.map((c) => getName(c)));
    return selectedClusters.filter((cluster) =>
      paginatedDataIds.has(getName(cluster))
    );
  }, [selectedClusters, paginatedData]);

  return (
    <>
      <Grid>
        <GridItem md={8} sm={12} className="pf-v5-u-mt-md">
          <ListPageFilter
            data={data}
            loaded={isLoaded}
            onFilterChange={onFilterChange}
            hideColumnManagement={true}
          />
        </GridItem>
        <GridItem md={4} sm={12}>
          <Pagination
            className="pf-v5-u-mt-md"
            itemCount={filteredData.length || 0}
            widgetId="paginated-list-page"
            perPage={perPage}
            page={page}
            variant={PaginationVariant.bottom}
            dropDirection="up"
            isStatic
            isCompact
            onSetPage={(_event, newPage) => setPage(newPage)}
            onPerPageSelect={(_event, newPerPage, newPage) => {
              setPerPage(newPerPage);
              setPage(newPage);
            }}
          />
        </GridItem>
      </Grid>
      <SelectableTable<ManagedClusterInfoType>
        columns={getColumns(t)}
        rows={paginatedData}
        RowComponent={ClusterRow}
        selectedRows={visibleSelectedClusters}
        setSelectedRows={handleSelectionChange}
        loaded={isLoaded}
        loadError={error}
        variant={TableVariant.DEFAULT}
        isColumnSelectableHidden
        isRowSelectable={(cluster) =>
          isRowSelectable(cluster, selectedClusters)
        }
      />
    </>
  );
};

export const SelectClusterList: React.FC<SelectClusterListProps> = ({
  selectedClusters,
  requiredODFVersion,
  dispatch,
}) => {
  const [managedClusters, loaded, loadError] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const [mcvs, mcvsLoaded, mcvsLoadError] = useK8sWatchResource<
    ACMManagedClusterViewKind[]
  >({
    kind: referenceForModel(ACMManagedClusterViewModel),
    selector: {
      // https://github.com/red-hat-storage/odf-multicluster-orchestrator/blob/release-4.17/controllers/utils/managedclusterview.go#L43
      matchLabels: { [MCO_CREATED_BY_LABEL_KEY]: MCO_CREATED_BY_MC_CONTROLLER },
    },
    isList: true,
  });

  /*  const clusterNames = useDeepCompareMemoize(
    managedClusters.map((c) => getName(c)),
    true
  );

  const {
    providersByCluster,
    loaded: providersLoaded,
    error,
  } = useStorageProvisioners(clusterNames); */

  const allLoaded = loaded && mcvsLoaded; // && providersLoaded;
  const anyError = loadError || mcvsLoadError; // || error;

  const clusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (!!requiredODFVersion && allLoaded && !anyError)
      // TODO: Switch from using the MCV-based odf-info ConfigMap to using
      // the odf-client-info ConfigMap from the openshift-operators namespace
      return getManagedClusterInfoTypes(
        managedClusters,
        mcvs,
        requiredODFVersion
        //  providersByCluster
      );

    return [];
  }, [
    requiredODFVersion,
    managedClusters,
    mcvs,
    allLoaded,
    anyError,
    // providersByCluster,
  ]);

  const onChange = (selectedClusterList: ManagedClusterInfoType[]) => {
    dispatch({
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
      payload: selectedClusterList,
    });

    /*   if (selectedClusterList?.length >= 2) {
      const doClustersHaveODF = selectedClusterList?.every(
        (cluster) => cluster?.odfInfo?.isValidODFVersion
      );
      dispatch({
        type: DRPolicyActionType.SET_DO_CLUSTERS_HAVE_ODF,
        payload: doClustersHaveODF,
      });

      dispatch({
        type: DRPolicyActionType.SET_REPLICATION_BACKEND,
        payload: doClustersHaveODF
          ? BackendType.DataFoundation
          : BackendType.ThirdParty,
      });
    } */
    if (selectedClusterList.length < 2) {
      dispatch({
        type: DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION,
        payload: false,
      });

      /*   dispatch({
        type: DRPolicyActionType.SET_DO_CLUSTERS_HAVE_ODF,
        payload: false,
      }); */
    }
  };

  const clustersLoaded = allLoaded && !!requiredODFVersion;

  return (
    <PaginatedClusterTable
      selectedClusters={selectedClusters}
      clusters={clusters}
      isLoaded={clustersLoaded}
      error={loadError}
      onChange={onChange}
    />
  );
};

type SelectClusterListProps = {
  selectedClusters: ManagedClusterInfoType[];
  requiredODFVersion: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

type PaginatedClusterTableProps = {
  selectedClusters: ManagedClusterInfoType[];
  clusters: ManagedClusterInfoType[];
  isLoaded: boolean;
  error: any;
  onChange: (selectedClusterList: ManagedClusterInfoType[]) => void;
};

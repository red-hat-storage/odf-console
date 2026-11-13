import * as React from 'react';
import {
  getManagedClusterResourceObj,
  getODFClientInfoConfigMapResourceObj,
  getIBMStorageScaleInfoConfigMapResourceObj,
} from '@odf/mco/hooks';
import { useStorageProvisioners } from '@odf/mco/hooks/use-storage-provisioner';
import { ListPageFilterWrapper } from '@odf/shared';
import { DASH } from '@odf/shared/constants';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
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
import { ConfigMapKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getPageRange } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useListPageFilter,
  RowFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Grid,
  GridItem,
  Pagination,
  PaginationVariant,
  Content,
  Popover,
  Button,
} from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import {
  ACMManagedClusterKind,
  ManagedClusterInfoType,
} from '../../../../types';
import { getManagedClusterInfoTypes } from '../../../../utils/managed-cluster-info';
import {
  getStorageVendorLabel,
  StorageVendorId,
} from '../../../../utils/storage-vendor-registry';
import { DRPolicyAction, DRPolicyActionType } from '../../utils/reducer';
import {
  ClusterListColumns,
  COUNT_PER_PAGE_NUMBER,
  getClusterVendorIds,
  getColumnHelper,
  getColumns,
  INITIAL_PAGE_NUMBER,
  isRowSelectable,
} from './cluster-list-columns';

const storageProviderFilter = (t): RowFilter<ManagedClusterInfoType> => ({
  type: 'storage-provider',
  filterGroupName: t('Storage provider'),
  reducer: (cluster) => {
    const vendorIds = getClusterVendorIds(cluster);
    if (vendorIds.includes('data-foundation')) return 'data-foundation';
    if (vendorIds.includes('ibm-storage-scale')) return 'ibm-storage-scale';
    return 'generic';
  },
  items: (
    ['data-foundation', 'ibm-storage-scale', 'generic'] as StorageVendorId[]
  ).map((id) => ({ id, title: getStorageVendorLabel(id, t) })),
  filter: (selected, cluster) => {
    const chosen = selected?.selected;
    if (!chosen?.length) return true;
    const vendorIds = getClusterVendorIds(cluster);
    const isGeneric = !vendorIds.length || !!cluster.providers?.length;
    return (
      vendorIds.some((id) => chosen.includes(id)) ||
      (chosen.includes('generic') && isGeneric)
    );
  },
});

const ClusterRow: React.FC<RowComponentType<ManagedClusterInfoType>> = ({
  row: cluster,
}) => {
  const { t } = useCustomTranslation();
  const { isManagedClusterAvailable } = cluster;
  const vendorIds = getClusterVendorIds(cluster);
  const thirdPartyProvisioners = cluster.providers || [];
  const vendorLabels = vendorIds.map((id) => getStorageVendorLabel(id, t));
  const thirdPartyLabels = thirdPartyProvisioners.map((p) =>
    p.count > 1 ? `${p.displayName} (${p.count})` : p.displayName
  );
  const allLabels = [...vendorLabels, ...thirdPartyLabels];
  const storageProvider =
    allLabels.length === 0 ? (
      DASH
    ) : allLabels.length > 2 ? (
      <Popover
        headerContent={t('Storage provider')}
        bodyContent={
          <ul className="pf-v6-u-m-0 pf-v6-u-pl-xs">
            {allLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        }
        maxWidth="20rem"
      >
        <Button variant="link" isInline>
          {t('{{count}} providers', { count: allLabels.length })}
        </Button>
      </Popover>
    ) : (
      <Content component="p">{allLabels.join(', ')}</Content>
    );

  return (
    <>
      <Td
        dataLabel={
          getColumnHelper(ClusterListColumns.ManagedCluster, t).columnName
        }
      >
        <Content component="p">{getName(cluster)}</Content>
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
          getColumnHelper(ClusterListColumns.StorageProvider, t).columnName
        }
      >
        {storageProvider}
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
  const rowFilters = React.useMemo(() => [storageProviderFilter(t)], [t]);
  const [data, filteredData, onFilterChange] = useListPageFilter(
    clusters,
    rowFilters
  );
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
        <GridItem md={8} sm={12} className="pf-v6-u-mt-md">
          <ListPageFilterWrapper
            data={data}
            loaded={isLoaded}
            onFilterChange={onFilterChange}
            rowFilters={rowFilters}
            hideColumnManagement={true}
          />
        </GridItem>
        <GridItem md={4} sm={12}>
          <Pagination
            className="pf-v6-u-mt-md"
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
  preSelectedClusterNames = [],
  showOnlyPreselected = false,
  onSelectedClustersChange,
}) => {
  const [managedClusters, loaded, loadError] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const [odfClientInfoCM, odfCMLoaded, odfCMLoadError] =
    useK8sWatchResource<ConfigMapKind>(getODFClientInfoConfigMapResourceObj());

  const [scaleCM, scaleCMLoaded] = useK8sWatchResource<ConfigMapKind>(
    getIBMStorageScaleInfoConfigMapResourceObj()
  );

  const clusterNames = useDeepCompareMemoize(
    managedClusters.map((c) => getName(c)),
    true
  );

  const {
    providersByCluster,
    loaded: providersLoaded,
    error,
  } = useStorageProvisioners(clusterNames);

  const allLoaded = loaded && odfCMLoaded && scaleCMLoaded && providersLoaded;
  const anyError = loadError || odfCMLoadError || error;

  const allClusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (!!requiredODFVersion && allLoaded && !anyError)
      return getManagedClusterInfoTypes(
        managedClusters,
        odfClientInfoCM,
        scaleCM,
        requiredODFVersion,
        providersByCluster
      );

    return [];
  }, [
    requiredODFVersion,
    managedClusters,
    odfClientInfoCM,
    scaleCM,
    allLoaded,
    anyError,
    providersByCluster,
  ]);

  // Filter clusters to only show pre-selected ones when in modal mode
  const clusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (showOnlyPreselected && preSelectedClusterNames.length > 0) {
      return allClusters.filter((cluster) =>
        preSelectedClusterNames.includes(getName(cluster))
      );
    }
    return allClusters;
  }, [allClusters, showOnlyPreselected, preSelectedClusterNames]);

  const onChange = React.useCallback(
    (selectedClusterList: ManagedClusterInfoType[]) => {
      onSelectedClustersChange?.();
      dispatch({
        type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
        payload: selectedClusterList,
      });

      if (selectedClusterList.length < 2) {
        dispatch({
          type: DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION,
          payload: false,
        });
      }
    },
    [dispatch, onSelectedClustersChange]
  );

  // Handle pre-selection from topology view
  const hasPreSelected = React.useRef(false);
  React.useEffect(() => {
    if (
      !hasPreSelected.current &&
      preSelectedClusterNames.length > 0 &&
      clusters.length > 0 &&
      selectedClusters.length === 0
    ) {
      const preSelected = clusters.filter((cluster) =>
        preSelectedClusterNames.includes(getName(cluster))
      );
      if (preSelected.length === preSelectedClusterNames.length) {
        hasPreSelected.current = true;
        onChange(preSelected);
      }
    }
  }, [preSelectedClusterNames, clusters, selectedClusters.length, onChange]);

  const clustersLoaded = allLoaded && !!requiredODFVersion;

  return (
    <PaginatedClusterTable
      selectedClusters={selectedClusters}
      clusters={clusters}
      isLoaded={clustersLoaded}
      error={anyError}
      onChange={onChange}
    />
  );
};

type SelectClusterListProps = {
  selectedClusters: ManagedClusterInfoType[];
  requiredODFVersion: string;
  dispatch: React.Dispatch<DRPolicyAction>;
  preSelectedClusterNames?: string[];
  /**
   * When true, only shows clusters in preSelectedClusterNames
   * Used in modal view to limit cluster selection
   */
  showOnlyPreselected?: boolean;
  onSelectedClustersChange?: () => void;
};

type PaginatedClusterTableProps = {
  selectedClusters: ManagedClusterInfoType[];
  clusters: ManagedClusterInfoType[];
  isLoaded: boolean;
  error: any;
  onChange: (selectedClusterList: ManagedClusterInfoType[]) => void;
};

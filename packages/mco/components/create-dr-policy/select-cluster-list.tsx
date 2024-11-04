import * as React from 'react';
import { getManagedClusterResourceObj } from '@odf/mco/hooks';
import { getName } from '@odf/shared/selectors';
import { RowComponentType } from '@odf/shared/table';
import {
  SelectableTable,
  TABLE_VARIANT,
} from '@odf/shared/table/selectable-table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getPageRange, referenceForModel } from '@odf/shared/utils';
import {
  GreenCheckCircleIcon,
  ListPageFilter,
  RedExclamationCircleIcon,
  StatusIconAndText,
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
import { ACMManagedClusterViewModel } from '../../models';
import { ACMManagedClusterKind, ACMManagedClusterViewKind } from '../../types';
import {
  COLUMN_NAMES,
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
  const { odfInfo, region, isManagedClusterAvailable } = cluster;
  const clientName = odfInfo?.storageClusterInfo?.clientInfo?.name;
  const odfVersion = odfInfo?.odfVersion;
  return (
    <>
      <Td
        translate={null}
        dataLabel={getColumnHelper(COLUMN_NAMES.ManagedCluster, t).columnName}
      >
        <Text>{getName(cluster)}</Text>
      </Td>
      <Td
        translate={null}
        dataLabel={
          getColumnHelper(COLUMN_NAMES.AvailabilityStatus, t).columnName
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
        translate={null}
        dataLabel={getColumnHelper(COLUMN_NAMES.DataFoundation, t).columnName}
      >
        <Text className={cn({ 'text-muted': !odfVersion })}>
          {odfVersion || t('Not Installed')}
        </Text>
      </Td>
      <Td
        translate={null}
        dataLabel={getColumnHelper(COLUMN_NAMES.StorageClients, t).columnName}
      >
        <Text className={cn({ 'text-muted': !clientName })}>
          {!!clientName ? clientName : t('Unavailable')}
        </Text>
      </Td>
      <Td
        translate={null}
        dataLabel={getColumnHelper(COLUMN_NAMES.Region, t).columnName}
      >
        <Text className={cn({ 'text-muted': !region })}>
          {region || t('Unavailable')}
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
        selectedRows={selectedClusters}
        setSelectedRows={onChange}
        loaded={isLoaded}
        loadError={error}
        variant={TABLE_VARIANT.DEFAULT}
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

  const allLoaded = loaded && mcvsLoaded;
  const anyError = loadError || mcvsLoadError;

  const clusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (!!requiredODFVersion && allLoaded && !anyError)
      return getManagedClusterInfoTypes(
        managedClusters,
        mcvs,
        requiredODFVersion
      );

    return [];
  }, [requiredODFVersion, managedClusters, mcvs, allLoaded, anyError]);

  const onChange = (selectedClusterList: ManagedClusterInfoType[]) => {
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
  };

  return (
    <PaginatedClusterTable
      selectedClusters={selectedClusters}
      clusters={clusters}
      isLoaded={allLoaded}
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

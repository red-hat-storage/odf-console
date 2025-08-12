import * as React from 'react';
import {
  getClusterName,
  LastHeartBeat,
} from '@odf/core/components/storage-consumers/client-list';
import {
  getName,
  getUID,
  StorageConsumerKind,
  ClusterVersionModel,
  ClusterVersionKind,
} from '@odf/shared';
import { useK8sGet } from '@odf/shared/hooks';
import { TableSkeletonLoader } from '@odf/shared/skeletal-loader/TableSkeleton';
import {
  K8sResourceCommon,
  ListPageFilter,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Thead, Tr, Th, Tbody, Table, Td } from '@patternfly/react-table';
import { isLocalClientCluster } from '../../utils';

export type SelectedResources = string[];

type ResourceDistributionTableProps = {
  resources: StorageConsumerKind[];
  selectedResources: string[];
  setSelectedResources: React.Dispatch<React.SetStateAction<string[]>>;
  RowGenerator?: React.FC<RowGeneratorProps<K8sResourceCommon>>;
  columns: string[];
  loaded: boolean;
};

type RowGeneratorProps<T extends K8sResourceCommon> = {
  resource: T;
  onSelect: (selected: boolean) => void;
  isSelected: boolean;
  localClusterId: string;
  rowIndex: number;
};

const RowComponent: React.FC<RowGeneratorProps<StorageConsumerKind>> = ({
  resource,
  onSelect,
  isSelected,
  localClusterId,
  rowIndex,
}) => {
  const name = getName(resource);
  const clusterName = getClusterName(resource);
  const isLocalClient = isLocalClientCluster(resource, localClusterId);
  return (
    <Tr key={getUID(resource)}>
      <Td
        select={{
          rowIndex,
          onSelect: (_event, isSelecting) => onSelect(isSelecting),
          isSelected,
          isDisabled: isLocalClient,
        }}
      />
      <Td>{name}</Td>
      <Td>{clusterName}</Td>
      <Td>
        <LastHeartBeat heartbeat={resource.status?.lastHeartbeat} />{' '}
      </Td>
    </Tr>
  );
};
export const StorageConsumerTable: React.FC<ResourceDistributionTableProps> = ({
  resources,
  RowGenerator = RowComponent,
  selectedResources,
  setSelectedResources,
  loaded,
  columns,
}) => {
  const [cv, cvLoaded] = useK8sGet<ClusterVersionKind>(
    ClusterVersionModel,
    'version'
  );
  const localClusterId = cv?.spec?.clusterID;
  const localConsumerUID = getUID(
    resources?.find((resource) =>
      isLocalClientCluster(resource, localClusterId)
    )
  );

  const [areAllResourcesSelected, setAllResourcesSelected] =
    React.useState(false);

  React.useEffect(() => {
    const allSelected = _.isEmpty(resources)
      ? false
      : resources.every((resource) => {
          const uid = getUID(resource);
          return selectedResources.includes(uid);
        });
    if (allSelected) {
      setAllResourcesSelected(true);
    } else {
      setAllResourcesSelected(false);
    }
  }, [resources, selectedResources]);

  const onSelectRow = React.useCallback(
    (resource: K8sResourceCommon) => (selected: boolean) => {
      const updatedResources = selected
        ? [...selectedResources, getUID(resource)]
        : selectedResources.filter((name) => name !== getUID(resource));
      setSelectedResources(updatedResources);
    },
    [selectedResources, setSelectedResources]
  );

  const isRowSelected = React.useCallback(
    (resource: K8sResourceCommon) =>
      selectedResources.includes(getUID(resource)),
    [selectedResources]
  );

  const [unfilteredData, filteredData, onFilterChange] =
    useListPageFilter(resources);

  const selectAllResources = (select: boolean) => {
    const allUIDs = new Set(selectedResources);
    if (select) {
      filteredData?.forEach((resource) => {
        const uid = getUID(resource);
        if (uid !== localConsumerUID) allUIDs.add(uid);
      });
    } else {
      selectedResources?.forEach((resourceUID) => {
        if (resourceUID !== localConsumerUID) allUIDs.delete(resourceUID);
      });
    }
    setSelectedResources([...allUIDs]);
  };
  return !loaded || !cvLoaded ? (
    <TableSkeletonLoader columns={4} rows={8} />
  ) : (
    <>
      <ListPageFilter
        data={unfilteredData}
        loaded={loaded && cvLoaded}
        onFilterChange={onFilterChange}
        hideColumnManagement={true}
      />
      <Table variant="compact" data-test-id="resource-distribution-table">
        <Thead>
          <Tr>
            <Th
              select={{
                onSelect: (_event, isSelecting) =>
                  selectAllResources(isSelecting),
                isSelected: areAllResourcesSelected,
              }}
            />
            {columns.map((columnName) => (
              <Th key={columnName}>{columnName}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {filteredData.map((resource, index) => (
            <RowGenerator
              key={resource.metadata.uid}
              resource={resource}
              rowIndex={index}
              onSelect={onSelectRow(resource)}
              isSelected={isRowSelected(resource)}
              localClusterId={localClusterId}
            />
          ))}
        </Tbody>
      </Table>
    </>
  );
};

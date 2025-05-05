import * as React from 'react';
import { getName } from '@odf/shared';
import { TableSkeletonLoader } from '@odf/shared/skeletal-loader/TableSkeleton';
import {
  K8sResourceCommon,
  ListPageFilter,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Thead, Tr, Th, Tbody, Table } from '@patternfly/react-table';

export type SelectedResources = {
  storageClass: {
    [name: string]: boolean;
  };
  volumeSnapshotClass: {
    [name: string]: boolean;
  };
};

export type ResourceDistributionTableProps = {
  resources: K8sResourceCommon[];
  selectedResources: SelectedResources;
  setSelectedResources: React.Dispatch<React.SetStateAction<SelectedResources>>;
  RowGenerator: React.FC<RowGeneratorProps<K8sResourceCommon>>;
  columns: string[];
  loaded: boolean;
  resourceType: 'storageClass' | 'volumeSnapshotClass';
};

export type RowGeneratorProps<T extends K8sResourceCommon> = {
  resource: T;
  onSelect: (selected: boolean) => void;
  isSelected: boolean;
  rowIndex: number;
};

export const ResourceDistributionTable: React.FC<
  ResourceDistributionTableProps
> = ({
  resources,
  RowGenerator,
  selectedResources,
  setSelectedResources,
  loaded,
  columns,
  resourceType,
}) => {
  const [areAllResourcesSelected, setAllResourcesSelected] =
    React.useState(false);

  React.useEffect(() => {
    const allSelected = _.isEmpty(resources)
      ? false
      : resources.every((resource) => {
          const name = getName(resource);
          return !!selectedResources?.[resourceType]?.[name];
        });
    if (allSelected) {
      setAllResourcesSelected(true);
    }
  }, [resourceType, resources, selectedResources]);
  const onSelectRow = React.useCallback(
    (resource: K8sResourceCommon) => (selected: boolean) => {
      const updatedResources = {
        ...selectedResources,
      };
      updatedResources[resourceType][getName(resource)] = selected;
      const isAllSelected = Object.entries(
        updatedResources?.[resourceType]
      ).every(([, v]) => v);
      if (isAllSelected) {
        setAllResourcesSelected(true);
      } else {
        setAllResourcesSelected(false);
      }
      setSelectedResources(updatedResources);
    },
    [resourceType, selectedResources, setSelectedResources]
  );

  const isRowSelected = React.useCallback(
    (resource: K8sResourceCommon) =>
      selectedResources[resourceType]?.[getName(resource)],
    [resourceType, selectedResources]
  );

  const [unfilteredData, filteredData, onFilterChange] =
    useListPageFilter(resources);

  const selectAllResources = (select: boolean) => {
    setAllResourcesSelected(select);
    const newSelectedResources = {
      [resourceType]: filteredData.reduce((acc, storageClass) => {
        acc[storageClass.metadata.name] = select;
        return acc;
      }, {}),
    };
    setSelectedResources((prev) => ({ ...prev, ...newSelectedResources }));
  };
  return !loaded ? (
    <TableSkeletonLoader columns={4} rows={8} />
  ) : (
    <>
      <ListPageFilter
        data={unfilteredData}
        loaded={loaded}
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
            />
          ))}
        </Tbody>
      </Table>
    </>
  );
};

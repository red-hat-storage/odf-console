import * as React from 'react';
import { cephStorageLabel } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  getZone,
  nodesWithoutTaints,
  getNodeCPUCapacity,
  getNodeTotalMemory,
} from '@odf/core/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName, hasLabel } from '@odf/shared/selectors';
import {
  SelectableTable,
  TableVariant,
  RowComponentType,
  TableColumnProps,
} from '@odf/shared/table';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  resourcePathFromModel,
  getConvertedUnits,
  getNodeRoles,
  humanizeCpuCores,
} from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageFilter,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { Td } from '@patternfly/react-table';
import { SortByDirection } from '@patternfly/react-table';
import { WizardNodeState, WizardState } from '../reducer';
import { SelectNodesTableFooter } from './select-nodes-table-footer';
import './select-nodes-table.scss';

const tableColumnClasses = {
  name: classNames('pf-v6-u-w-33-on-md', 'pf-v6-u-w-50-on-sm'),
  role: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  cpu: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  memory: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  zone: classNames('pf-v6-u-w-inherit'),
};

const NodeRow: React.FC<RowComponentType<NodeData>> = ({ row: node }) => {
  const { t } = useCustomTranslation();
  const roles = getNodeRoles(node).sort();
  const cpuSpec: string = getNodeCPUCapacity(node);
  const memSpec: string = getNodeTotalMemory(node);

  return (
    <>
      <Td dataLabel={t('Name')}>
        <ResourceLink
          link={resourcePathFromModel(NodeModel, getName(node))}
          resourceModel={NodeModel}
          resourceName={getName(node)}
        />
      </Td>
      <Td dataLabel={t('Role')}>{roles.join(', ') ?? '-'}</Td>
      <Td dataLabel={t('CPU')}>{humanizeCpuCores(cpuSpec).string || '-'}</Td>
      <Td dataLabel={t('Memory')}>{getConvertedUnits(memSpec)}</Td>
      <Td dataLabel={t('Zone')}>{getZone(node) || '-'}</Td>
    </>
  );
};

const nameSort = (a: NodeData, b: NodeData, direction: SortByDirection) => {
  const negation = direction !== 'asc';
  const sortVal = a?.metadata.name.localeCompare(b?.metadata.name);
  return negation ? -sortVal : sortVal;
};

const InternalNodeTable: React.FC<NodeTableProps> = ({
  onRowSelected,
  nodesData,
  disableLabeledNodes,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();
  const storageLabel = cephStorageLabel(systemNamespace);

  const getColumns = React.useMemo(
    (): TableColumnProps[] => [
      {
        columnName: t('Name'),
        sortFunction: nameSort as <T>(a: T, b: T, c: SortByDirection) => number,
        thProps: { className: tableColumnClasses.name },
      },
      {
        columnName: t('Role'),
        thProps: { className: tableColumnClasses.role },
      },
      {
        columnName: t('CPU'),
        thProps: { className: tableColumnClasses.cpu },
      },
      {
        columnName: t('Memory'),
        thProps: { className: tableColumnClasses.memory },
      },
      {
        columnName: t('Zone'),
        thProps: { className: tableColumnClasses.zone },
      },
    ],
    [t]
  );

  const filteredData = React.useMemo(
    () => nodesWithoutTaints(nodesData),
    [nodesData]
  );

  // Initialize with labeled nodes selected (only once on first load, not when user deselects all)
  const [selectedNodes, setSelectedNodes] = React.useState<NodeData[]>([]);
  const hasInitializedSelection = React.useRef(false);

  React.useEffect(() => {
    if (hasInitializedSelection.current || !filteredData.length) return;
    if (selectedNodes.length > 0) return;
    const preSelected = filteredData.filter((node) =>
      hasLabel(node, storageLabel)
    );
    if (preSelected.length) {
      setSelectedNodes(preSelected);
      onRowSelected(preSelected);
    }
    hasInitializedSelection.current = true;
  }, [filteredData, selectedNodes.length, storageLabel, onRowSelected]);

  const handleRowSelection = React.useCallback(
    (selected: NodeData[]) => {
      setSelectedNodes(selected);
      onRowSelected(selected);
    },
    [onRowSelected]
  );

  const isRowSelectable = React.useCallback(
    (node: NodeData) => {
      // If disableLabeledNodes is true, nodes with storage label cannot be deselected
      if (disableLabeledNodes && hasLabel(node as NodeKind, storageLabel)) {
        return false;
      }
      return true;
    },
    [disableLabeledNodes, storageLabel]
  ) as (row: any) => boolean;

  return (
    <div className="ceph-odf-install__select-nodes-table">
      <SelectableTable<NodeData>
        columns={getColumns}
        rows={filteredData}
        RowComponent={NodeRow}
        selectedRows={selectedNodes}
        setSelectedRows={handleRowSelection}
        loaded={true}
        variant={TableVariant.COMPACT}
        initialSortColumnIndex={0}
        isRowSelectable={isRowSelectable}
        isColumnSelectableHidden={disableLabeledNodes}
      />
    </div>
  );
};

type NodeTableProps = {
  onRowSelected: (selectedNodes: NodeKind[]) => void;
  nodesData: NodeData[];
  disableLabeledNodes: boolean;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

export const SelectNodesTable: React.FC<SelectNodesTableProps> = ({
  nodes,
  onRowSelected,
  disableLabeledNodes = false,
  systemNamespace,
}) => {
  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData();
  const [data, filteredData, onFilterChange] = useListPageFilter(nodesData);

  return (
    <div className="odf-capacity-and-nodes__select-nodes">
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={nodesLoaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <StatusBox
          skeleton={<div className="loading-skeleton--table" />}
          data={filteredData}
          loaded={nodesLoaded}
          loadError={nodesLoadError}
        >
          <InternalNodeTable
            onRowSelected={onRowSelected}
            nodesData={filteredData}
            disableLabeledNodes={disableLabeledNodes}
            systemNamespace={systemNamespace}
          />
        </StatusBox>
      </ListPageBody>
      {!!nodes.length && <SelectNodesTableFooter nodes={nodes} />}
    </div>
  );
};

type SelectNodesTableProps = {
  nodes: WizardNodeState[];
  onRowSelected: (selectedNodes: NodeData[]) => void;
  disableLabeledNodes?: boolean;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

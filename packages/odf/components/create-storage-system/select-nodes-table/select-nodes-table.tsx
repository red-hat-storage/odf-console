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
import { useSelectList } from '@odf/shared/hooks/select-list';
import { useSortList } from '@odf/shared/hooks/sort-list';
import { NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName, hasLabel } from '@odf/shared/selectors';
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
import {
  Table,
  TableHeader,
  TableBody,
} from '@patternfly/react-table/deprecated';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { IRow, sortable } from '@patternfly/react-table';
import { WizardNodeState, WizardState } from '../reducer';
import { SelectNodesTableFooter } from './select-nodes-table-footer';
import './select-nodes-table.scss';

const tableColumnClasses = [
  classNames('pf-v5-u-w-33-on-md', 'pf-v5-u-w-50-on-sm'),
  classNames('pf-m-hidden', 'pf-m-visible-on-xl', 'pf-v5-u-w-inherit-on-xl'),
  classNames('pf-m-hidden', 'pf-m-visible-on-xl', 'pf-v5-u-w-inherit-on-xl'),
  classNames('pf-m-hidden', 'pf-m-visible-on-xl', 'pf-v5-u-w-inherit-on-xl'),
  classNames('pf-v5-u-w-inherit'),
];

const getRows = (
  nodesData: NodeData[],
  visibleRows,
  setVisibleRows,
  selectedNodes,
  setSelectedNodes,
  ns,
  disableLabeledNodes
) => {
  const storageLabel = cephStorageLabel(ns);

  const filteredData = nodesWithoutTaints(nodesData);

  const rows: IRow[] = filteredData.map((node: NodeData) => {
    const roles = getNodeRoles(node).sort();
    const cpuSpec: string = getNodeCPUCapacity(node);
    const memSpec: string = getNodeTotalMemory(node);
    const cells: IRow['cells'] = [
      {
        title: (
          <ResourceLink
            link={resourcePathFromModel(NodeModel, getName(node))}
            resourceModel={NodeModel}
            resourceName={getName(node)}
          />
        ),
      },
      {
        title: roles.join(', ') ?? '-',
      },
      {
        title: `${humanizeCpuCores(cpuSpec).string || '-'}`,
      },
      {
        title: `${getConvertedUnits(memSpec)}`,
      },
      {
        title: getZone(node) || '-',
      },
    ];
    return {
      cells,
      disableSelection: disableLabeledNodes && hasLabel(node, storageLabel),
      selected: selectedNodes
        ? selectedNodes.has(node.metadata.uid)
        : hasLabel(node, storageLabel),
      props: {
        id: node.metadata.uid,
      },
    };
  });

  const uids = new Set(filteredData.map((n) => n.metadata.uid));

  if (!_.isEqual(uids, visibleRows)) {
    setVisibleRows(uids);
    if (!selectedNodes?.size && filteredData.length) {
      const preSelected = filteredData.filter((row) =>
        hasLabel(row, storageLabel)
      );
      setSelectedNodes(preSelected);
    }
  }

  return rows;
};

const nameSort = (a, b, c) => {
  const negation = c !== 'asc';
  const sortVal = a?.metadata.name.localeCompare(b?.metadata.name);
  return negation ? -sortVal : sortVal;
};

const InternalNodeTable: React.FC<NodeTableProps> = ({
  nodes,
  onRowSelected,
  nodesData,
  disableLabeledNodes,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();

  const getColumns = React.useMemo(
    () => [
      {
        title: t('Name'),
        sortFunction: nameSort,
        transforms: [sortable],
        props: { className: tableColumnClasses[0] },
      },
      {
        title: t('Role'),
        props: { className: tableColumnClasses[1] },
      },
      {
        title: t('CPU'),
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('Memory'),
        props: { className: tableColumnClasses[3] },
      },
      {
        title: t('Zone'),
        props: { className: tableColumnClasses[4] },
      },
    ],
    [t]
  );

  const [visibleRows, setVisibleRows] = React.useState<Set<string>>(nodes);
  const {
    onSelect,
    selectedRows: selectedNodes,
    updateSelectedRows: setSelectedNodes,
  } = useSelectList<NodeKind>(nodesData, visibleRows, true, onRowSelected);
  const {
    onSort,
    sortIndex: index,
    sortDirection: direction,
    sortedData: rowsData,
  } = useSortList<NodeData>(nodesData, getColumns, true);

  /* Prevent the deselection of the labeled nodes (when that protection is enabled)
     through the "Select/Unselect All" checkbox. */
  const canSelectAll = !disableLabeledNodes;

  return (
    <div className="ceph-odf-install__select-nodes-table">
      <Table
        aria-label={t('Node Table')}
        data-test-id="select-nodes-table"
        variant="compact"
        rows={getRows(
          rowsData,
          visibleRows,
          setVisibleRows,
          selectedNodes,
          setSelectedNodes,
          systemNamespace,
          disableLabeledNodes
        )}
        cells={getColumns}
        onSelect={onSelect}
        onSort={onSort}
        sortBy={{ index, direction }}
        canSelectAll={canSelectAll}
      >
        <TableHeader />
        <TableBody />
      </Table>
    </div>
  );
};

type NodeTableProps = {
  nodes: Set<string>;
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
            nodes={new Set(nodes.map(({ uid }) => uid))}
            onRowSelected={onRowSelected}
            nodesData={filteredData}
            disableLabeledNodes={disableLabeledNodes}
            systemNamespace={systemNamespace}
          />
        </StatusBox>
      </ListPageBody>
      {!!nodes.length && (
        <SelectNodesTableFooter
          nodes={nodes}
          isTwoNodesOneArbiterCluster={false}
        />
      )}
    </div>
  );
};

type SelectNodesTableProps = {
  nodes: WizardNodeState[];
  onRowSelected: (selectedNodes: NodeData[]) => void;
  disableLabeledNodes?: boolean;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

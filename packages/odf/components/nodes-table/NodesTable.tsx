import * as React from 'react';
import { NodeData } from '@odf/core/types';
import {
  getNodeCPUCapacity,
  getNodeTotalMemory,
  getZone,
} from '@odf/core/utils';
import { NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName } from '@odf/shared/selectors';
import {
  RowComponentType,
  SelectableTable,
  TableColumnProps,
  TableVariant,
} from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getConvertedUnits,
  getNodeRoles,
  humanizeCpuCores,
  resourcePathFromModel,
} from '@odf/shared/utils';
import classNames from 'classnames';
import { SortByDirection, Td } from '@patternfly/react-table';
import './NodesTable.scss';

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

type NodesTableProps = {
  nodes: NodeData[];
  selectedNodes: NodeData[];
  setSelectedNodes: (nodes: NodeData[]) => void;
  loaded: boolean;
  isRowSelectable?: (node: NodeData) => boolean;
  hideSelectAll?: boolean;
  nameColumnTitle?: string;
};

export const NodesTable: React.FC<NodesTableProps> = ({
  nodes,
  selectedNodes,
  setSelectedNodes,
  loaded,
  isRowSelectable,
  hideSelectAll,
  nameColumnTitle,
}) => {
  const { t } = useCustomTranslation();
  const columns = React.useMemo<TableColumnProps[]>(
    () => [
      {
        columnName: nameColumnTitle || t('Name'),
        sortFunction: nameSort as <T>(
          a: T,
          b: T,
          direction: SortByDirection
        ) => number,
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
    [nameColumnTitle, t]
  );

  return (
    <div className="ceph-odf-install__select-nodes-table">
      <SelectableTable<NodeData>
        columns={columns}
        rows={nodes}
        RowComponent={NodeRow}
        selectedRows={selectedNodes}
        setSelectedRows={setSelectedNodes}
        loaded={loaded}
        variant={TableVariant.COMPACT}
        initialSortColumnIndex={0}
        isRowSelectable={isRowSelectable as (row: any) => boolean}
        isColumnSelectableHidden={hideSelectAll}
      />
    </div>
  );
};

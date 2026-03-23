import * as React from 'react';
import { NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  resourcePathFromModel,
  humanizeCpuCores,
  getConvertedUnits,
} from '@odf/shared/utils';
import {
  TableData,
  useActiveColumns,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { sortable } from '@patternfly/react-table';
import { WizardNodeState } from '../../reducer';
import { SelectNodesTableFooter } from '../../select-nodes-table/select-nodes-table-footer';

const tableColumnClasses = [
  { className: classNames('pf-v6-u-w-40-on-sm'), id: 'name' },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-sm',
      'pf-v6-u-w-10-on-sm'
    ),
    id: 'roles',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-sm',
      'pf-v6-u-w-10-on-sm'
    ),
    id: 'cpu',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-sm',
      'pf-v6-u-w-10-on-sm'
    ),
    id: 'memory',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-sm',
      'pf-v6-u-w-10-on-sm'
    ),
    id: 'zone',
  },
];

const SelectedNodesTableRow = ({ obj, activeColumnIDs }) => {
  const { cpu, memory, zone, name, roles } = obj;
  return (
    <>
      <TableData {...tableColumnClasses[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          link={resourcePathFromModel(NodeModel, name)}
          resourceModel={NodeModel}
          resourceName={name}
        />
      </TableData>
      <TableData {...tableColumnClasses[1]} activeColumnIDs={activeColumnIDs}>
        {roles.join(', ') ?? '-'}
      </TableData>
      <TableData {...tableColumnClasses[2]} activeColumnIDs={activeColumnIDs}>
        {`${humanizeCpuCores(cpu).string || '-'}`}
      </TableData>
      <TableData {...tableColumnClasses[3]} activeColumnIDs={activeColumnIDs}>
        {`${getConvertedUnits(memory)}`}
      </TableData>
      <TableData {...tableColumnClasses[4]} activeColumnIDs={activeColumnIDs}>
        {zone ?? '-'}
      </TableData>
    </>
  );
};

export const SelectedNodesTable: React.FC<SelectedNodesTableProps> = ({
  data,
  showDetails = true,
}) => {
  const { t } = useCustomTranslation();

  const SelectedNodesTableColumns = React.useMemo(
    () => [
      {
        title: t('Name'),
        sort: 'name',
        transforms: [sortable],
        props: { className: tableColumnClasses[0].className },
        id: tableColumnClasses[0].id,
      },
      {
        title: t('Role'),
        props: { className: tableColumnClasses[1].className },
        id: tableColumnClasses[1].id,
      },
      {
        title: t('CPU'),
        props: { className: tableColumnClasses[2].className },
        id: tableColumnClasses[2].id,
      },
      {
        title: t('Memory'),
        props: { className: tableColumnClasses[3].className },
        id: tableColumnClasses[3].id,
      },
      {
        title: t('Zone'),
        props: { className: tableColumnClasses[4].className },
        id: tableColumnClasses[4].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: SelectedNodesTableColumns as any, // Todo(bipuladh): Update once sdk is updated
    showNamespaceOverride: false,
    columnManagementID: 'SELECTED_NODES',
  });

  return (
    <>
      <VirtualizedTable
        aria-label="Selected nodes table"
        data={data}
        columns={columns}
        Row={SelectedNodesTableRow}
        unfilteredData={data}
        loaded={true}
        loadError={false}
      />
      {showDetails && !!data.length && <SelectNodesTableFooter nodes={data} />}
    </>
  );
};

type SelectedNodesTableProps = {
  data: WizardNodeState[];
  showDetails?: boolean;
};

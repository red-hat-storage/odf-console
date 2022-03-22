import * as React from 'react';
import { referenceForModel } from '@odf/shared/utils';
import {
  ListPageHeader,
  ListPageBody,
  ListPageCreateLink,
  VirtualizedTable,
  useK8sWatchResource,
  useListPageFilter,
  ListPageFilter,
  TableData,
  RowProps,
  useActiveColumns,
  TableColumn,
 } from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { sortable, wrappable } from '@patternfly/react-table';
import { DRPolicyModel } from '../../../models';
import { DRPolicyKind } from '../../../types';


const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'status' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'clusters',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'replicationPolicy',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'applications',
  },
];

const DRPolicyRow: React.FC<RowProps<DRPolicyKind>> = ({
  obj,
  activeColumnIDs
}) => {

  return (
      <>
        <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
          {obj?.metadata?.name}
        </TableData>
        <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
          {"Status"}
        </TableData>
        <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
          {"Cluster 1"}<br/>{"Cluster 2"}
        </TableData>
        <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
          {"Synchronous"}
        </TableData>
        <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
          {"58 Applications"}
        </TableData>
      </>
    );
  };

const DRPolicyList: React.FC<DRPolicyListProps> = (props) => {
  const { t } = useTranslation('plugin__odf-console');
  
  const Header = React.useMemo<
    TableColumn<DRPolicyKind>[]
  >(
    () => [
      {
        title: t('Name'),
        sort: 'metadata.name',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[0].className,
        },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('Status'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Clusters'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('Replication policy'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('Applications'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: Header,
    showNamespaceOverride: false,
    columnManagementID: null,
  });


  return (
    <VirtualizedTable
      {...props}
      aria-label={t('DRPolicies')}
      columns={columns}
      Row={DRPolicyRow}
    />
  );
};

type DRPolicyListProps = {
  data: DRPolicyKind[];
  unfilteredData: DRPolicyKind[];
  loaded: boolean;
  loadError: any;
  rowData?: any;
};

export const DRPolicyListPage: React.FC<RouteComponentProps> = () => {
  const { t } = useTranslation('plugin__odf-console');

  const createProps =`/multicloud/data-services/data-policies/${referenceForModel(DRPolicyModel)}/~new`;

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] = useK8sWatchResource<DRPolicyKind[]>({
    kind: referenceForModel(DRPolicyModel),
    isList: true,
    namespace: false,
  });

  const [data, filteredData, onFilterChange] =
    useListPageFilter(drPolicies);


  return (
    <>
      <ListPageHeader title={''}>
          <ListPageCreateLink to={createProps}>
            {t('Create DRPolicy')}
          </ListPageCreateLink>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={drPoliciesLoaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <DRPolicyList
          data={filteredData as DRPolicyKind[]}
          unfilteredData={drPolicies}
          loaded={drPoliciesLoaded}
          loadError={drPoliciesLoadError}
        />
      </ListPageBody>
    </>
  );
};

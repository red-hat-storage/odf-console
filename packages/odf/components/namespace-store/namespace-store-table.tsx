import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useSelectList } from '@odf/shared/hooks/select-list';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageFilter,
  ResourceLink,
  RowProps,
  TableColumn,
  TableData,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { Checkbox } from '@patternfly/react-core';
import { NooBaaNamespaceStoreModel } from '../../models';
import { NamespaceStoreKind } from '../../types';
import { getNamespaceStoreType, getNSRegion } from '../../utils';
import './namespace-store-table.scss';

const tableColumnInfo = [
  { className: '', id: 'checkbox' },
  { className: '', id: 'name' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'region',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'provider',
  },
];

type CustomData = {
  selectedData: any;
  onSelect: any;
};

const RowRenderer: React.FC<RowProps<NamespaceStoreKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData: { selectedData, onSelect },
}) => {
  const isChecked = selectedData.has(obj.metadata.uid);
  const onChange = (checked: boolean) =>
    onSelect(null, checked, 0, { props: { id: obj.metadata.uid } });
  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <Checkbox
          label=""
          isChecked={isChecked}
          onChange={onChange}
          id={`${obj.metadata.name}-checkbox`}
        />
      </TableData>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          linkTo={false}
          kind={referenceForModel(NooBaaNamespaceStoreModel)}
          name={getName(obj)}
          namespace={getNamespace(obj)}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {getNSRegion(obj)}
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {getNamespaceStoreType(obj)}
      </TableData>
    </>
  );
};

type NamespaceStoreListProps = {
  data: NamespaceStoreKind[];
  unfilteredData: NamespaceStoreKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const NamespaceStoreList: React.FC<NamespaceStoreListProps> = (props) => {
  const { t } = useCustomTranslation();
  const columns = React.useMemo<TableColumn<NamespaceStoreKind>[]>(
    () => [
      {
        title: '',
        props: {
          className: tableColumnInfo[0].className,
        },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('Name'),
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Region'),
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('provider'),
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
    ],
    [t]
  );

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('NamespaceStore')}
      columns={columns}
      Row={RowRenderer}
    />
  );
};

type NamespaceStoreListWrapperProps = {
  onSelectNamespaceStore: any;
  preSelected: string[]; // UIDs of preSelected Elements if any
};

const NamespaceStoreListWrapper: React.FC<NamespaceStoreListWrapperProps> = ({
  onSelectNamespaceStore,
  preSelected,
}) => {
  const [nsObjects, loaded, loadError] = useK8sWatchResource<
    NamespaceStoreKind[]
  >({
    kind: referenceForModel(NooBaaNamespaceStoreModel),
    isList: true,
    namespace: CEPH_STORAGE_NAMESPACE,
  });
  const memoizedResources = useDeepCompareMemoize(nsObjects, true);

  const [data, filteredData, onFilterChange] =
    useListPageFilter(memoizedResources);

  const { onSelect, selectedRows } = useSelectList<NamespaceStoreKind>(
    data,
    new Set(preSelected),
    true,
    onSelectNamespaceStore
  );
  return (
    <ListPageBody>
      <ListPageFilter
        data={data}
        loaded={loaded}
        onFilterChange={onFilterChange}
        hideColumnManagement={true}
      />
      <NamespaceStoreList
        data={filteredData}
        unfilteredData={data}
        loaded={loaded}
        loadError={loadError}
        rowData={{ selectedData: selectedRows, onSelect }}
      />
    </ListPageBody>
  );
};

export default NamespaceStoreListWrapper;

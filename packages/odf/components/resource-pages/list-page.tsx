import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { LabelList } from '@odf/shared/details-page/label-list';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { Kebab, CustomKebabItem } from '@odf/shared/kebab/kebab';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sModel,
  K8sResourceCommon,
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { TFunction } from 'react-i18next';
import { sortable } from '@patternfly/react-table';
import {
  NooBaaBackingStoreModel,
  NooBaaBucketClassModel,
  NooBaaNamespaceStoreModel,
} from '../../models';
import { OperandStatus } from '../utils';

const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'kind' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'status',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'labels',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'creationTimestamp',
  },
  { className: Kebab.columnClass, id: '' },
];

type ResourceTableProps = {
  data: K8sResourceCommon[];
  unfilteredData: K8sResourceCommon[];
  loaded: boolean;
  loadError: any;
  rowData: CustomData;
};

const ResourceTable: React.FC<ResourceTableProps> = (props) => {
  const { t } = useCustomTranslation();
  const tableColumns = React.useMemo<TableColumn<K8sResourceCommon>[]>(
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
        title: t('Kind'),
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Status'),
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('Labels'),
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('Last Updated'),
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
      {
        title: '',
        props: {
          className: tableColumnInfo[5].className,
        },
        id: tableColumnInfo[5].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: tableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });
  return (
    <VirtualizedTable
      {...props}
      aria-label={t('Resource Page')}
      columns={columns}
      Row={RowRenderer}
    />
  );
};

type CustomData = {
  resourceModel: K8sModel;
  kebabActions?: CustomKebabItem[];
};

const RowRenderer: React.FC<RowProps<K8sResourceCommon, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { resourceModel, kebabActions } = rowData;
  const name = getName(obj);
  const path = `/odf/resource/${referenceForModel(resourceModel)}/${name}`;
  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          resourceModel={resourceModel}
          resourceName={name}
          link={path}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {obj.kind}
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <OperandStatus operand={obj} />
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        <LabelList kind={obj.kind} labels={obj.metadata.labels} />
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        <Timestamp timestamp={obj.metadata.creationTimestamp} />
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          extraProps={{ resource: obj, resourceModel: resourceModel }}
          customKebabItems={kebabActions}
        />
      </TableData>
    </>
  );
};

type GenericListPageProps = {
  resourceModel: K8sModel;
  kebabActions?: CustomData['kebabActions'];
};

const GenericListPage: React.FC<GenericListPageProps> = ({
  resourceModel,
  kebabActions,
}) => {
  const { t } = useCustomTranslation();

  const { isODFNsLoaded, odfNsLoadError } = useODFNamespaceSelector();

  const [resources, loaded, loadError] = useSafeK8sWatchResource<
    K8sResourceCommon[]
  >((ns: string) => ({
    kind: referenceForModel(resourceModel),
    namespace: ns,
    isList: true,
  }));

  const [data, filteredData, onFilterChange] = useListPageFilter(resources);

  const createLink = `/odf/resource/${referenceForModel(
    resourceModel
  )}/create/~new`;

  return (
    <>
      <ListPageHeader title={null}>
        <ListPageCreateLink to={createLink}>
          {t('Create')} {resourceModel.label}
        </ListPageCreateLink>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded && isODFNsLoaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <ResourceTable
          data={filteredData || []}
          unfilteredData={data || []}
          loaded={loaded && isODFNsLoaded}
          loadError={loadError || odfNsLoadError}
          rowData={{ resourceModel, kebabActions }}
        />
      </ListPageBody>
    </>
  );
};

const EDIT_BC_RESOURCES = 'EDIT_BC_RESOURCES';

const bcKebabActions = (t: TFunction) => [
  {
    key: EDIT_BC_RESOURCES,
    value: t('Edit Bucket Class Resources'),
    component: React.lazy(
      () => import('../bucket-class/modals/edit-backingstore-modal')
    ),
  },
];

export const BucketClassListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <GenericListPage
      resourceModel={NooBaaBucketClassModel}
      kebabActions={bcKebabActions(t)}
    />
  );
};

export const NamespaceStoreListPage: React.FC = () => (
  <GenericListPage resourceModel={NooBaaNamespaceStoreModel} />
);

export const BackingStoreListPage: React.FC = () => (
  <GenericListPage resourceModel={NooBaaBackingStoreModel} />
);

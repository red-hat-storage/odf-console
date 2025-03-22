import * as React from 'react';
import { NooBaaObjectBucketClaimModel } from '@odf/shared';
import DetailsPage, {
  ResourceSummary,
} from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { Kebab } from '@odf/shared/kebab/kebab';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import {
  K8sResourceCommon,
  ListPageBody,
  ListPageFilter,
  ResourceLink as ResourceLinkWithKind,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';
import { sortable } from '@patternfly/react-table';
import { NooBaaObjectBucketModel } from '../../../shared/src/models/ocs';
import { getPhase, obStatusFilter } from '../../utils';
import '../../style.scss';

type OBStatusProps = {
  ob: K8sResourceKind;
};

const OBStatus: React.FC<OBStatusProps> = ({ ob }) => (
  <Status status={getPhase(ob)} />
);

type ObjectBucketsListProps = {
  data: K8sResourceKind[];
  unfilteredData: K8sResourceKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const tableColumnInfo = [
  {
    className: '',
    id: 'name',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'status',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'StorageClass',
  },
  { className: Kebab.columnClass, id: '' },
];

type CustomData = {
  launchModal: any;
};

const OBRow: React.FC<RowProps<K8sResourceKind, CustomData>> = ({
  obj,
  activeColumnIDs,
}) => {
  const { t } = useCustomTranslation();
  const storageClassName = _.get(obj, 'spec.storageClassName');
  const path = `/odf/resource/${referenceForModel(NooBaaObjectBucketModel)}/${
    obj.metadata.name
  }`;
  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          resourceModel={NooBaaObjectBucketModel}
          resourceName={obj.metadata.name}
          link={path}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <OBStatus ob={obj} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {storageClassName ? (
          <ResourceLinkWithKind kind="StorageClass" name={storageClassName} />
        ) : (
          '-'
        )}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          extraProps={{
            resource: obj,
            resourceModel: NooBaaObjectBucketModel,
          }}
          terminatingTooltip={t(
            'The corresponding ObjectBucketClaim must be deleted first.'
          )}
        />
      </TableData>
    </>
  );
};

const ObjectBucketsList: React.FC<ObjectBucketsListProps> = ({ ...props }) => {
  const { t } = useCustomTranslation();
  const objectBucketTableColumns = React.useMemo<
    TableColumn<K8sResourceKind>[]
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
        sort: 'metadata.namespace',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('StorageClass'),
        transforms: [sortable],
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: '',
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: objectBucketTableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('ObjectBuckets')}
      columns={columns}
      Row={OBRow}
    />
  );
};

export const ObjectBucketListPage: React.FC<ObjectBucketsPageProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { selector, namespace } = props;

  const [obc, loaded, loadError] = useK8sWatchResource<K8sResourceKind[]>({
    kind: referenceForModel(NooBaaObjectBucketModel),
    isList: true,
    selector,
  });

  const rowFilters = React.useMemo(() => [obStatusFilter(t)], [t]);
  const [data, filteredData, onFilterChange] = useListPageFilter(
    obc,
    rowFilters
  );

  return (
    <ListPageBody>
      <ListPageFilter
        data={data}
        loaded={loaded}
        onFilterChange={onFilterChange}
        hideColumnManagement={true}
        rowFilters={rowFilters}
      />
      <ObjectBucketsList
        data={filteredData}
        unfilteredData={obc}
        loaded={loaded}
        loadError={loadError}
        rowData={{ namespace }}
      />
    </ListPageBody>
  );
};

type OBDetailsProps = {
  obj: K8sResourceCommon;
  ownerLabel?: string;
};

export const OBDetails: React.FC<OBDetailsProps> = ({ obj, ownerLabel }) => {
  const { t } = useCustomTranslation();
  const storageClassName = _.get(obj, 'spec.storageClassName');
  const [OBCName, OBCNamespace] = [
    _.get(obj, 'spec.claimRef.name'),
    _.get(obj, 'spec.claimRef.namespace'),
  ];

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Object Bucket Details')} />
      <div className="row">
        <div className="col-sm-6">
          <ResourceSummary
            resource={obj}
            resourceModel={NooBaaObjectBucketModel}
            ownerLabel={ownerLabel}
          />
        </div>
        <div className="col-sm-6">
          <dl>
            <dt>{t('Status')}</dt>
            <dd>
              <OBStatus ob={obj} />
            </dd>
            <dt>{t('StorageClass')}</dt>
            <dd>
              {storageClassName ? (
                <ResourceLinkWithKind
                  kind="StorageClass"
                  name={storageClassName}
                />
              ) : (
                '-'
              )}
            </dd>
            <dt>{t('Object Bucket Claim')}</dt>
            <dd>
              <ResourceLinkWithKind
                kind={referenceForModel(NooBaaObjectBucketClaimModel)}
                name={OBCName}
                namespace={OBCNamespace}
              />
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export const OBDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { resourceName: name } = useParams();
  const [resource, loaded] = useK8sWatchResource<K8sResourceKind>({
    kind: referenceForModel(NooBaaObjectBucketModel),
    name,
    isList: false,
  });

  const breadcrumbs = [
    {
      name: t('Object Storage'),
      path: '/odf/object-storage',
    },
    {
      name: t('ObjectBuckets'),
      path: `/odf/object-storage/objectbucket.io~v1alpha1~ObjectBucket`,
    },
    {
      name: t('ObjectBucket details'),
      path: '',
    },
  ];

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        extraProps={{
          resource,
          resourceModel: NooBaaObjectBucketModel,
        }}
      />
    );
  }, [resource]);

  return (
    <>
      {loaded ? (
        <DetailsPage
          breadcrumbs={breadcrumbs}
          actions={actions}
          resourceModel={NooBaaObjectBucketModel}
          resource={resource}
          pages={[
            {
              href: '',
              name: 'Details',
              component: OBDetails as any,
            },
            {
              href: 'yaml',
              name: 'YAML',
              component: YAMLEditorWrapped,
            },
            {
              href: 'events',
              name: 'Events',
              component: EventStreamWrapped,
            },
          ]}
        />
      ) : (
        <LoadingBox />
      )}
    </>
  );
};

type ObjectBucketsPageProps = {
  showTitle?: boolean;
  namespace?: string;
  selector?: any;
  hideLabelFilter?: boolean;
  hideNameLabelFilters?: boolean;
  hideColumnManagement?: boolean;
};

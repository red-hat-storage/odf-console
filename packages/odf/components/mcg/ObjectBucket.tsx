import * as React from 'react';
import { NooBaaObjectBucketClaimModel } from '@odf/core/models';
import DetailsPage, {
  ResourceSummary,
} from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { K8sResourceKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageFilter,
  ListPageHeader,
  ResourceLink,
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
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { sortable } from '@patternfly/react-table';
import { NooBaaObjectBucketModel } from '../../models/ocs';
import { getPhase, obStatusFilter } from '../../utils';

const kind = referenceForModel(NooBaaObjectBucketModel);

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
  { className: 'dropdown-kebab-pf pf-c-table__action', id: '' },
];

type CustomData = {
  launchModal: any;
};

const OBRow: React.FC<RowProps<K8sResourceKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData: { launchModal },
}) => {
  const storageClassName = _.get(obj, 'spec.storageClassName');
  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          kind={kind}
          name={obj.metadata.name}
          namespace={obj.metadata.namespace}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <OBStatus ob={obj} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {storageClassName ? (
          <ResourceLink kind="StorageClass" name={storageClassName} />
        ) : (
          '-'
        )}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          launchModal={launchModal}
          extraProps={{
            resource: obj,
            resourceModel: NooBaaObjectBucketModel,
          }}
        />
      </TableData>
    </>
  );
};

const ObjectBucketsList: React.FC<ObjectBucketsListProps> = ({ ...props }) => {
  const { t } = useTranslation('plugin__odf-console');
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

export const ObjectBucketListPage: React.FC<ObjectBucketsPageProps> = (props) => {
  const { t } = useTranslation();
  const { selector, namespace } = props;
  const [Modal, modalProps, launchModal] = useModalLauncher();

  const [obc, loaded, loadError] = useK8sWatchResource<K8sResourceKind[]>({
    kind: referenceForModel(NooBaaObjectBucketModel),
    isList: true,
    selector,
  });

  const [data, filteredData, onFilterChange] = useListPageFilter(obc);

  const rowFilters = [obStatusFilter(t)];
  return (
    <>
      <Modal {...modalProps} />
      <ListPageHeader title={t('ObjectBuckets')} />
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
          rowData={{ launchModal, namespace }}
        />
      </ListPageBody>
    </>
  );
};

type DetailsProps = {
  obj: K8sResourceKind;
};

type DetailsType = (launchModal: any, t) => React.FC<DetailsProps>;

const OBDetails: DetailsType =
  (launchModal, t) =>
  // eslint-disable-next-line react/display-name
  ({ obj }) => {
    const storageClassName = _.get(obj, 'spec.storageClassName');
    const [OBCName, OBCNamespace] = [
      _.get(obj, 'spec.claimRef.name'),
      _.get(obj, 'spec.claimRef.namespace'),
    ];

    return (
      <>
        <div className="co-m-pane__body">
          <SectionHeading
            text={t('Object Bucket Details')}
          />
          <div className="row">
            <div className="col-sm-6">
              <ResourceSummary
                resource={obj}
                launchModal={launchModal}
                resourceModel={NooBaaObjectBucketModel}
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
                    <ResourceLink kind="StorageClass" name={storageClassName} />
                  ) : (
                    '-'
                  )}
                </dd>
                <dt>{t('Object Bucket Claim')}</dt>
                <dd>
                  <ResourceLink
                    kind={referenceForModel(NooBaaObjectBucketClaimModel)}
                    name={OBCName}
                    namespace={OBCNamespace}
                  />
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </>
    );
  };

type ObjectBucketDetailsPageProps = {
  match: RouteComponentProps<{ name: string; plural: string }>['match'];
};

export const OBDetailsPage: React.FC<ObjectBucketDetailsPageProps> = ({
  match,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const { name, plural: kind } = match.params;
  const [resource, loaded] = useK8sWatchResource<K8sResourceKind>({
    kind,
    name,
    isList: false,
  });

  const [Modal, modalProps, launchModal] = useModalLauncher();

  const breadcrumbs = [
    {
      name: t('ObjectBuckets'),
      path: `/k8s/cluster/${kind}`,
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
        launchModal={launchModal}
        extraProps={{
          resource,
          resourceModel: NooBaaObjectBucketModel,
        }}
      />
    );
  }, [launchModal, resource]);

  const Details = React.useMemo(
    () => OBDetails(launchModal, t),
    [launchModal, t]
  );

  return (
    <>
      <Modal {...modalProps} />
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
              component: Details as any,
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

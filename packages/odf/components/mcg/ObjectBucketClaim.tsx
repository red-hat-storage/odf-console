import * as React from 'react';
import { NooBaaObjectBucketClaimModel } from '@odf/core/models';
import DetailsPage, {
  ResourceSummary,
} from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { Status } from '@odf/shared/status/Status';
import { K8sResourceKind } from '@odf/shared/types';
import { referenceForModel, resourcePathFromModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  ResourceLink,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useFlag,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { sortable } from '@patternfly/react-table';
import { MCG_FLAG, RGW_FLAG } from '../../features';
import { NooBaaObjectBucketModel } from '../../models';
import { getPhase, isBound, obcStatusFilter } from '../../utils';
import {
  YAMLEditorWrapped,
  EventStreamWrapped,
} from '../resource-pages/CommonDetails';
import { GetSecret } from './secret';
import '../../style.scss';

const tableColumnInfo = [
  {
    className: '',
    id: 'name',
  },
  { className: '', id: 'Namespace' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'status',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'phase',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'Secret',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'usedCapacity',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'StorageClass',
  },
  { className: 'dropdown-kebab-pf pf-c-table__action', id: '' },
];

type ObjectBucketClaimsListProps = {
  data: K8sResourceKind[];
  unfilteredData: K8sResourceKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

type OBCStatusProps = {
  obc: K8sResourceKind;
};

export const OBCStatus: React.FC<OBCStatusProps> = ({ obc }) => (
  <Status status={getPhase(obc)} />
);

const ObjectBucketClaimsList: React.FC<ObjectBucketClaimsListProps> = ({
  ...props
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const objectBucketClaimTableColumns = React.useMemo<
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
        title: t('Namespace'),
        sort: 'metadata.namespace',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Status'),
        sort: 'metadata.namespace',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('Secret'),
        sort: 'metadata.namespace',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('StorageClass'),
        transforms: [sortable],
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
    columns: objectBucketClaimTableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('ObjectBucketClaims')}
      columns={columns}
      Row={OBCRow}
    />
  );
};

type CustomData = {
  launchModal: any;
  namespace: string;
};

const kind = referenceForModel(NooBaaObjectBucketClaimModel);

const OBCRow: React.FC<RowProps<K8sResourceKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData: { launchModal, namespace },
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
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <OBCStatus obc={obj} />
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {isBound(obj) ? (
          <ResourceLink
            kind="Secret"
            name={obj.metadata.name}
            namespace={obj.metadata.namespace}
          />
        ) : (
          '-'
        )}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {storageClassName ? (
          <ResourceLink kind="StorageClass" name={storageClassName} />
        ) : (
          '-'
        )}
      </TableData>

      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          launchModal={launchModal}
          extraProps={{
            resource: obj,
            resourceModel: NooBaaObjectBucketClaimModel,
            namespace,
          }}
          customKebabItems={(t) => ({
            ATTACH_DEPLOYMENT: t('Attach to Deployment'),
          })}
        />
      </TableData>
    </>
  );
};

type ObjectBucketClaimsPageProps = {
  showTitle?: boolean;
  namespace?: string;
  selector?: any;
  hideLabelFilter?: boolean;
  hideNameLabelFilters?: boolean;
  hideColumnManagement?: boolean;
};

const extraMap = {
  ATTACH_DEPLOYMENT: React.lazy(
    () => import('../../modals/attach-deployment/attach-deployment-obc-modal')
  ),
};
export const OBCListPage: React.FC<ObjectBucketClaimsPageProps> = (props) => {
  const { t } = useTranslation();
  const hasRGW = useFlag(RGW_FLAG);
  const hasMCG = useFlag(MCG_FLAG);
  const hasNone = !hasRGW && !hasMCG;

  const { selector, namespace } = props;

  const [Modal, modalProps, launchModal] = useModalLauncher(extraMap);

  const [obc, loaded, loadError] = useK8sWatchResource<K8sResourceKind[]>({
    kind: referenceForModel(NooBaaObjectBucketClaimModel),
    isList: true,
    selector,
    namespace,
  });

  const [data, filteredData, onFilterChange] = useListPageFilter(obc);

  const createLink = `${resourcePathFromModel(
    NooBaaObjectBucketClaimModel,
    null,
    namespace || 'default'
  )}/~new/form`;

  const rowFilters = [obcStatusFilter(t)];
  return (
    <>
      <Modal {...modalProps} />
      <ListPageHeader title={t('ObjectBucketClaims')}>
        {!hasNone ? (
          <ListPageCreateLink to={createLink}>
            {t('Create ObjectBucketClaim')}
          </ListPageCreateLink>
        ) : null}
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
          rowFilters={rowFilters}
        />
        <ObjectBucketClaimsList
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

type ObjectBucketClaimDetailsPageProps = {
  match: RouteComponentProps<{ name: string; plural: string }>['match'];
  namespace: string;
};

type OBCDetailsProps = {
  obj?: K8sResourceKind;
};

export const OBCDetails: React.FC<OBCDetailsProps & RouteComponentProps> = ({
  obj,
}) => {
  const { t } = useTranslation();
  const storageClassName = _.get(obj, 'spec.storageClassName');
  const [Modal, modalProps, launchModal] = useModalLauncher(extraMap);
  return (
    <>
      <Modal {...modalProps} />
      <div className="odf-m-pane__body">
        <SectionHeading text={t('Object Bucket Claim Details')} />
        <div className="row">
          <div className="col-sm-6">
            <ResourceSummary
              resource={obj}
              launchModal={launchModal}
              resourceModel={NooBaaObjectBucketClaimModel}
            />
            {isBound(obj) && (
              <>
                <dt>{t('Secret')}</dt>
                <dd>
                  <ResourceLink
                    kind="Secret"
                    name={obj.metadata.name}
                    namespace={obj.metadata.namespace}
                  />
                </dd>
              </>
            )}
          </div>
          <div className="col-sm-6">
            <dt>{t('Status')}</dt>
            <dd>
              <OBCStatus obc={obj} />
            </dd>
            <dt>{t('StorageClass')}</dt>
            <dd>
              {storageClassName ? (
                <ResourceLink kind="StorageClass" name={storageClassName} />
              ) : (
                '-'
              )}
            </dd>
            {isBound(obj) && (
              <>
                <dt>{t('Object Bucket')}</dt>
                <dd>
                  <ResourceLink
                    dataTest="ob-link"
                    kind={referenceForModel(NooBaaObjectBucketModel)}
                    name={obj.spec.objectBucketName}
                  />
                </dd>
              </>
            )}
          </div>
        </div>
      </div>
      <GetSecret obj={obj} />
    </>
  );
};

export const OBCDetailsPage: React.FC<ObjectBucketClaimDetailsPageProps> = ({
  match,
  namespace,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const { name, plural: kind } = match.params;
  const [resource, loaded] = useK8sWatchResource<K8sResourceKind>({
    kind,
    name,
    namespace,
    isList: false,
  });

  const [Modal, modalProps, launchModal] = useModalLauncher(extraMap);

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        launchModal={launchModal}
        extraProps={{
          resource,
          resourceModel: NooBaaObjectBucketClaimModel,
          namespace,
        }}
        customKebabItems={(t) => ({
          ATTACH_DEPLOYMENT: t('Attach to Deployment'),
        })}
      />
    );
  }, [launchModal, resource, namespace]);

  const breadcrumbs = [
    {
      name: t('ObjectBucketClaims'),
      path: `/k8s/ns/${namespace}/${referenceForModel(
        NooBaaObjectBucketClaimModel
      )}/`,
    },
    {
      name: t('ObjectBucketClaim details'),
      path: '',
    },
  ];

  return (
    <>
      <Modal {...modalProps} />
      {loaded ? (
        <DetailsPage
          breadcrumbs={breadcrumbs}
          actions={actions}
          resourceModel={NooBaaObjectBucketClaimModel}
          resource={resource}
          pages={[
            {
              href: '',
              name: 'Details',
              component: OBCDetails as any,
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

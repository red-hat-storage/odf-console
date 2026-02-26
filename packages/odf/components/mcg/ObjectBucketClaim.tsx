import * as React from 'react';
import { NooBaaObjectBucketClaimModel } from '@odf/shared';
import { NooBaaObjectBucketModel } from '@odf/shared';
import DetailsPage, {
  ResourceSummary,
} from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { Kebab } from '@odf/shared/kebab/kebab';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { Status } from '@odf/shared/status/Status';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel, ALL_NAMESPACES_KEY } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  ResourceLink as ResourceLinkWithKind,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import { ATTACH_DEPLOYMENT } from '../../constants';
import { getPhase, isBound, obcStatusFilter } from '../../utils';
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
  { className: Kebab.columnClass, id: '' },
];

type ObjectBucketClaimsListProps = {
  data: K8sResourceKind[];
  unfilteredData: K8sResourceKind[];
  loaded: boolean;
  loadError: any;
  rowData?: any;
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
  const { t } = useCustomTranslation();
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
  namespace: string;
};

const OBCRow: React.FC<RowProps<K8sResourceKind, CustomData>> = ({
  obj,
  activeColumnIDs,
}) => {
  const { t } = useCustomTranslation();
  const storageClassName = _.get(obj, 'spec.storageClassName');
  const path = `/odf/resource/ns/${obj.metadata.namespace}/${referenceForModel(
    NooBaaObjectBucketClaimModel
  )}/${obj.metadata.name}`;
  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          resourceModel={NooBaaObjectBucketClaimModel}
          resourceName={obj.metadata.name}
          link={path}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <ResourceLinkWithKind kind="Namespace" name={obj.metadata.namespace} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <OBCStatus obc={obj} />
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {isBound(obj) ? (
          <ResourceLinkWithKind
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
          <ResourceLinkWithKind kind="StorageClass" name={storageClassName} />
        ) : (
          '-'
        )}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          extraProps={{
            resource: obj,
            resourceModel: NooBaaObjectBucketClaimModel,
            namespace: obj.metadata.namespace,
          }}
          customKebabItems={[
            {
              key: ATTACH_DEPLOYMENT,
              value: t('Attach to Deployment'),
              component: React.lazy(
                () =>
                  import('../../modals/attach-deployment/attach-deployment-obc-modal')
              ),
            },
          ]}
          terminatingTooltip={t(
            'Disabled because the ObjectBucketClaim is being deleted.'
          )}
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

export const OBCListPage: React.FC<ObjectBucketClaimsPageProps> = (props) => {
  const { t } = useCustomTranslation();

  const [namespace] = useActiveNamespace();
  const { selector } = props;

  const [obc, loaded, loadError] = useK8sWatchResource<K8sResourceKind[]>({
    kind: referenceForModel(NooBaaObjectBucketClaimModel),
    isList: true,
    selector,
    ...(namespace !== ALL_NAMESPACES_KEY ? { namespace } : {}),
  });

  const rowFilters = React.useMemo(() => [obcStatusFilter(t)], [t]);
  const [data, filteredData, onFilterChange] = useListPageFilter(
    obc,
    rowFilters
  );

  const createLink =
    '/odf/resource/objectbucket.io~v1alpha1~ObjectBucketClaim/create/~new';

  return (
    <>
      <ListPageHeader title="">
        <ListPageCreateLink to={createLink}>
          {t('Create ObjectBucketClaim')}
        </ListPageCreateLink>
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
        />
      </ListPageBody>
    </>
  );
};

type OBCDetailsProps = {
  obj?: K8sResourceKind;
};

export const OBCDetails: React.FC<OBCDetailsProps> = ({ obj }) => {
  const { t } = useCustomTranslation();
  const storageClassName = _.get(obj, 'spec.storageClassName');
  return (
    <>
      <div className="odf-m-pane__body">
        <SectionHeading text={t('Object Bucket Claim Details')} />
        <div className="row">
          <div className="col-sm-6">
            <ResourceSummary
              resource={obj}
              resourceModel={NooBaaObjectBucketClaimModel}
            />
          </div>
          <div className="col-sm-6">
            <DescriptionList>
              {isBound(obj) && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Secret')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <ResourceLinkWithKind
                      kind="Secret"
                      name={obj.metadata.name}
                      namespace={obj.metadata.namespace}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}

              <DescriptionListGroup>
                <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <OBCStatus obc={obj} />
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('StorageClass')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {storageClassName ? (
                    <ResourceLinkWithKind
                      kind="StorageClass"
                      name={storageClassName}
                    />
                  ) : (
                    '-'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>

              {isBound(obj) && (
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Object Bucket')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    <ResourceLinkWithKind
                      dataTest="ob-link"
                      kind={referenceForModel(NooBaaObjectBucketModel)}
                      name={obj.spec.objectBucketName}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
          </div>
        </div>
      </div>
      <GetSecret obj={obj} />
    </>
  );
};

export const OBCDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { resourceName: name, namespace } = useParams();
  const [resource, loaded] = useK8sWatchResource<K8sResourceKind>({
    kind: referenceForModel(NooBaaObjectBucketClaimModel),
    name,
    namespace,
    isList: false,
  });

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        extraProps={{
          resource,
          resourceModel: NooBaaObjectBucketClaimModel,
          namespace,
        }}
        customKebabItems={[
          {
            key: ATTACH_DEPLOYMENT,
            value: t('Attach to Deployment'),
            component: React.lazy(
              () =>
                import('../../modals/attach-deployment/attach-deployment-obc-modal')
            ),
          },
        ]}
      />
    );
  }, [resource, namespace, t]);

  const breadcrumbs = [
    {
      name: t('Object Storage'),
      path: '/odf/object-storage',
    },
    {
      name: t('ObjectBucketClaims'),
      path: `/odf/object-storage/objectbucket.io~v1alpha1~ObjectBucketClaim`,
    },
    {
      name: t('ObjectBucketClaim details'),
      path: '',
    },
  ];

  return loaded ? (
    <DetailsPage
      breadcrumbs={breadcrumbs}
      actions={actions}
      resourceModel={NooBaaObjectBucketClaimModel}
      resource={resource}
      pages={[
        {
          href: '',
          name: t('Details'),
          component: OBCDetails as any,
        },
        {
          href: 'yaml',
          name: t('YAML'),
          component: YAMLEditorWrapped,
        },
        {
          href: 'events',
          name: t('Events'),
          component: EventStreamWrapped,
        },
      ]}
    />
  ) : (
    <LoadingBox />
  );
};

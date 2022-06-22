import * as React from 'react';
import { Kebab } from '@odf/shared/kebab/kebab';
import {
  LaunchModal,
  useModalLauncher,
  ModalKeys,
} from '@odf/shared/modals/modalLauncher';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
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
import { Trans } from 'react-i18next';
import { useHistory } from 'react-router';
import { sortable, wrappable } from '@patternfly/react-table';
import {
  REPLICATION_TYPE,
  Actions,
  HUB_CLUSTER_NAME,
} from '../../../constants';
import { DRPolicyModel, DRPlacementControlModel } from '../../../models';
import { DRPolicyKind, DRPlacementControlKind } from '../../../types';
import EmptyPage from '../../empty-state-page/empty-page';
import { DRPolicyActions } from '../drpolicy-actions/policy-actions';
import { ApplicationStatus } from './application-status';
import './drpolicy-list-page.scss';

type CustomData = {
  launchModal: LaunchModal;
};

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
  { className: 'dropdown-kebab-pf pf-c-table__action', id: '' },
];

const DRPolicyRow: React.FC<RowProps<DRPolicyKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { launchModal } = rowData;
  const { t } = useCustomTranslation();

  const clusterNames = obj?.spec?.drClusters?.map((clusterName) => (
    <p key={clusterName}> {clusterName} </p>
  ));
  const condition = obj?.status?.conditions?.find(
    (condition) => condition.type === 'Validated'
  );

  const [filteredDRPlacementControl, setFilteredDRPlacementControl] =
    React.useState<DRPlacementControlKind[]>([]);
  const [
    drPlacementControls,
    drPlacementsControlLoaded,
    drPlacementsControlLoadError,
  ] = useK8sWatchResource<DRPlacementControlKind[]>({
    kind: referenceForModel(DRPlacementControlModel),
    isList: true,
    namespaced: true,
    cluster: HUB_CLUSTER_NAME,
  });

  React.useEffect(() => {
    if (drPlacementsControlLoaded && !drPlacementsControlLoadError) {
      setFilteredDRPlacementControl(
        drPlacementControls?.filter(
          (drPlacementControl) =>
            drPlacementControl?.spec?.drPolicyRef?.name === obj?.metadata?.name
        ) ?? []
      );
    }
  }, [
    drPlacementControls,
    drPlacementsControlLoaded,
    drPlacementsControlLoadError,
    obj?.metadata?.name,
  ]);

  const kebabActionItems = () => [
    {
      key: ModalKeys.DELETE,
      value: Actions(t).DELETE_DR_POLICY,
      props: filteredDRPlacementControl?.length
        ? {
            description: t('Cannot delete while connected to an application'),
            isDisabled: true,
          }
        : {},
    },
    {
      key: Actions(t).APPLY_DR_POLICY,
      value: Actions(t).APPLY_DR_POLICY,
    },
  ];

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {obj?.metadata?.name}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {condition?.status === 'True' ? t('Validated') : t('Not Validated')}
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {clusterNames}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {obj?.spec?.schedulingInterval !== '0m'
          ? REPLICATION_TYPE.ASYNC
          : REPLICATION_TYPE.SYNC}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {<ApplicationStatus drPlacementControls={filteredDRPlacementControl} />}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          launchModal={launchModal}
          extraProps={{
            resource: obj,
            resourceModel: DRPolicyModel,
            cluster: HUB_CLUSTER_NAME,
          }}
          customKebabItems={kebabActionItems}
        />
      </TableData>
    </>
  );
};

const DRPolicyList: React.FC<DRPolicyListProps> = (props) => {
  const { t } = useCustomTranslation();

  const Header = React.useMemo<TableColumn<DRPolicyKind>[]>(
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
        title: t('Connected applications'),
        transforms: [wrappable],
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

export const DRPolicyListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const history = useHistory();
  const [ModalComponent, props, launchModal] = useModalLauncher(
    DRPolicyActions(t)
  );
  const createProps = `/multicloud/data-services/data-policies/${referenceForModel(
    DRPolicyModel
  )}/~new`;

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>({
      kind: referenceForModel(DRPolicyModel),
      isList: true,
      namespaced: false,
      cluster: HUB_CLUSTER_NAME,
    });

  const [data, filteredData, onFilterChange] = useListPageFilter(drPolicies);

  return (
    <>
      {drPoliciesLoaded &&
        (drPolicies.length === 0 || drPoliciesLoadError ? (
          <EmptyPage
            title={t('No disaster recovery policies yet')}
            buttonText={t('Create DRPolicy')}
            onClick={() => history.push(createProps)}
          >
            <Trans t={t}>
              Configure recovery to your failover cluster with a disaster
              recovery policy.
              <br />
              Click the <strong>Create DRPolicy</strong> button to get started.
            </Trans>
          </EmptyPage>
        ) : (
          <>
            <ModalComponent {...props} />
            <ListPageBody>
              <div className="mco-drpolicy-list__header">
                <ListPageFilter
                  data={data}
                  loaded={drPoliciesLoaded}
                  onFilterChange={onFilterChange}
                  hideColumnManagement={true}
                />
                <div className="mco-drpolicy-list__createlink">
                  <ListPageCreateLink to={createProps}>
                    {t('Create DRPolicy')}
                  </ListPageCreateLink>
                </div>
              </div>
              <DRPolicyList
                data={filteredData as DRPolicyKind[]}
                unfilteredData={drPolicies}
                loaded={drPoliciesLoaded}
                loadError={drPoliciesLoadError}
                rowData={{ launchModal }}
              />
            </ListPageBody>
          </>
        ))}
    </>
  );
};

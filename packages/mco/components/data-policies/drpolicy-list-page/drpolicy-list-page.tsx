import * as React from 'react';
import { Kebab } from '@odf/shared/kebab/kebab';
import {
  LaunchModal,
  useModalLauncher,
} from '@odf/shared/modals/modalLauncher';
import { ModalKeys } from '@odf/shared/modals/modalLauncher';
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
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { sortable, wrappable } from '@patternfly/react-table';
import { DRPolicyModel, DRPlacementControlModel } from '../../../models';
import { DRPolicyKind, DRPlacementControlKind } from '../../../types';
import { DRPolicyActions, Actions} from '../drpolicy-actions/policy-actions';
import { ApplicationStatus } from './application-status';

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
  
  const [drPlacementControlList, setDRPlacementControl] = React.useState<DRPlacementControlKind[]>([]);
  const [drPlacementControls, drPlacementsControlLoaded, drPlacementsControlLoadError] = useK8sWatchResource<DRPlacementControlKind[]>({
    kind: referenceForModel(DRPlacementControlModel),
    isList: true,
    namespace: true,
  });

  React.useEffect(() => {
    if(drPlacementsControlLoaded && !drPlacementsControlLoadError){
      const filteredDRPolicyControl = drPlacementControls?.filter((drPlacementControl) => drPlacementControl?.spec?.drPolicyRef?.name === obj?.metadata?.name);
      setDRPlacementControl(filteredDRPolicyControl);
    };
  }, [drPlacementControls, drPlacementsControlLoaded, drPlacementsControlLoadError,  obj?.metadata?.name]);

  const kebabActionItems = (t: TFunction) => ({
    [Actions.APPLY_DR_POLICY]: {
      label: Actions.APPLY_DR_POLICY,
    },
    [ModalKeys.DELETE]: {
      label: Actions.DELETE_DR_POLICY,
      props: drPlacementControlList?.length ? {
        description: "Cannot delete while connected to an application",
        isDisabled: true,
      } : {}
    },
  });



  return (
      <>
        <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
          {obj?.metadata?.name}
        </TableData>
        <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
          {obj?.status?.conditions?.type}
        </TableData>
        <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
          {""}
        </TableData>
        <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
          {""}
        </TableData>
        <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
          <ApplicationStatus drPlacementControls={drPlacementControlList}/>
        </TableData>
        <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
          <Kebab
            launchModal={launchModal}
            extraProps={{ resource: obj, resourceModel: DRPolicyModel}}
            customKebabItems={kebabActionItems}
          />
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
  rowData: any;
};

export const DRPolicyListPage: React.FC<RouteComponentProps> = () => {
  const { t } = useTranslation('plugin__odf-console');

  const [ModalComponent, props, launchModal] = useModalLauncher(DRPolicyActions);

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
     <ModalComponent {...props} />
      <ListPageHeader title="DR Policies">
      {(
          <ListPageCreateLink to={createProps}>
            {t('Create DRPolicy')}
          </ListPageCreateLink>
        )}
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
          rowData={{launchModal }}
        />
      </ListPageBody>
    </>
  );
};

import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useAccessReview } from '@odf/shared/hooks/rbac-hook';
import { Kebab } from '@odf/shared/kebab/kebab';
import {
  LaunchModal,
  useModalLauncher,
} from '@odf/shared/modals/modalLauncher';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  VirtualizedTable,
  useListPageFilter,
  ListPageFilter,
  TableData,
  RowProps,
  useActiveColumns,
  TableColumn,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useHistory, useLocation } from 'react-router';
import { HUB_CLUSTER_NAME } from '../../../constants';
import {
  ApplicationRefKind,
  getDRPolicyResourceObj,
  useApplicationsWatch,
} from '../../../hooks';
import { DRPolicyModel } from '../../../models';
import { DRPolicyKind } from '../../../types';
import { getReplicationType, findAppsUsingDRPolicy } from '../../../utils';
import EmptyPage from '../../empty-state-page/empty-page';
import { ConnectedApplicationsModal } from '../../modals/connected-apps-modal/connected-apps-modal';
import {
  DRPolicyActions,
  Header,
  kebabActionItems,
  tableColumnInfo,
} from './helper';
import './drpolicy-list-page.scss';

const DRPolicyRow: React.FC<RowProps<DRPolicyKind, RowData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();
  const {
    canDeleteDRPolicy,
    appsLoadError,
    appsLoaded,
    setLinkedApps,
    applicationRefs,
    launchModal,
    openModal,
  } = rowData;

  const clusterNames = obj?.spec?.drClusters?.map((clusterName) => (
    <p key={clusterName}> {clusterName} </p>
  ));
  const condition = obj?.status?.conditions?.find(
    (statusCondition) => statusCondition.type === 'Validated'
  );
  const filteredApps = findAppsUsingDRPolicy(applicationRefs, obj);
  const appCount = filteredApps?.length;

  const onClick = () => {
    openModal(true);
    setLinkedApps(filteredApps);
  };

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
        {getReplicationType(obj?.spec?.schedulingInterval, t)}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {appCount > 0 ? (
          <a onClick={onClick}>
            {pluralize(appCount, t('Application'), t('Applications'), true)}
          </a>
        ) : (
          '-'
        )}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          launchModal={launchModal}
          extraProps={{
            resource: obj,
            resourceModel: DRPolicyModel,
            cluster: HUB_CLUSTER_NAME,
          }}
          customKebabItems={kebabActionItems(
            canDeleteDRPolicy,
            appCount,
            appsLoaded,
            appsLoadError
          )}
        />
      </TableData>
    </>
  );
};

const DRPolicyList: React.FC<DRPolicyListProps> = (props) => {
  const { t } = useCustomTranslation();
  const [columns] = useActiveColumns({
    columns: React.useMemo<TableColumn<DRPolicyKind>[]>(() => Header(t), [t]),
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

export const DRPolicyListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());
  const [applicationRefs, appsLoaded, appsLoadError] = useApplicationsWatch();
  const [ModalComponent, props, launchModal] =
    useModalLauncher(DRPolicyActions);
  const [isModalOpen, setConnectedAppsModalOpen] = React.useState(false);
  const [linkedApps, setLinkedApps] = React.useState<ApplicationRefKind[]>([]);

  const location = useLocation();
  const drPolicyListPagePath = location.pathname.replace(/\/$/, '');
  const drPolicyCreatePagePath = `${drPolicyListPagePath}/${referenceForModel(
    DRPolicyModel
  )}/~new`;

  const [canDeleteDRPolicy] = useAccessReview(
    {
      group: DRPolicyModel?.apiGroup,
      resource: DRPolicyModel?.plural,
      namespace: null,
      verb: 'delete',
    },
    HUB_CLUSTER_NAME
  );
  const [data, filteredData, onFilterChange] = useListPageFilter(drPolicies);
  const history = useHistory();

  const openModal = () => setConnectedAppsModalOpen(true);
  const closeModal = () => setConnectedAppsModalOpen(false);

  return (
    <>
      <ModalComponent {...props} />
      <ConnectedApplicationsModal
        applicationRefs={linkedApps}
        onClose={closeModal}
        isOpen={isModalOpen}
      />
      {drPolicies?.length === 0 ? (
        <EmptyPage
          title={t('No disaster recovery policies yet')}
          buttonText={t('Create DRPolicy')}
          canAccess={!drPoliciesLoadError && drPoliciesLoaded}
          t={t}
          onClick={() => history.push(drPolicyCreatePagePath)}
        >
          <Trans t={t}>
            Configure recovery to your failover cluster with a disaster recovery
            policy.
            <br />
            Click the <strong>Create DRPolicy</strong> button to get started.
          </Trans>
        </EmptyPage>
      ) : (
        <>
          <ListPageBody>
            <div className="mco-drpolicy-list__header">
              <ListPageFilter
                data={data}
                loaded={!!drPolicies?.length}
                onFilterChange={onFilterChange}
                hideColumnManagement={true}
              />
              <div className="mco-drpolicy-list__createlink">
                <ListPageCreateLink
                  to={drPolicyCreatePagePath}
                  createAccessReview={{
                    groupVersionKind: referenceForModel(DRPolicyModel),
                  }}
                >
                  {t('Create DRPolicy')}
                </ListPageCreateLink>
              </div>
            </div>
            <DRPolicyList
              data={filteredData}
              unfilteredData={drPolicies}
              loaded={drPoliciesLoaded}
              loadError={drPoliciesLoadError}
              rowData={{
                canDeleteDRPolicy,
                appsLoaded,
                appsLoadError,
                applicationRefs,
                launchModal,
                setLinkedApps,
                openModal,
              }}
            />
          </ListPageBody>
        </>
      )}
    </>
  );
};

type RowData = {
  canDeleteDRPolicy: boolean;
  appsLoaded: boolean;
  appsLoadError: any;
  applicationRefs: ApplicationRefKind[];
  launchModal: LaunchModal;
  setLinkedApps: React.Dispatch<React.SetStateAction<ApplicationRefKind[]>>;
  openModal: (boolean) => void;
};

type DRPolicyListProps = {
  data: DRPolicyKind[];
  unfilteredData: DRPolicyKind[];
  loaded: boolean;
  loadError: any;
  rowData?: RowData;
};

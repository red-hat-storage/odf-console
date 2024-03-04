import * as React from 'react';
import { DASH } from '@odf/shared/constants';
import { formatTime } from '@odf/shared/details-page/datetime';
import { useScheduler } from '@odf/shared/hooks';
import { PaginatedsListPage } from '@odf/shared/list-page';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName } from '@odf/shared/selectors';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  useListPageFilter,
  useK8sWatchResource,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { global_palette_black_900 as blackIconColor } from '@patternfly/react-tokens/dist/js/global_palette_black_900';
import classNames from 'classnames';
import {
  useNavigate,
  NavigateFunction,
  Link,
} from 'react-router-dom-v5-compat';
import { InProgressIcon, CubeIcon, IconSize } from '@patternfly/react-icons';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { ODFMCO_OPERATOR_NAMESPACE } from '../../constants';
import {
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '../../hooks';
import { DRPlacementControlModel } from '../../models';
import { DRPlacementControlKind, DRPolicyKind } from '../../types';
import { getLastAppDeploymentClusterName, getDRPolicyName } from '../../utils';
import {
  EmptyRowMessage,
  NoDataMessage,
  AlertMessages,
  EXPANDABLE_COMPONENT_TYPE,
  SyncStatus,
  ExpandableComponentProps,
  ExpandableComponentsMap,
  SelectExpandable,
  EnrollApplicationButton,
} from './components';
import {
  getHeaderColumns,
  getColumnNames,
  getRowActions,
  getReplicationHealth,
  isFailingOrRelocating,
  ReplicationHealthMap,
  getAppWorstSyncStatus,
  SyncStatusInfo,
  drpcDetailsPageRoute,
} from './utils';
import './protected-apps.scss';

type RowExtraProps = {
  launcher: LaunchModal;
  navigate: NavigateFunction;
  syncStatus: SyncStatus;
};

const ProtectedAppsTableRow: React.FC<
  RowComponentType<DRPlacementControlKind>
> = ({ row: application, rowIndex, extraProps }) => {
  const { t } = useCustomTranslation();
  const [expandableComponentType, setExpandableComponentType] = React.useState(
    EXPANDABLE_COMPONENT_TYPE.DEFAULT
  );

  const columnNames = getColumnNames(t);
  const appName = getName(application);
  const drPolicyName = getDRPolicyName(application);
  const { launcher, navigate, syncStatus }: RowExtraProps = extraProps;

  const onTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    buttonRef: React.MutableRefObject<HTMLElement>
  ) => {
    const tabKey = buttonRef.current.id as EXPANDABLE_COMPONENT_TYPE;
    tabKey === expandableComponentType
      ? // collapse the expandable section
        setExpandableComponentType(EXPANDABLE_COMPONENT_TYPE.DEFAULT)
      : // render new selected expandable section
        setExpandableComponentType(tabKey);
  };

  const isExpanded: boolean =
    expandableComponentType !== EXPANDABLE_COMPONENT_TYPE.DEFAULT;

  // Enrolled/protected namespaces details
  const enrolledNamespaces: string[] =
    // ToDo: Update with correct spec field which will report all protected namespaces
    // @ts-ignore
    application.spec?.enrolledNamespace || [];

  // ToDo: Add clean-up activity event as well
  const showEventsDetails: boolean =
    isFailingOrRelocating(application) ||
    expandableComponentType === EXPANDABLE_COMPONENT_TYPE.EVENTS;
  const eventsCount: number = isFailingOrRelocating(application) ? 1 : 0;

  // Overall sync status details (replication health)
  const syncStatusInfo: SyncStatusInfo =
    syncStatus[appName] || ({} as SyncStatusInfo);
  const { icon, title }: ReplicationHealthMap = getAppWorstSyncStatus(
    syncStatusInfo,
    t
  );

  // Expandable section
  const ExpandableComponent: React.FC<ExpandableComponentProps> =
    ExpandableComponentsMap[expandableComponentType];

  return (
    <>
      <Tr translate={null}>
        <Td
          translate={null}
          expand={{
            rowIndex,
            isExpanded: isExpanded,
            // only allowing collapse from here, we can expand from respective "SelectExpandable" FC
            onToggle: () =>
              isExpanded &&
              setExpandableComponentType(EXPANDABLE_COMPONENT_TYPE.DEFAULT),
            expandId: 'expandable-table',
          }}
        />
        <Td translate={null} dataLabel={columnNames[1]}>
          <ResourceLink
            resourceModel={DRPlacementControlModel}
            resourceName={appName}
            link={drpcDetailsPageRoute(application)}
          />
        </Td>
        <Td translate={null} dataLabel={columnNames[2]}>
          <SelectExpandable
            title={
              <div>
                <CubeIcon size={IconSize.sm} color={blackIconColor.value} />
                <span className="pf-u-pl-sm">{enrolledNamespaces.length}</span>
              </div>
            }
            tooltipContent={t('View namespaces')}
            onSelect={onTabSelect}
            buttonId={EXPANDABLE_COMPONENT_TYPE.NS}
            className={classNames({
              'mco-protected-applications__expanded':
                expandableComponentType === EXPANDABLE_COMPONENT_TYPE.NS,
            })}
          />
          {showEventsDetails && (
            <SelectExpandable
              title={
                <div>
                  <InProgressIcon
                    size={IconSize.sm}
                    color={blackIconColor.value}
                  />
                  <span className="pf-u-pl-sm">{eventsCount}</span>
                </div>
              }
              tooltipContent={t('View activity')}
              onSelect={onTabSelect}
              buttonId={EXPANDABLE_COMPONENT_TYPE.EVENTS}
              className={classNames({
                'mco-protected-applications__expanded':
                  expandableComponentType === EXPANDABLE_COMPONENT_TYPE.EVENTS,
                'pf-u-pl-lg': true,
              })}
            />
          )}
        </Td>
        <Td translate={null} dataLabel={columnNames[3]}>
          <SelectExpandable
            title={
              <div>
                {icon}
                <span className="pf-u-pl-sm">{title}</span>
              </div>
            }
            tooltipContent={t('See detailed information')}
            onSelect={onTabSelect}
            buttonId={EXPANDABLE_COMPONENT_TYPE.STATUS}
            className={classNames({
              'mco-protected-applications__expanded':
                expandableComponentType === EXPANDABLE_COMPONENT_TYPE.STATUS,
            })}
          />
        </Td>
        <Td translate={null} dataLabel={columnNames[4]}>
          <Link
            to={`/multicloud/data-services/disaster-recovery/policies?name=${drPolicyName}`}
          >
            {drPolicyName}
          </Link>
        </Td>
        <Td translate={null} dataLabel={columnNames[5]}>
          {getLastAppDeploymentClusterName(application) || DASH}
        </Td>
        <Td translate={null} isActionCell>
          <ActionsColumn
            items={getRowActions(t, launcher, navigate, application)}
          />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr translate={null}>
          <Td translate={null} colSpan={Object.keys(columnNames).length + 1}>
            <ExpandableComponent
              application={application}
              syncStatusInfo={syncStatusInfo}
            />
          </Td>
        </Tr>
      )}
    </>
  );
};

export const ProtectedApplicationsListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const launcher = useModal();
  const navigate = useNavigate();

  const [syncStatus, setSyncStatus] = React.useState({} as SyncStatus);

  const [discoveredApps, discoveredAppsLoaded, discoveredAppsError] =
    useK8sWatchResource<DRPlacementControlKind[]>(
      getDRPlacementControlResourceObj({
        // ToDo: Update this namespace with correct imperative apps namespace
        namespace: ODFMCO_OPERATOR_NAMESPACE,
      })
    );
  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

  const isAllLoaded = discoveredAppsLoaded && drPoliciesLoaded;
  const anyError = discoveredAppsError || drPoliciesLoadError;
  const isAllLoadedWOAnyError = isAllLoaded && !anyError;

  const [data, filteredData, onFilterChange] = useListPageFilter(
    discoveredApps || []
  );

  const updateSyncStatus = React.useCallback(() => {
    if (isAllLoadedWOAnyError) {
      const syncStatusMap: SyncStatus = data.reduce((acc, app) => {
        const volumesSchedulingInterval = drPolicies.find(
          (policy) => getName(policy) === app.spec?.drPolicyRef?.name
        )?.spec?.schedulingInterval;
        const volumesLastSyncTime = app?.status?.lastGroupSyncTime;
        const kubeObjectsSchedulingInterval =
          app.spec?.kubeObjectProtection?.captureInterval;
        // ToDo: Update with correct status field which will report kube object last sync time
        // @ts-ignore
        const kubeObjectsLastSyncTime = app?.status?.lastKubeObjectSyncTime;
        acc[getName(app)] = {
          volumeReplicationStatus: getReplicationHealth(
            volumesLastSyncTime,
            volumesSchedulingInterval
          ),
          volumeLastGroupSyncTime: formatTime(volumesLastSyncTime) || DASH,
          kubeObjectReplicationStatus: getReplicationHealth(
            kubeObjectsLastSyncTime,
            kubeObjectsSchedulingInterval
          ),
          kubeObjectLastSyncTime: formatTime(kubeObjectsLastSyncTime) || DASH,
        };

        return acc;
      }, {} as SyncStatus);

      setSyncStatus(syncStatusMap);
    }
  }, [data, drPolicies, isAllLoadedWOAnyError]);

  useScheduler(updateSyncStatus);

  return (
    <PaginatedsListPage
      filteredData={filteredData}
      CreateButton={EnrollApplicationButton}
      Alerts={AlertMessages}
      noData={!isAllLoadedWOAnyError || !data.length}
      listPageFilterProps={{
        data: data,
        loaded: isAllLoaded,
        onFilterChange: onFilterChange,
      }}
      composableTableProps={{
        columns: getHeaderColumns(t),
        RowComponent: ProtectedAppsTableRow,
        extraProps: { launcher, navigate, syncStatus },
        emptyRowMessage: EmptyRowMessage,
        unfilteredData: data as [],
        noDataMsg: NoDataMessage,
        loaded: isAllLoaded,
        loadError: anyError,
      }}
    />
  );
};

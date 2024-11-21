import * as React from 'react';
import { DASH } from '@odf/shared/constants';
import { formatTime } from '@odf/shared/details-page/datetime';
import { useScheduler } from '@odf/shared/hooks';
import { PaginatedListPage } from '@odf/shared/list-page';
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
import { Icon } from '@patternfly/react-core';
import { InProgressIcon, CubeIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { DR_BASE_ROUTE, DISCOVERED_APP_NS } from '../../constants';
import {
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '../../hooks';
import { DRPlacementControlModel } from '../../models';
import { DRPlacementControlKind, DRPolicyKind } from '../../types';
import {
  getLastAppDeploymentClusterName,
  getDRPolicyName,
  getReplicationType,
  getReplicationHealth,
} from '../../utils';
import {
  EmptyRowMessage,
  NoDataMessage,
  AlertMessages,
  ExpandableComponentType,
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
  isFailingOrRelocating,
  ReplicationHealthMap,
  getAppWorstSyncStatus,
  SyncStatusInfo,
  drpcDetailsPageRoute,
  isCleanupPending,
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
    ExpandableComponentType.DEFAULT
  );

  const columnNames = getColumnNames(t);
  const appName = getName(application);
  const drPolicyName = getDRPolicyName(application);
  const { launcher, navigate, syncStatus }: RowExtraProps = extraProps;

  const onTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    buttonRef: React.MutableRefObject<HTMLElement>
  ) => {
    const tabKey = buttonRef.current.id as ExpandableComponentType;
    tabKey === expandableComponentType
      ? // collapse the expandable section
        setExpandableComponentType(ExpandableComponentType.DEFAULT)
      : // render new selected expandable section
        setExpandableComponentType(tabKey);
  };

  const isExpanded: boolean =
    expandableComponentType !== ExpandableComponentType.DEFAULT;

  // Enrolled/protected namespaces details
  const enrolledNamespaces: string[] =
    application.spec?.protectedNamespaces || [];

  // Failover/Relocate/Cleanup event details
  const anyOnGoingEvent =
    isFailingOrRelocating(application) || isCleanupPending(application);
  const showEventsDetails: boolean =
    anyOnGoingEvent ||
    expandableComponentType === ExpandableComponentType.EVENTS;
  const eventsCount: number = anyOnGoingEvent ? 1 : 0;

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
      <Tr>
        <Td
          data-test="expand-button"
          expand={{
            rowIndex,
            isExpanded: isExpanded,
            // only allowing collapse from here, we can expand from respective "SelectExpandable" FC
            onToggle: () =>
              isExpanded &&
              setExpandableComponentType(ExpandableComponentType.DEFAULT),
            expandId: 'expandable-table',
          }}
        />
        <Td dataLabel={columnNames[1]}>
          <ResourceLink
            resourceModel={DRPlacementControlModel}
            resourceName={appName}
            link={drpcDetailsPageRoute(application)}
          />
        </Td>
        <Td dataLabel={columnNames[2]}>
          <SelectExpandable
            title={
              <div>
                <Icon size="sm">
                  <CubeIcon color={blackIconColor.value} />
                </Icon>
                <span className="pf-v5-u-pl-sm">
                  {enrolledNamespaces.length}
                </span>
              </div>
            }
            tooltipContent={t('View namespaces')}
            onSelect={onTabSelect}
            buttonId={ExpandableComponentType.NS}
            className={classNames({
              'mco-protected-applications__expanded':
                expandableComponentType === ExpandableComponentType.NS,
            })}
          />
          {showEventsDetails && (
            <SelectExpandable
              title={
                <div>
                  <Icon size="sm">
                    <InProgressIcon color={blackIconColor.value} />
                  </Icon>
                  <span className="pf-v5-u-pl-sm">{eventsCount}</span>
                </div>
              }
              tooltipContent={t('View activity')}
              onSelect={onTabSelect}
              buttonId={ExpandableComponentType.EVENTS}
              className={classNames({
                'mco-protected-applications__expanded':
                  expandableComponentType === ExpandableComponentType.EVENTS,
                'pf-v5-u-pl-lg': true,
              })}
            />
          )}
        </Td>
        <Td dataLabel={columnNames[3]}>
          <SelectExpandable
            title={
              <div>
                {icon}
                <span className="pf-v5-u-pl-sm">{title}</span>
              </div>
            }
            tooltipContent={t('See detailed information')}
            onSelect={onTabSelect}
            buttonId={ExpandableComponentType.STATUS}
            className={classNames({
              'mco-protected-applications__expanded':
                expandableComponentType === ExpandableComponentType.STATUS,
            })}
          />
        </Td>
        <Td dataLabel={columnNames[4]}>
          <Link
            to={`${DR_BASE_ROUTE}/policies?name=${drPolicyName}`}
            data-test={`link-${drPolicyName}`}
          >
            {drPolicyName}
          </Link>
        </Td>
        <Td dataLabel={columnNames[5]}>
          {getLastAppDeploymentClusterName(application) || DASH}
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={getRowActions(t, launcher, navigate, application)}
          />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr>
          <Td colSpan={Object.keys(columnNames).length + 1}>
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
        namespace: DISCOVERED_APP_NS,
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
        const replicationType = getReplicationType(volumesSchedulingInterval);
        const volumesLastSyncTime = app?.status?.lastGroupSyncTime;
        const kubeObjectsSchedulingInterval =
          app.spec?.kubeObjectProtection?.captureInterval;
        const kubeObjectLastProtectionTime =
          app?.status?.lastKubeObjectProtectionTime;
        acc[getName(app)] = {
          volumeReplicationType: getReplicationType(volumesSchedulingInterval),
          volumeReplicationStatus: getReplicationHealth(
            volumesLastSyncTime,
            volumesSchedulingInterval,
            replicationType
          ),
          volumeLastGroupSyncTime: formatTime(volumesLastSyncTime),
          kubeObjectReplicationStatus: getReplicationHealth(
            kubeObjectLastProtectionTime,
            kubeObjectsSchedulingInterval,
            replicationType
          ),
          kubeObjectLastProtectionTime: formatTime(
            kubeObjectLastProtectionTime
          ),
          replicationType,
        };

        return acc;
      }, {} as SyncStatus);

      setSyncStatus(syncStatusMap);
    }
  }, [data, drPolicies, isAllLoadedWOAnyError]);

  useScheduler(updateSyncStatus);

  return (
    <PaginatedListPage
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

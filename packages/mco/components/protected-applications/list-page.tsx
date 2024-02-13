import * as React from 'react';
import { DASH } from '@odf/shared/constants';
import { formatTime } from '@odf/shared/details-page/datetime';
import { useScheduler } from '@odf/shared/hooks';
import { ResourceNameWIcon } from '@odf/shared/resource-link/resource-link';
import { getName } from '@odf/shared/selectors';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { ComposableTable, RowComponentType } from '@odf/shared/table';
import { K8sResourceCondition } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getPageRange, getValidFilteredData } from '@odf/shared/utils';
import {
  ListPageBody,
  useListPageFilter,
  ListPageFilter,
  useK8sWatchResource,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { useNavigate, NavigateFunction } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Pagination,
  PaginationVariant,
  Text,
  TextVariants,
  Flex,
  FlexItem,
  Tabs,
  Tab,
  Tooltip,
} from '@patternfly/react-core';
import { InProgressIcon, CubeIcon } from '@patternfly/react-icons';
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
} from './components';
import {
  getHeaderColumns,
  getColumnNames,
  getRowActions,
  getReplicationHealth,
  getErrorConditions,
  isFailingOrRelocating,
  ReplicationHealthMap,
  getAppWorstSyncStatus,
  SyncStatusInfo,
} from './utils';

const INITIAL_PAGE_NUMBER = 1;
const COUNT_PER_PAGE_NUMBER = 10;

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
  const { launcher, navigate, syncStatus }: RowExtraProps = extraProps;

  const onTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabKey: EXPANDABLE_COMPONENT_TYPE
  ) =>
    tabKey === expandableComponentType
      ? // collapse the expandable section
        setExpandableComponentType(EXPANDABLE_COMPONENT_TYPE.DEFAULT)
      : // render new selected expandable section
        setExpandableComponentType(tabKey);

  const isExpanded: boolean =
    expandableComponentType !== EXPANDABLE_COMPONENT_TYPE.DEFAULT;

  // Enrolled/protected namespaces details
  const enrolledNamespaces: string[] =
    // ToDo: Update with correct spec field which will report all protected namespaces
    // @ts-ignore
    application.spec?.enrolledNamespace || [];

  // Errors details
  const filteredErrorConditions: K8sResourceCondition[] =
    getErrorConditions(application);
  const showErrorsDetails: boolean =
    !!filteredErrorConditions.length ||
    expandableComponentType === EXPANDABLE_COMPONENT_TYPE.ERRORS;

  // Current activity details
  const errorsCount: number = filteredErrorConditions.length;
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
            // only allowing collapse from here, we can expand from respective "Tabs"
            onToggle: () =>
              isExpanded &&
              setExpandableComponentType(EXPANDABLE_COMPONENT_TYPE.DEFAULT),
            expandId: 'expandable-table',
          }}
        />
        <Td translate={null} dataLabel={columnNames[1]}>
          <ResourceNameWIcon
            resourceModel={DRPlacementControlModel}
            resourceName={appName}
          />
        </Td>
        <Td translate={null} dataLabel={columnNames[2]}>
          <Tabs
            activeKey={expandableComponentType}
            onSelect={onTabSelect}
            isFilled
          >
            <Tab
              translate={null}
              eventKey={EXPANDABLE_COMPONENT_TYPE.NS}
              title={
                <div>
                  <CubeIcon size={'sm'} />
                  <span className="pf-u-pl-sm">
                    {enrolledNamespaces.length}
                  </span>
                </div>
              }
              tooltip={<Tooltip content={t('View namespaces')} />}
            />
            {showErrorsDetails && (
              <Tab
                translate={null}
                eventKey={EXPANDABLE_COMPONENT_TYPE.ERRORS}
                title={
                  <div>
                    <RedExclamationCircleIcon size={'sm'} />
                    <span className="pf-u-pl-sm">{errorsCount}</span>
                  </div>
                }
                tooltip={<Tooltip content={t('View alerts')} />}
              />
            )}
            {showEventsDetails && (
              <Tab
                translate={null}
                eventKey={EXPANDABLE_COMPONENT_TYPE.EVENTS}
                title={
                  <div>
                    <InProgressIcon size={'sm'} />
                    <span className="pf-u-pl-sm">{eventsCount}</span>
                  </div>
                }
                tooltip={<Tooltip content={t('View activity')} />}
              />
            )}
          </Tabs>
        </Td>
        <Td translate={null} dataLabel={columnNames[3]}>
          <Tabs
            activeKey={expandableComponentType}
            onSelect={onTabSelect}
            isFilled
          >
            <Tab
              translate={null}
              eventKey={EXPANDABLE_COMPONENT_TYPE.STATUS}
              title={
                <div>
                  {icon}
                  <span className="pf-u-pl-sm">{title}</span>
                </div>
              }
              tooltip={<Tooltip content={t('See detailed information')} />}
            />
          </Tabs>
        </Td>
        <Td translate={null} dataLabel={columnNames[4]}>
          {getDRPolicyName(application)}
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
              filteredConditions={filteredErrorConditions}
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

  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(COUNT_PER_PAGE_NUMBER);
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

  const paginatedData: DRPlacementControlKind[] = React.useMemo(() => {
    const [start, end] = getPageRange(page, perPage);
    return filteredData.slice(start, end) || [];
  }, [filteredData, page, perPage]);

  return (
    <>
      <ListPageBody>
        {isAllLoadedWOAnyError && (
          <>
            <Text component={TextVariants.h2} className="pf-u-mt-sm">
              {t('Protected applications')}
            </Text>
            <Flex className="pf-u-justify-content-space-between">
              <FlexItem>
                <Flex>
                  <ListPageFilter
                    data={getValidFilteredData(data)}
                    loaded={isAllLoaded}
                    onFilterChange={onFilterChange}
                    hideColumnManagement={true}
                  />
                  {/* ToDo: Update, either just modal or dropdown + modal */}
                  <Button variant={ButtonVariant.primary}>
                    {t('Enroll application')}
                  </Button>
                </Flex>
              </FlexItem>
              <FlexItem>
                <Pagination
                  perPageComponent="button"
                  itemCount={filteredData.length || 0}
                  widgetId="acm-discovered-apps-list"
                  perPage={perPage}
                  page={page}
                  variant={PaginationVariant.bottom}
                  dropDirection="up"
                  perPageOptions={[]}
                  isStatic
                  onSetPage={(_event, newPage) => setPage(newPage)}
                  onPerPageSelect={(_event, newPerPage, newPage) => {
                    setPerPage(newPerPage);
                    setPage(newPage);
                  }}
                />
              </FlexItem>
            </Flex>
            <AlertMessages />
          </>
        )}
        <ComposableTable
          columns={getHeaderColumns(t)}
          RowComponent={ProtectedAppsTableRow}
          extraProps={{ launcher, navigate, syncStatus }}
          rows={paginatedData}
          emptyRowMessage={EmptyRowMessage}
          unfilteredData={data as []}
          noDataMsg={NoDataMessage}
          loaded={isAllLoaded}
          loadError={anyError}
        />
      </ListPageBody>
    </>
  );
};

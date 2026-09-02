import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import {
  getApplicationName,
  getPAVDRPolicyName,
  getPrimaryCluster,
} from '@odf/mco/utils';
import { DRPlacementControlModel, useModalWrapper } from '@odf/shared';
import { DASH } from '@odf/shared/constants';
import { PaginatedListPage } from '@odf/shared/list-page';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName, getNamespace, getUID } from '@odf/shared/selectors';
import { YellowExclamationTriangleIcon } from '@odf/shared/status/icons';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { fuzzyCaseInsensitive } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  useK8sWatchResource,
  useListPageFilter,
  RowFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  SearchInput,
} from '@patternfly/react-core';
import { ActionsColumn, OnSelect, Td, Tr } from '@patternfly/react-table';
import { DRActionType, DR_BASE_ROUTE } from '../../constants';
import {
  getDRPlacementControlResourceObj,
  getProtectedApplicationViewResourceObj,
} from '../../hooks';
import { DRPlacementControlKind } from '../../types';
import { DRPlacementControlParser as DRStatusPopover } from '../dr-status-popover/parsers';
import {
  BatchFailoverRelocateModal,
  BatchFailoverRelocateExtraProps,
  BatchFailureResult,
  FailedDRPCItem,
} from '../modals/app-failover-relocate/batch-failover-relocate-modal';
import { getMCVName } from '../modals/app-manage-policies/helper/consistency-groups';
import { BulkSelector } from './bulk-selector';
import {
  AlertMessages,
  EmptyRowMessage,
  EnrollApplicationButton,
  ExpandableComponentType,
  NamespacesDetails,
  NoDataMessage,
} from './components';
import { useDROperationAlert } from './dr-operation-alert-helper';
import { getDRPCKey, useProtectedAppsSelection } from './use-selection';
import './protected-apps.scss';
import {
  drpcDetailsPageRoute,
  getColumnNames,
  getHeaderColumns,
  getRowActions,
  pavMatchesSearch,
} from './utils';

const getFailureMessage = (
  t: TFunction<string>,
  failure: BatchFailureResult
) => {
  const actionProgress =
    failure.action === DRActionType.FAILOVER
      ? t('failing over')
      : t('relocating');
  return t(
    '{{failed}} of {{total}} applications were unable to begin {{action}}.',
    {
      failed: failure.failedItems.length,
      total: failure.totalCount,
      action: actionProgress,
    }
  );
};

type BatchFailureAlertProps = {
  failure: BatchFailureResult;
  onDismiss: () => void;
  onRetry: () => void;
  onViewDetails: () => void;
};

const BatchFailureAlert: React.FC<BatchFailureAlertProps> = ({
  failure,
  onDismiss,
  onRetry,
  onViewDetails,
}) => {
  const { t } = useCustomTranslation();
  const actionName =
    failure.action === DRActionType.FAILOVER ? t('failover') : t('relocate');

  return (
    <Alert
      variant={AlertVariant.warning}
      title={t('{{count}} application unable to {{action}}', {
        count: failure.failedItems.length,
        action: actionName,
      })}
      isInline
      actionClose={<AlertActionCloseButton onClose={onDismiss} />}
      actionLinks={
        <>
          <Button variant={ButtonVariant.link} isInline onClick={onRetry}>
            {t('Retry')}
          </Button>
          <Button variant={ButtonVariant.link} isInline onClick={onViewDetails}>
            {t('View details')}
          </Button>
        </>
      }
    >
      {getFailureMessage(t, failure)}
    </Alert>
  );
};

const getDetailsColumnNames = (t: TFunction<string>) => ({
  name: t('Name'),
  severity: t('Severity'),
  description: t('Description'),
});

const BatchFailureRow: React.FC<RowComponentType<FailedDRPCItem>> = ({
  row: item,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = extraProps.columnNames;
  return (
    <Tr>
      <Td dataLabel={columnNames.name}>
        <Link to={drpcDetailsPageRoute(item.drpc)}>
          {getName(item.drpc) || DASH}
        </Link>
      </Td>
      <Td dataLabel={columnNames.severity}>
        <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
        {t('Warning')}
      </Td>
      <Td dataLabel={columnNames.description}>{item.errorMessage}</Td>
    </Tr>
  );
};

type BatchFailureDetailsViewProps = {
  failure: BatchFailureResult;
  onBack: () => void;
};

const NoFailedAppsMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="pf-v6-u-mt-xl">
      {t('No matching failed applications found')}
    </Bullseye>
  );
};

const BatchFailureDetailsView: React.FC<BatchFailureDetailsViewProps> = ({
  failure,
  onBack,
}) => {
  const { t } = useCustomTranslation();
  const [search, setSearch] = React.useState('');

  const columnNames = getDetailsColumnNames(t);
  const detailsColumns = Object.values(columnNames).map((columnName) => ({
    columnName,
  }));

  const filtered = React.useMemo(
    () =>
      search
        ? failure.failedItems.filter((item) =>
            fuzzyCaseInsensitive(search, getName(item.drpc) || '')
          )
        : failure.failedItems,
    [failure.failedItems, search]
  );

  return (
    <>
      <div className="odf-title odf-m-nav-title odf-m-nav-title--breadcrumbs pf-v6-u-pt-lg pf-v6-u-pb-lg">
        <div className="odf-breadcrumbs">
          <Breadcrumb className="odf-breadcrumbs-link">
            <BreadcrumbItem>
              <Button variant={ButtonVariant.link} isInline onClick={onBack}>
                {t('Protected applications')}
              </Button>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{t('Details')}</BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div className="odf-title-details">
          <Content>
            <Content component={ContentVariants.h1}>{t('Details')}</Content>
          </Content>
        </div>
        <Content component={ContentVariants.p} className="pf-v6-u-pb-sm">
          {getFailureMessage(t, failure)}
        </Content>
      </div>
      <PaginatedListPage
        key={search}
        countPerPage={20}
        filteredData={filtered}
        hideFilter
        toolbarActions={
          <SearchInput
            placeholder={t('Find by name')}
            value={search}
            onChange={(_e, value) => setSearch(value)}
            onClear={() => setSearch('')}
          />
        }
        composableTableProps={{
          columns: detailsColumns,
          RowComponent: BatchFailureRow as unknown as React.ComponentType<
            RowComponentType<K8sResourceCommon>
          >,
          extraProps: { columnNames },
          loaded: true,
          emptyRowMessage: NoFailedAppsMessage,
        }}
      />
    </>
  );
};

type ProtectedAppsToolbarProps = {
  selectedCount: number;
  eligiblePageCount: number;
  eligibleTotalCount: number;
  isPartiallySelected: boolean;
  isAllPageSelected: boolean;
  onSelectNone: () => void;
  onSelectPage: () => void;
  onSelectAll: () => void;
  onBatchAction: () => void;
};

const ProtectedAppsToolbar: React.FC<ProtectedAppsToolbarProps> = ({
  selectedCount,
  eligiblePageCount,
  eligibleTotalCount,
  isPartiallySelected,
  isAllPageSelected,
  onSelectNone,
  onSelectPage,
  onSelectAll,
  onBatchAction,
}) => {
  const { t } = useCustomTranslation();
  return (
    <div className="mco-protected-applications__toolbar-actions">
      <BulkSelector
        selectedCount={selectedCount}
        eligiblePageCount={eligiblePageCount}
        eligibleTotalCount={eligibleTotalCount}
        isPartiallySelected={isPartiallySelected}
        isAllSelected={isAllPageSelected}
        onSelectNone={onSelectNone}
        onSelectPage={onSelectPage}
        onSelectAll={onSelectAll}
      />
      <Button
        variant={ButtonVariant.secondary}
        isDisabled={selectedCount === 0}
        onClick={onBatchAction}
      >
        {t('Failover/Relocate')}
      </Button>
    </div>
  );
};

type RowSelectProps = {
  onRowSelect: OnSelect;
  isSelected: (pav: ProtectedApplicationViewKind) => boolean;
  isDisabled: (pav: ProtectedApplicationViewKind) => boolean;
};

type RowExtraProps = {
  launcher: LaunchModal;
  navigate: NavigateFunction;
  drpcMap: Map<string, DRPlacementControlKind>;
  selectProps: RowSelectProps;
};

const ProtectedAppsTableRow: React.FC<
  RowComponentType<ProtectedApplicationViewKind>
> = ({ row: pav, rowIndex, extraProps }) => {
  const { t } = useCustomTranslation();
  const { launcher, navigate, drpcMap, selectProps }: RowExtraProps =
    extraProps;

  const drpc = drpcMap.get(getDRPCKey(pav));

  const [expandableComponentType, setExpandableComponentType] = React.useState(
    ExpandableComponentType.DEFAULT
  );

  const columnNames = getColumnNames(t);
  const appName = getApplicationName(pav);
  const drPolicyName = getPAVDRPolicyName(pav);

  const isExpanded: boolean =
    expandableComponentType === ExpandableComponentType.NS;

  const totalColSpan = Object.keys(columnNames).length + 2;

  if (!drpc) {
    return (
      <Tr>
        <Td colSpan={totalColSpan}>
          <div className="text-muted pf-v6-u-text-align-center pf-v6-u-p-md">
            {t('DRPlacementControl resource not found for')}{' '}
            <strong>{appName}</strong>
          </div>
        </Td>
      </Tr>
    );
  }

  return (
    <>
      <Tr>
        <Td
          data-test="expand-button"
          expand={{
            rowIndex: rowIndex ?? 0,
            isExpanded: isExpanded,
            onToggle: () =>
              setExpandableComponentType(
                isExpanded
                  ? ExpandableComponentType.DEFAULT
                  : ExpandableComponentType.NS
              ),
            expandId: 'expandable-table',
          }}
        />
        <Td
          select={{
            rowIndex: rowIndex ?? 0,
            onSelect: selectProps.onRowSelect,
            isSelected: selectProps.isSelected(pav),
            isDisabled: selectProps.isDisabled(pav),
            props: { id: getUID(pav) },
          }}
        />
        <Td dataLabel={columnNames[1]}>
          <ResourceLink
            resourceModel={DRPlacementControlModel}
            resourceName={appName}
            link={drpcDetailsPageRoute(drpc)}
          />
        </Td>
        <Td dataLabel={columnNames[2]}>
          <DRStatusPopover application={drpc} />
        </Td>
        <Td dataLabel={columnNames[3]}>
          <Link
            to={`${DR_BASE_ROUTE}/policies?name=${drPolicyName}`}
            data-test={`link-${drPolicyName}`}
          >
            {drPolicyName}
          </Link>
        </Td>
        <Td dataLabel={columnNames[4]}>{getPrimaryCluster(pav) || DASH}</Td>
        <Td isActionCell>
          <ActionsColumn
            items={getRowActions(t, launcher, navigate, drpc, pav)}
          />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr>
          <Td colSpan={totalColSpan}>
            <NamespacesDetails view={pav} mcvName={getMCVName(drpc)} />
          </Td>
        </Tr>
      )}
    </>
  );
};

const PAV_NAME_FILTER = 'protected-application';

const nameFilterOverride: RowFilter<ProtectedApplicationViewKind>[] = [
  {
    type: PAV_NAME_FILTER,
    filterGroupName: '',
    reducer: () => undefined,
    items: [],
    filter: (filterValue, pav) =>
      pavMatchesSearch(filterValue.selected?.[0] || '', pav),
  },
];

export const ProtectedApplicationsListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const launcher: LaunchModal = useModalWrapper();
  const navigate = useNavigate();

  const [pavs, pavsLoaded, pavsError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  const [drpcs, drpcsLoaded, drpcsError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj({}));

  useDROperationAlert(drpcs || []);

  const drpcMap = React.useMemo(() => {
    const map = new Map<string, DRPlacementControlKind>();
    if (drpcsLoaded && drpcs) {
      drpcs.forEach((drpc) => {
        const key = `${drpc.metadata.namespace}/${drpc.metadata.name}`;
        map.set(key, drpc);
      });
    }
    return map;
  }, [drpcs, drpcsLoaded]);

  const isAllLoadedWOAnyError =
    pavsLoaded && drpcsLoaded && !pavsError && !drpcsError;

  const [data, filteredData, onFilterChange] = useListPageFilter(
    pavs || [],
    nameFilterOverride
  );

  const [pagePavs, setPagePavs] = React.useState<
    ProtectedApplicationViewKind[]
  >([]);

  const onPaginatedDataChange = React.useCallback(
    (paginatedData: K8sResourceCommon[]) => {
      setPagePavs(paginatedData as ProtectedApplicationViewKind[]);
    },
    []
  );

  const selection = useProtectedAppsSelection(
    filteredData as ProtectedApplicationViewKind[],
    pagePavs,
    drpcMap
  );

  const [batchFailure, setBatchFailure] =
    React.useState<BatchFailureResult | null>(null);
  const [showDetails, setShowDetails] = React.useState(false);

  const launchBatchModal = React.useCallback(
    (selectedDRPCs: DRPlacementControlKind[], initialAction?: DRActionType) => {
      const extraProps: BatchFailoverRelocateExtraProps = {
        selectedDRPCs,
        onComplete: selection.onSelectNone,
        onPartialFailure: (result: BatchFailureResult) =>
          setBatchFailure(result),
        ...(initialAction && { initialAction }),
      };
      launcher(BatchFailoverRelocateModal, { isOpen: true, extraProps });
    },
    [launcher, selection.onSelectNone]
  );

  const onBatchAction = React.useCallback(() => {
    const selectedDRPCs = (
      filteredData as ProtectedApplicationViewKind[]
    ).reduce<DRPlacementControlKind[]>((acc, pav) => {
      if (selection.isSelected(pav)) {
        const drpc = drpcMap.get(getDRPCKey(pav));
        if (drpc) acc.push(drpc);
      }
      return acc;
    }, []);

    if (selectedDRPCs.length > 0) launchBatchModal(selectedDRPCs);
  }, [filteredData, selection, drpcMap, launchBatchModal]);

  const rowSelectProps: RowSelectProps = {
    onRowSelect: selection.onRowSelect,
    isSelected: selection.isSelected,
    isDisabled: selection.isDisabled,
  };

  const toolbarActions = (
    <ProtectedAppsToolbar
      selectedCount={selection.selectedCount}
      eligiblePageCount={selection.eligiblePageCount}
      eligibleTotalCount={selection.eligibleTotalCount}
      isPartiallySelected={selection.isPartiallySelected}
      isAllPageSelected={selection.isAllPageSelected}
      onSelectNone={selection.onSelectNone}
      onSelectPage={selection.onSelectPage}
      onSelectAll={selection.onSelectAll}
      onBatchAction={onBatchAction}
    />
  );

  const onRetry = React.useCallback(() => {
    if (!batchFailure) return;
    const freshDrpcs = batchFailure.failedItems.reduce<
      DRPlacementControlKind[]
    >((acc, item) => {
      const key = `${getNamespace(item.drpc)}/${getName(item.drpc)}`;
      const fresh = drpcMap.get(key);
      if (fresh) acc.push(fresh);
      return acc;
    }, []);
    const action = batchFailure.action;
    setBatchFailure(null);
    if (freshDrpcs.length > 0) launchBatchModal(freshDrpcs, action);
  }, [batchFailure, drpcMap, launchBatchModal]);

  const onDismiss = () => {
    setBatchFailure(null);
    setShowDetails(false);
  };

  const onBack = () => setShowDetails(false);
  const onViewDetails = () => setShowDetails(true);

  if (showDetails && batchFailure) {
    return <BatchFailureDetailsView failure={batchFailure} onBack={onBack} />;
  }

  return (
    <>
      {batchFailure && (
        <BatchFailureAlert
          failure={batchFailure}
          onDismiss={onDismiss}
          onRetry={onRetry}
          onViewDetails={onViewDetails}
        />
      )}
      <PaginatedListPage
        filteredData={filteredData}
        CreateButton={EnrollApplicationButton}
        toolbarActions={toolbarActions}
        Alerts={AlertMessages}
        noData={!isAllLoadedWOAnyError || !data.length}
        onPaginatedDataChange={onPaginatedDataChange}
        listPageFilterProps={{
          data: data,
          loaded: drpcsLoaded && pavsLoaded,
          onFilterChange: onFilterChange,
          nameFilter: PAV_NAME_FILTER,
        }}
        composableTableProps={{
          columns: getHeaderColumns(t),
          RowComponent: ProtectedAppsTableRow,
          extraProps: {
            launcher,
            navigate,
            drpcMap,
            selectProps: rowSelectProps,
          },
          emptyRowMessage: EmptyRowMessage,
          unfilteredData: data as [],
          noDataMsg: NoDataMessage,
          loaded: pavsLoaded && drpcsLoaded,
          loadError: pavsError || drpcsError,
          selectProps: {
            onSelect: selection.onSelectAllPage,
            isAllSelected: selection.isAllPageSelected,
          },
        }}
      />
    </>
  );
};

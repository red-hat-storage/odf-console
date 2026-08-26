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
import { getUID } from '@odf/shared/selectors';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  K8sResourceCommon,
  useK8sWatchResource,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ActionsColumn, OnSelect, Td, Tr } from '@patternfly/react-table';
import { DR_BASE_ROUTE } from '../../constants';
import {
  getDRPlacementControlResourceObj,
  getProtectedApplicationViewResourceObj,
} from '../../hooks';
import { DRPlacementControlKind } from '../../types';
import { DRPlacementControlParser as DRStatusPopover } from '../dr-status-popover/parsers';
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
} from './utils';

type ProtectedAppsToolbarProps = {
  selectedCount: number;
  eligiblePageCount: number;
  eligibleTotalCount: number;
  isPartiallySelected: boolean;
  isAllPageSelected: boolean;
  onSelectNone: () => void;
  onSelectPage: () => void;
  onSelectAll: () => void;
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

export const ProtectedApplicationsListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const launcher = useModalWrapper();
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

  const [data, filteredData, onFilterChange] = useListPageFilter(pavs || []);

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
    />
  );

  return (
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
  );
};

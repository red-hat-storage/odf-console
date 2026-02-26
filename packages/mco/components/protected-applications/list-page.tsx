import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import {
  getApplicationName,
  getDRPlacementControlRef,
  getPAVDRPolicyName,
  getPrimaryCluster,
} from '@odf/mco/utils';
import { DRPlacementControlModel, getNamespace } from '@odf/shared';
import { DASH } from '@odf/shared/constants';
import { PaginatedListPage } from '@odf/shared/list-page';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  useK8sWatchResource,
  useListPageFilter,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import {
  Link,
  NavigateFunction,
  useNavigate,
} from 'react-router-dom-v5-compat';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { DR_BASE_ROUTE } from '../../constants';
import {
  getDRPlacementControlResourceObj,
  getProtectedApplicationViewResourceObj,
} from '../../hooks';
import { DRPlacementControlKind } from '../../types';
import { DRPlacementControlParser as DRStatusPopover } from '../dr-status-popover/parsers';
import { getMCVName } from '../modals/app-manage-policies/helper/consistency-groups';
import {
  AlertMessages,
  EmptyRowMessage,
  EnrollApplicationButton,
  ExpandableComponentType,
  NamespacesDetails,
  NoDataMessage,
} from './components';
import { useDROperationAlert } from './dr-operation-alert-helper';
import './protected-apps.scss';
import {
  drpcDetailsPageRoute,
  getColumnNames,
  getHeaderColumns,
  getRowActions,
} from './utils';

type RowExtraProps = {
  launcher: LaunchModal;
  navigate: NavigateFunction;
  drpcMap: Map<string, DRPlacementControlKind>;
};

const ProtectedAppsTableRow: React.FC<
  RowComponentType<ProtectedApplicationViewKind>
> = ({ row: pav, extraProps }) => {
  const { t } = useCustomTranslation();
  const { launcher, navigate, drpcMap }: RowExtraProps = extraProps;

  const drpcRef = getDRPlacementControlRef(pav);
  const drpcKey = `${drpcRef.namespace || getNamespace(pav)}/${drpcRef.name}`;
  const drpc = drpcMap.get(drpcKey);

  const [expandableComponentType, setExpandableComponentType] = React.useState(
    ExpandableComponentType.DEFAULT
  );

  const columnNames = getColumnNames(t);
  const appName = getApplicationName(pav);
  const drPolicyName = getPAVDRPolicyName(pav);

  const isExpanded: boolean =
    expandableComponentType === ExpandableComponentType.NS;

  if (!drpc) {
    return (
      <Tr>
        <Td colSpan={Object.keys(columnNames).length + 1}>
          <div className="text-muted pf-v5-u-text-align-center pf-v5-u-p-md">
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
            rowIndex: 0,
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
          <Td colSpan={Object.keys(columnNames).length + 1}>
            <NamespacesDetails view={pav} mcvName={getMCVName(drpc)} />
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

  const [pavs, pavsLoaded, pavsError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  // Filter out resources marked for deletion (deletionTimestamp set)
  // Resources with deletionTimestamp are being garbage collected and should not be displayed
  const activePAVs = React.useMemo(() => {
    if (!pavsLoaded || !pavs) return [];
    return pavs.filter((pav) => !pav.metadata?.deletionTimestamp);
  }, [pavs, pavsLoaded]);

  const [drpcs, drpcsLoaded, drpcsError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj({}));

  // Filter out DRPCs marked for deletion
  const activeDRPCs = React.useMemo(() => {
    if (!drpcsLoaded || !drpcs) return [];
    return drpcs.filter((drpc) => !drpc.metadata?.deletionTimestamp);
  }, [drpcs, drpcsLoaded]);

  // Monitor for DR operation completions and show alerts (only for active DRPCs)
  useDROperationAlert(activeDRPCs);

  const drpcMap = React.useMemo(() => {
    const map = new Map<string, DRPlacementControlKind>();
    activeDRPCs.forEach((drpc) => {
      const key = `${drpc.metadata.namespace}/${drpc.metadata.name}`;
      map.set(key, drpc);
    });
    return map;
  }, [activeDRPCs]);

  const isAllLoadedWOAnyError =
    pavsLoaded && drpcsLoaded && !pavsError && !drpcsError;

  const [data, filteredData, onFilterChange] = useListPageFilter(activePAVs);

  return (
    <PaginatedListPage
      filteredData={filteredData}
      CreateButton={EnrollApplicationButton}
      Alerts={AlertMessages}
      noData={!isAllLoadedWOAnyError || !data.length}
      listPageFilterProps={{
        data: data,
        loaded: drpcsLoaded && pavsLoaded,
        onFilterChange: onFilterChange,
      }}
      composableTableProps={{
        columns: getHeaderColumns(t),
        RowComponent: ProtectedAppsTableRow,
        extraProps: { launcher, navigate, drpcMap },
        emptyRowMessage: EmptyRowMessage,
        unfilteredData: data as [],
        noDataMsg: NoDataMessage,
        loaded: pavsLoaded && drpcsLoaded,
        loadError: pavsError || drpcsError,
      }}
    />
  );
};

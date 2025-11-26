import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import {
  getApplicationName,
  getDetailsCount,
  getDRPCRef,
  getPAVDRPolicyName,
  getPrimaryCluster,
} from '@odf/mco/utils/pav';
import { DRPlacementControlModel } from '@odf/shared';
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
import { global_palette_black_900 as blackIconColor } from '@patternfly/react-tokens/dist/js/global_palette_black_900';
import classNames from 'classnames';
import {
  Link,
  NavigateFunction,
  useNavigate,
} from 'react-router-dom-v5-compat';
import { Icon } from '@patternfly/react-core';
import { CubeIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { DR_BASE_ROUTE } from '../../constants';
import {
  getDRPlacementControlResourceObj,
  getProtectedApplicationViewResourceObj,
} from '../../hooks';
import { DRPlacementControlKind } from '../../types';
import { DiscoveredParser as DRStatusPopover } from '../dr-status-popover/parsers';
import {
  AlertMessages,
  EmptyRowMessage,
  EnrollApplicationButton,
  ExpandableComponentProps,
  ExpandableComponentsMap,
  ExpandableComponentType,
  NoDataMessage,
  SelectExpandable,
} from './components';
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
};

const ProtectedAppsTableRow: React.FC<
  RowComponentType<ProtectedApplicationViewKind>
> = ({ row: pav, extraProps }) => {
  const { t } = useCustomTranslation();
  const {
    launcher,
    navigate,
    drpcMap,
  }: RowExtraProps & { drpcMap: Map<string, DRPlacementControlKind> } =
    extraProps;

  const drpcRef = getDRPCRef(pav);
  const drpcKey = `${drpcRef.namespace || pav.metadata.namespace}/${drpcRef.name}`;
  const drpc = drpcMap.get(drpcKey);

  const [expandableComponentType, setExpandableComponentType] = React.useState(
    ExpandableComponentType.DEFAULT
  );

  const columnNames = getColumnNames(t);
  const appName = getApplicationName(pav);
  const drPolicyName = getPAVDRPolicyName(pav);
  const detailsCount = getDetailsCount(pav);

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

  // Expandable section
  const ExpandableComponent: React.FC<ExpandableComponentProps> =
    ExpandableComponentsMap[expandableComponentType];

  return (
    <>
      <Tr>
        <Td
          data-test="expand-button"
          expand={{
            rowIndex: 0,
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
            link={drpcDetailsPageRoute(drpc)}
          />
        </Td>
        <Td dataLabel={columnNames[2]}>
          <SelectExpandable
            title={
              <div>
                <Icon size="sm">
                  <CubeIcon color={blackIconColor.value} />
                </Icon>
                <span className="pf-v5-u-pl-sm">{detailsCount}</span>
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
        </Td>
        <Td dataLabel={columnNames[3]}>
          <DRStatusPopover application={drpc} />
        </Td>
        <Td dataLabel={columnNames[4]}>
          <Link
            to={`${DR_BASE_ROUTE}/policies?name=${drPolicyName}`}
            data-test={`link-${drPolicyName}`}
          >
            {drPolicyName}
          </Link>
        </Td>
        <Td dataLabel={columnNames[5]}>{getPrimaryCluster(pav) || DASH}</Td>
        <Td isActionCell>
          <ActionsColumn items={getRowActions(t, launcher, navigate, drpc)} />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr>
          <Td colSpan={Object.keys(columnNames).length + 1}>
            <ExpandableComponent application={drpc} />
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

  const [drpcs, drpcsLoaded, drpcsError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj({}));

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

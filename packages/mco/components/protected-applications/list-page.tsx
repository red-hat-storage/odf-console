import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import { DASH } from '@odf/shared/constants';
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
import { CubeIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { DR_BASE_ROUTE, DISCOVERED_APP_NS } from '../../constants';
import { getDRPlacementControlResourceObj } from '../../hooks';
import { DRPlacementControlKind } from '../../types';
import { getDRPolicyName, getPrimaryClusterName } from '../../utils';
import { DiscoveredParser as DRStatusPopover } from '../dr-status-popover/parsers';
import {
  EmptyRowMessage,
  NoDataMessage,
  AlertMessages,
  EnrollApplicationButton,
  ExpandableComponentType,
  ExpandableComponentProps,
  ExpandableComponentsMap,
  SelectExpandable,
} from './components';
import { useDROperationAlert } from './dr-operation-alert-helper';
import {
  getHeaderColumns,
  getColumnNames,
  drpcDetailsPageRoute,
  getRowActions,
} from './utils';
import './protected-apps.scss';

type RowExtraProps = {
  launcher: LaunchModal;
  navigate: NavigateFunction;
};

const ProtectedAppsTableRow: React.FC<
  RowComponentType<DRPlacementControlKind>
> = ({ row: application, extraProps }) => {
  const { t } = useCustomTranslation();
  const { launcher, navigate }: RowExtraProps = extraProps;

  const [expandableComponentType, setExpandableComponentType] = React.useState(
    ExpandableComponentType.DEFAULT
  );

  const columnNames = getColumnNames(t);
  const appName = getName(application);
  const drPolicyName = getDRPolicyName(application);
  const enrolledNamespaces: string[] =
    application.spec?.protectedNamespaces || [];

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
        </Td>
        <Td dataLabel={columnNames[3]}>
          <DRStatusPopover application={application} />
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
          {getPrimaryClusterName(application) || DASH}
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
            <ExpandableComponent application={application} />
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

  const [discoveredApps, discoveredAppsLoaded, discoveredAppsError] =
    useK8sWatchResource<DRPlacementControlKind[]>(
      getDRPlacementControlResourceObj({
        namespace: DISCOVERED_APP_NS,
      })
    );

  // Monitor for DR operation completions and show alerts
  useDROperationAlert(discoveredApps || []);

  const isAllLoadedWOAnyError = discoveredAppsLoaded && !discoveredAppsError;

  const [data, filteredData, onFilterChange] = useListPageFilter(
    discoveredApps || []
  );

  return (
    <PaginatedListPage
      filteredData={filteredData}
      CreateButton={EnrollApplicationButton}
      Alerts={AlertMessages}
      noData={!isAllLoadedWOAnyError || !data.length}
      listPageFilterProps={{
        data: data,
        loaded: discoveredAppsLoaded,
        onFilterChange: onFilterChange,
      }}
      composableTableProps={{
        columns: getHeaderColumns(t),
        RowComponent: ProtectedAppsTableRow,
        extraProps: { launcher, navigate },
        emptyRowMessage: EmptyRowMessage,
        unfilteredData: data as [],
        noDataMsg: NoDataMessage,
        loaded: discoveredAppsLoaded,
        loadError: discoveredAppsError,
      }}
    />
  );
};

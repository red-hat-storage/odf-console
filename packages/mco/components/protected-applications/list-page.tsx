import * as React from 'react';
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
import { DRPlacementControlModel } from '../../models';
import { DRPlacementControlKind } from '../../types';
import { getLastAppDeploymentClusterName, getDRPolicyName } from '../../utils';
import DRStatusPopover from '../dr-status-popover/parsers/discovered-parser';
import {
  EmptyRowMessage,
  NoDataMessage,
  AlertMessages,
  SyncStatus,
  EnrollApplicationButton,
} from './components';
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
  syncStatus: SyncStatus;
};

const ProtectedAppsTableRow: React.FC<
  RowComponentType<DRPlacementControlKind>
> = ({ row: application, extraProps }) => {
  const { t } = useCustomTranslation();
  const { launcher, navigate }: RowExtraProps = extraProps;

  const columnNames = getColumnNames(t);
  const appName = getName(application);
  const drPolicyName = getDRPolicyName(application);
  const enrolledNamespaces: string[] =
    application.spec?.protectedNamespaces || [];

  return (
    <Tr>
      <Td dataLabel={columnNames[1]}>
        <ResourceLink
          resourceModel={DRPlacementControlModel}
          resourceName={appName}
          link={drpcDetailsPageRoute(application)}
        />
      </Td>
      <Td dataLabel={columnNames[2]}>
        <div className="pf-v5-u-display-flex pf-v5-u-align-items-center">
          <Icon size="sm">
            <CubeIcon color={blackIconColor.value} />
          </Icon>
          <span className="pf-v5-u-pl-sm">{enrolledNamespaces.length}</span>
        </div>
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
        {getLastAppDeploymentClusterName(application) || DASH}
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={getRowActions(t, launcher, navigate, application)}
        />
      </Td>
    </Tr>
  );
};

export const ProtectedApplicationsListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const launcher = useModal();
  const navigate = useNavigate();

  const [syncStatus] = React.useState({} as SyncStatus);

  const [discoveredApps, discoveredAppsLoaded, discoveredAppsError] =
    useK8sWatchResource<DRPlacementControlKind[]>(
      getDRPlacementControlResourceObj({
        namespace: DISCOVERED_APP_NS,
      })
    );

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
        extraProps: { launcher, navigate, syncStatus },
        emptyRowMessage: EmptyRowMessage,
        unfilteredData: data as [],
        noDataMsg: NoDataMessage,
        loaded: discoveredAppsLoaded,
        loadError: discoveredAppsError,
      }}
    />
  );
};

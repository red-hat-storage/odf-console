import * as React from 'react';
import { NodeTaintsCell } from '@odf/core/components/nodes-table/NodeTaintsCell';
import { getDefaultLocalClusterRole } from '@odf/core/components/utils/scale';
import { ARBITER_ZONE, NodeType } from '@odf/core/constants/scale';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  getZone,
  hasControlPlaneRole,
  nodesIncludingControlPlane,
  getNodeCPUCapacity,
  getNodeTotalMemory,
  nodesWithoutTaints,
} from '@odf/core/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { StatusBox } from '@odf/shared/generic/status-box';
import { NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getLabels, getName } from '@odf/shared/selectors';
import {
  SelectableTable,
  TableVariant,
  RowComponentType,
  TableColumnProps,
} from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  resourcePathFromModel,
  getConvertedUnits,
  getNodeRoles,
  humanizeCpuCores,
  fuzzyCaseInsensitive,
} from '@odf/shared/utils';
import classNames from 'classnames';
import {
  Alert,
  AlertActionLink,
  Button,
  Popover,
  SearchInput,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  ExternalLinkAltIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { Td } from '@patternfly/react-table';
import { SortByDirection } from '@patternfly/react-table';
import { WizardNodeState } from '../../../reducer';
import { SelectLocalClusterNodesTableFooter } from './select-local-cluster-nodes-table-footer';
import './select-local-cluster-nodes-table.scss';

const tableColumnClasses = {
  name: classNames('pf-v6-u-w-33-on-md', 'pf-v6-u-w-50-on-sm'),
  role: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  taints: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  cpu: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  memory: classNames(
    'pf-m-hidden',
    'pf-m-visible-on-xl',
    'pf-v6-u-w-inherit-on-xl'
  ),
  zone: classNames('pf-v6-u-w-inherit'),
};

const isArbiterNode = (node: NodeData) =>
  getZone(node) === ARBITER_ZONE && hasControlPlaneRole(node);

const getLocalClusterRole = (
  node: NodeData,
  nodes: WizardNodeState[],
  enableStretchCluster?: boolean
): NodeType =>
  nodes.find((n) => n.name === getName(node))?.localClusterRole ??
  getDefaultLocalClusterRole(
    getNodeRoles(node),
    getZone(node) ?? '',
    enableStretchCluster
  );

const LocalClusterRoleDropdown: React.FC<{
  role: NodeType;
  onRoleChange: (role: NodeType) => void;
}> = ({ role, onRoleChange }) => {
  const { t } = useCustomTranslation();
  return (
    <SingleSelectDropdown
      className="dropdown--full-width"
      selectedKey={role}
      selectOptions={[
        <SelectOption key={NodeType.CLUSTER} value={NodeType.CLUSTER}>
          {t('Cluster node')}
        </SelectOption>,
        <SelectOption key={NodeType.DISK} value={NodeType.DISK}>
          {t('Disk node')}
        </SelectOption>,
      ]}
      onChange={(value) => onRoleChange(value as NodeType)}
      aria-label={t('Local cluster role')}
    />
  );
};

const NodeRow: React.FC<RowComponentType<NodeData>> = ({
  row: node,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const { enableStretchCluster, nodes, onLocalClusterRoleChange } = extraProps;
  const nodeName = getName(node);
  const role = getLocalClusterRole(node, nodes, enableStretchCluster);
  const showArbiterNode = enableStretchCluster && isArbiterNode(node);

  return (
    <>
      <Td dataLabel={t('Name')}>
        <ResourceLink
          link={resourcePathFromModel(NodeModel, nodeName)}
          resourceModel={NodeModel}
          resourceName={nodeName}
        />
      </Td>
      <Td dataLabel={t('OCP node role')}>
        {getNodeRoles(node).sort().join(', ') || '-'}
      </Td>
      <Td dataLabel={t('Taints')}>
        <NodeTaintsCell node={node} />
      </Td>
      <Td dataLabel={t('Local cluster role')}>
        {showArbiterNode ? (
          t('Arbiter node')
        ) : (
          <LocalClusterRoleDropdown
            role={role}
            onRoleChange={(newRole) =>
              onLocalClusterRoleChange(nodeName, newRole)
            }
          />
        )}
      </Td>
      <Td dataLabel={t('CPU')}>
        {humanizeCpuCores(getNodeCPUCapacity(node)).string || '-'}
      </Td>
      <Td dataLabel={t('Memory')}>
        {getConvertedUnits(getNodeTotalMemory(node))}
      </Td>
      <Td dataLabel={t('Zone')}>{getZone(node) || '-'}</Td>
    </>
  );
};

const nameSort = (a: NodeData, b: NodeData, direction: SortByDirection) => {
  const negation = direction !== SortByDirection.asc;
  const sortVal = getName(a).localeCompare(getName(b));
  return negation ? -sortVal : sortVal;
};

// Sort by number of taints; asc = untainted first, desc = most-tainted first
// (groups tainted nodes together). Falls back to name for a stable order.
export const taintsSort = (
  a: NodeData,
  b: NodeData,
  direction: SortByDirection
) => {
  const negation = direction !== SortByDirection.asc;
  const sortVal = (a.spec?.taints?.length ?? 0) - (b.spec?.taints?.length ?? 0);
  if (sortVal !== 0) {
    return negation ? -sortVal : sortVal;
  }
  const nameSortVal = getName(a).localeCompare(getName(b));
  return negation ? -nameSortVal : nameSortVal;
};

// Unified free-text filter: fuzzy, case-insensitive matching (repo standard,
// cf. HealthOverview/s3-browser) of the typed query against the node name, any
// label key/value, or any taint key/value.
export const matchesNodeQuery = (node: NodeData, query: string): boolean => {
  if (!query) {
    return true;
  }
  if (fuzzyCaseInsensitive(query, getName(node))) {
    return true;
  }
  const labels = getLabels(node) ?? {};
  if (
    Object.entries(labels).some(
      ([key, value]) =>
        fuzzyCaseInsensitive(query, key) ||
        fuzzyCaseInsensitive(query, value ?? '')
    )
  ) {
    return true;
  }
  return (node.spec?.taints ?? []).some(
    (taint) =>
      fuzzyCaseInsensitive(query, taint.key) ||
      fuzzyCaseInsensitive(query, taint.value ?? '')
  );
};

const InternalNodeTable: React.FC<NodeTableProps> = ({
  nodes,
  onRowSelected,
  onLocalClusterRoleChange,
  nodesData,
  includeControlPlane,
  enableStretchCluster,
}) => {
  const { t } = useCustomTranslation();

  const localClusterRoleSort = React.useCallback(
    (a: NodeData, b: NodeData, direction: SortByDirection) => {
      const negation = direction !== SortByDirection.asc;
      const sortVal = getLocalClusterRole(
        a,
        nodes,
        enableStretchCluster
      ).localeCompare(getLocalClusterRole(b, nodes, enableStretchCluster));
      if (sortVal !== 0) {
        return negation ? -sortVal : sortVal;
      }
      const nameSortVal = getName(a).localeCompare(getName(b));
      return negation ? -nameSortVal : nameSortVal;
    },
    [nodes, enableStretchCluster]
  );

  const getColumns = React.useMemo((): TableColumnProps[] => {
    return [
      {
        columnName: t('Name'),
        sortFunction: nameSort as <T>(a: T, b: T, c: SortByDirection) => number,
        thProps: { className: tableColumnClasses.name },
      },
      {
        columnName: t('OCP node role'),
        thProps: { className: tableColumnClasses.role },
      },
      {
        columnName: t('Taints'),
        sortFunction: taintsSort as <T>(
          a: T,
          b: T,
          c: SortByDirection
        ) => number,
        thProps: { className: tableColumnClasses.taints },
      },
      {
        columnName: (
          <>
            {t('Local cluster role')}
            <Popover
              aria-label={t('Local cluster role help')}
              hasAutoWidth
              data-test-id="local-cluster-role-help"
              headerContent={t('Local cluster role')}
              bodyContent={
                <>
                  {enableStretchCluster && (
                    <div>
                      {t(
                        'Arbiter node - This role is assigned by ODF based on label selectors and available resources.'
                      )}
                    </div>
                  )}
                  <div
                    className={
                      enableStretchCluster ? 'pf-v6-u-mt-sm' : undefined
                    }
                  >
                    {t(
                      'Cluster node - Can access LUN groups though may have lower performance than accessing LUN group from a disk node.'
                    )}
                  </div>
                  <div className="pf-v6-u-mt-sm">
                    {t('Disk node - Used to find LUNs to create LUN groups.')}
                  </div>
                </>
              }
              footerContent={
                <Button
                  variant="link"
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="start"
                >
                  {t('Learn more')}
                </Button>
              }
            >
              <Button
                variant="plain"
                aria-label={t('Local cluster role help')}
                isInline
              >
                <OutlinedQuestionCircleIcon />
              </Button>
            </Popover>
          </>
        ),
        thProps: { className: tableColumnClasses.role },
      },
      {
        columnName: t('CPU'),
        thProps: { className: tableColumnClasses.cpu },
      },
      {
        columnName: t('Memory'),
        thProps: { className: tableColumnClasses.memory },
      },
      {
        columnName: t('Zone'),
        thProps: { className: tableColumnClasses.zone },
      },
    ];
  }, [t, enableStretchCluster]);

  // Show every role-appropriate node (incl. tainted workers); useNodesData
  // already scopes worker/control-plane roles, so no taint filtering here.
  const filteredData = React.useMemo(
    () =>
      [...nodesData].sort((a, b) =>
        localClusterRoleSort(a, b, SortByDirection.asc)
      ),
    [nodesData, localClusterRoleSort]
  );

  // Pre-select only the untainted (and opted-in control-plane) nodes. Tainted
  // workers stay visible but unchecked until the user opts into them.
  const defaultSelectedNodes = React.useMemo(
    () =>
      includeControlPlane || enableStretchCluster
        ? nodesIncludingControlPlane(filteredData)
        : nodesWithoutTaints(filteredData),
    [includeControlPlane, enableStretchCluster, filteredData]
  );

  // Initialize with the default nodes selected (only once on first load, not when user deselects all)
  const [selectedRows, setSelectedRows] = React.useState<NodeData[]>([]);
  const hasInitializedSelection = React.useRef(false);

  React.useEffect(() => {
    hasInitializedSelection.current = false;
  }, [includeControlPlane, enableStretchCluster]);

  React.useEffect(() => {
    if (hasInitializedSelection.current) return;
    if (!filteredData.length) {
      setSelectedRows([]);
      onRowSelected([]);
      return;
    }
    setSelectedRows(defaultSelectedNodes);
    onRowSelected(defaultSelectedNodes);
    hasInitializedSelection.current = true;
  }, [filteredData, defaultSelectedNodes, onRowSelected]);

  const handleRowSelection = React.useCallback(
    (selected: NodeData[]) => {
      setSelectedRows(selected);
      onRowSelected(selected);
    },
    [onRowSelected]
  );

  return (
    <div className="ceph-odf-install__select-nodes-table">
      <SelectableTable<NodeData>
        columns={getColumns}
        rows={filteredData}
        RowComponent={NodeRow}
        extraProps={{ enableStretchCluster, nodes, onLocalClusterRoleChange }}
        selectedRows={selectedRows}
        setSelectedRows={handleRowSelection}
        loaded={true}
        variant={TableVariant.COMPACT}
      />
    </div>
  );
};

type NodeTableProps = {
  nodes: WizardNodeState[];
  onRowSelected: (selectedNodes: NodeData[]) => void;
  onLocalClusterRoleChange: (nodeName: string, role: NodeType) => void;
  nodesData: NodeData[];
  includeControlPlane?: boolean;
  enableStretchCluster?: boolean;
};

export const SelectLocalClusterNodesTable: React.FC<
  SelectLocalClusterNodesTableProps
> = ({
  nodes,
  onRowSelected,
  onLocalClusterRoleChange,
  includeControlPlane,
  enableStretchCluster,
}) => {
  const { t } = useCustomTranslation();
  const controlPlaneOrStretchCluster =
    includeControlPlane || enableStretchCluster;
  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData(
    true,
    controlPlaneOrStretchCluster
  );
  const [query, setQuery] = React.useState('');

  const filteredData = React.useMemo(
    () => nodesData.filter((node) => matchesNodeQuery(node, query)),
    [nodesData, query]
  );

  const searchPlaceholder = t('Find by name, label, or taint');

  return (
    <div className="odf-capacity-and-nodes__select-nodes">
      {enableStretchCluster && !nodesData.some(isArbiterNode) && (
        <Alert
          variant="danger"
          isInline
          title={t('No node meets the requirements to be an arbiter node.')}
          className="pf-v6-u-mt-md"
          actionLinks={
            <AlertActionLink
              component="a"
              href={''}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Learn more')}
            </AlertActionLink>
          }
        >
          {t(
            'At least one control plane node must have the required labels and resources in order to create a stretch cluster for the Storage Area Network.'
          )}
        </Alert>
      )}
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={query}
              onChange={(_event, value) => setQuery(value)}
              onClear={() => setQuery('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <StatusBox
        skeleton={<div className="loading-skeleton--table" />}
        data={filteredData}
        loaded={nodesLoaded}
        loadError={nodesLoadError}
      >
        <InternalNodeTable
          nodes={nodes}
          onRowSelected={onRowSelected}
          onLocalClusterRoleChange={onLocalClusterRoleChange}
          nodesData={filteredData}
          includeControlPlane={includeControlPlane}
          enableStretchCluster={enableStretchCluster}
        />
      </StatusBox>
      {!!nodes.length && <SelectLocalClusterNodesTableFooter nodes={nodes} />}
    </div>
  );
};

type SelectLocalClusterNodesTableProps = {
  nodes: WizardNodeState[];
  onRowSelected: (selectedNodes: NodeData[]) => void;
  onLocalClusterRoleChange: (nodeName: string, role: NodeType) => void;
  includeControlPlane?: boolean;
  enableStretchCluster?: boolean;
};

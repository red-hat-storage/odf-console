import * as React from 'react';
import {
  mergePreservedSelection,
  nameSort,
  taintsSort,
} from '@odf/core/components/nodes-table/node-filter';
import { NodeBulkSelect } from '@odf/core/components/nodes-table/NodeBulkSelect';
import { NodeSearchToolbar } from '@odf/core/components/nodes-table/NodeSearchToolbar';
import { NodeTaintsCell } from '@odf/core/components/nodes-table/NodeTaintsCell';
import { useNodeBulkSelect } from '@odf/core/components/nodes-table/useNodeBulkSelect';
import { useNodeSearch } from '@odf/core/components/nodes-table/useNodeSearch';
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
import { getName, getUID } from '@odf/shared/selectors';
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
} from '@odf/shared/utils';
import classNames from 'classnames';
import {
  Alert,
  AlertActionLink,
  Button,
  Popover,
  SelectOption,
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
      <Td dataLabel={t('OCP Node role')}>
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

const InternalNodeTable: React.FC<NodeTableProps> = ({
  nodes,
  nodesData,
  selectedNodes,
  onSelectionChange,
  onLocalClusterRoleChange,
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
        columnName: t('OCP Node role'),
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
  const sortedRows = React.useMemo(
    () =>
      [...nodesData].sort((a, b) =>
        localClusterRoleSort(a, b, SortByDirection.asc)
      ),
    [nodesData, localClusterRoleSort]
  );

  return (
    <div className="ceph-odf-install__select-nodes-table">
      <SelectableTable<NodeData>
        columns={getColumns}
        rows={sortedRows}
        RowComponent={NodeRow}
        extraProps={{ enableStretchCluster, nodes, onLocalClusterRoleChange }}
        selectedRows={selectedNodes}
        setSelectedRows={onSelectionChange}
        loaded={true}
        variant={TableVariant.COMPACT}
      />
    </div>
  );
};

type NodeTableProps = {
  nodes: WizardNodeState[];
  nodesData: NodeData[];
  selectedNodes: NodeData[];
  onSelectionChange: (visibleSelected: NodeData[]) => void;
  onLocalClusterRoleChange: (nodeName: string, role: NodeType) => void;
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
  const { query, setQuery, filteredNodes } = useNodeSearch(nodesData);

  // Selection state is owned here (not in InternalNodeTable) so the search
  // toolbar's bulk-select control and the table share one source of truth.
  const [selectedNodes, setSelectedNodes] = React.useState<NodeData[]>([]);

  const commitSelection = React.useCallback(
    (next: NodeData[]) => {
      setSelectedNodes(next);
      onRowSelected(next);
    },
    [onRowSelected]
  );

  // Pre-select only the untainted (and opted-in control-plane) nodes. Tainted
  // workers stay visible but unchecked until the user opts into them.
  const defaultSelectedNodes = React.useMemo(
    () =>
      controlPlaneOrStretchCluster
        ? nodesIncludingControlPlane(nodesData)
        : nodesWithoutTaints(nodesData),
    [controlPlaneOrStretchCluster, nodesData]
  );

  // Initialize the selection once, on first load (not when the user later
  // deselects everything). Toggling the control-plane/stretch option afterwards
  // does NOT re-initialize — that would discard the user's picks — it is handled
  // incrementally by the effect below.
  const hasInitializedSelection = React.useRef(false);
  const prevControlPlaneOrStretch = React.useRef(controlPlaneOrStretchCluster);
  React.useEffect(() => {
    if (hasInitializedSelection.current) return;
    if (!nodesData.length) {
      commitSelection([]);
      return;
    }
    commitSelection(defaultSelectedNodes);
    hasInitializedSelection.current = true;
    prevControlPlaneOrStretch.current = controlPlaneOrStretchCluster;
  }, [
    nodesData,
    defaultSelectedNodes,
    controlPlaneOrStretchCluster,
    commitSelection,
  ]);

  // Toggling "Include control plane nodes" (or stretch cluster) only adds or
  // removes the control-plane nodes; the worker selection is preserved so that
  // unchecking returns to the prior selection. `useNodesData` recomputes
  // `nodesData` synchronously for the new flag, so the control-plane rows are
  // already present/absent here.
  React.useEffect(() => {
    if (!hasInitializedSelection.current) return;
    if (prevControlPlaneOrStretch.current === controlPlaneOrStretchCluster) {
      return;
    }
    prevControlPlaneOrStretch.current = controlPlaneOrStretchCluster;
    if (controlPlaneOrStretchCluster) {
      // Enabling: keep the current worker selection and auto-select the newly
      // available control-plane nodes.
      const selectedUids = new Set(selectedNodes.map(getUID));
      const controlPlaneAdditions = nodesData.filter(
        (node) => hasControlPlaneRole(node) && !selectedUids.has(getUID(node))
      );
      commitSelection([...selectedNodes, ...controlPlaneAdditions]);
    } else {
      // Disabling: drop the now-hidden control-plane nodes, keeping every node
      // that is still part of the (worker-only) table.
      const visibleUids = new Set(nodesData.map(getUID));
      commitSelection(
        selectedNodes.filter((node) => visibleUids.has(getUID(node)))
      );
    }
  }, [controlPlaneOrStretchCluster, nodesData, selectedNodes, commitSelection]);

  // `filteredNodes` is the search-filtered (visible) set, so the merge preserves
  // the selection of any node currently hidden by the search.
  const handleRowSelection = React.useCallback(
    (visibleSelected: NodeData[]) => {
      commitSelection(
        mergePreservedSelection(selectedNodes, visibleSelected, filteredNodes)
      );
    },
    [commitSelection, filteredNodes, selectedNodes]
  );

  // Every visible row in this table is selectable (no `isRowSelectable`), so the
  // visible selectable set is simply the search-filtered list.
  const bulkSelect = useNodeBulkSelect({
    selectableNodes: filteredNodes,
    selectedNodes,
    onChange: commitSelection,
  });

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
      <NodeSearchToolbar query={query} onQueryChange={setQuery}>
        <ToolbarItem>
          <NodeBulkSelect {...bulkSelect} />
        </ToolbarItem>
      </NodeSearchToolbar>
      <StatusBox
        skeleton={<div className="loading-skeleton--table" />}
        data={filteredNodes}
        loaded={nodesLoaded}
        loadError={nodesLoadError}
      >
        <InternalNodeTable
          nodes={nodes}
          nodesData={filteredNodes}
          selectedNodes={selectedNodes}
          onSelectionChange={handleRowSelection}
          onLocalClusterRoleChange={onLocalClusterRoleChange}
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

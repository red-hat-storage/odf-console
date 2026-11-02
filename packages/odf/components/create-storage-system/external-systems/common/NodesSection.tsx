import * as React from 'react';
import { mergePreservedSelection } from '@odf/core/components/nodes-table/node-filter';
import { NodeBulkSelect } from '@odf/core/components/nodes-table/NodeBulkSelect';
import { NodeSearchToolbar } from '@odf/core/components/nodes-table/NodeSearchToolbar';
import { useNodeBulkSelect } from '@odf/core/components/nodes-table/useNodeBulkSelect';
import { useNodeSearch } from '@odf/core/components/nodes-table/useNodeSearch';
import { createWizardNodeState } from '@odf/core/components/utils';
import { NodeType } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  nodesIncludingControlPlane,
  nodesWithoutTaints,
} from '@odf/core/utils';
import {
  DOC_VERSION,
  getName,
  kernelDevelDoc,
  useCustomTranslation,
} from '@odf/shared';
import {
  ExternalLink,
  isControlPlaneNode,
  isWorkerNode,
} from '@odf/shared/utils';
import {
  Alert,
  Checkbox,
  HelperText,
  HelperTextItem,
  HelperTextItemVariant,
  Spinner,
  ToolbarItem,
} from '@patternfly/react-core';
import { NodesTable } from '../../../nodes-table/NodesTable';
import { WizardNodeState } from '../../reducer';
import { KernelDevelEligibility } from '../CreateScaleSystem/types';
import { SelectLocalClusterNodesTable } from './select-local-cluster-nodes-table/select-local-cluster-nodes-table';

type IncludeControlPlaneCheckboxProps = {
  isChecked: boolean;
  isDisabled?: boolean;
  onChange: (
    event: React.FormEvent<HTMLInputElement>,
    checked: boolean
  ) => void;
  className?: string;
};

export const IncludeControlPlaneCheckbox: React.FC<
  IncludeControlPlaneCheckboxProps
> = ({ isChecked, isDisabled, onChange, className }) => {
  const { t } = useCustomTranslation();

  return (
    <Checkbox
      id="include-control-plane-nodes"
      label={t('Include control plane nodes')}
      isChecked={isChecked}
      isDisabled={isDisabled}
      onChange={onChange}
      className={className}
    />
  );
};

enum KernelDevelStatusKind {
  SUCCESS = 'success',
  DANGER = 'danger',
  PENDING = 'pending',
  WARNING = 'warning',
}

type KernelDevelStatusProps = {
  eligibility: KernelDevelEligibility;
};

const KernelDevelStatus: React.FC<KernelDevelStatusProps> = ({
  eligibility,
}) => {
  const { t } = useCustomTranslation();
  let status = KernelDevelStatusKind.SUCCESS;
  let variant: HelperTextItemVariant = HelperTextItemVariant.success;
  let message = t('Kernel-devel packages verified');
  let details = '';

  if (eligibility.error) {
    status = KernelDevelStatusKind.DANGER;
    variant = HelperTextItemVariant.error;
    message = t('Unable to verify kernel-devel package status');
    details = eligibility.error;
  } else if (eligibility.isLoading) {
    status = KernelDevelStatusKind.PENDING;
    variant = HelperTextItemVariant.default;
    message = t('Checking kernel-devel packages on selected nodes');
  } else if (eligibility.nodesWithoutKernelDevel.length > 0) {
    status = KernelDevelStatusKind.WARNING;
    variant = HelperTextItemVariant.warning;
    message = t(
      'Kernel-devel packages are missing on some selected nodes. Please apply the Machine Config Operator (MCO) update to install them before continuing.'
    );
  }

  return (
    <HelperText className="pf-v6-u-mt-md">
      <HelperTextItem
        data-test={`kernel-devel-status-${status}`}
        variant={variant}
        icon={
          status === KernelDevelStatusKind.PENDING ? (
            <Spinner size="sm" />
          ) : undefined
        }
      >
        {message}
        {details ? ` ${details}` : ''}
        {status === KernelDevelStatusKind.WARNING && (
          <>
            {' '}
            <ExternalLink href={kernelDevelDoc(DOC_VERSION)}>
              {t('Learn more')}
            </ExternalLink>
          </>
        )}
      </HelperTextItem>
    </HelperText>
  );
};

type ScaleNodesSectionProps = {
  isDisabled?: boolean;
  selectedNodes: WizardNodeState[];
  setSelectedNodes: (nodes: WizardNodeState[]) => void;
  kernelDevelEligibility: KernelDevelEligibility;
  isNodeFixed?: (node: NodeData) => boolean;
};

export const ScaleNodesSection: React.FC<ScaleNodesSectionProps> = React.memo(
  ({
    isDisabled,
    selectedNodes,
    setSelectedNodes,
    kernelDevelEligibility,
    isNodeFixed,
  }) => {
    const { t } = useCustomTranslation();
    const [includeControlPlaneNodes, setIncludeControlPlaneNodes] =
      React.useState(false);
    const [allNodes, allNodesLoaded] = useNodesData();
    const hasInitializedSelection = React.useRef(false);

    const [workerNodes, controlPlaneNodes] = React.useMemo(
      () => [
        allNodes.filter(isWorkerNode),
        allNodes.filter(isControlPlaneNode),
      ],
      [allNodes]
    );
    // Show every role-appropriate node (incl. tainted workers). Control-plane
    // nodes are included only when the user opts in.
    const tableNodes = React.useMemo(
      () =>
        includeControlPlaneNodes
          ? [...workerNodes, ...controlPlaneNodes]
          : workerNodes,
      [controlPlaneNodes, includeControlPlaneNodes, workerNodes]
    );

    // Free-text search shared with the SAN flow. `filteredNodes` is the visible
    // (search-matched) subset of `tableNodes`.
    const { query, setQuery, filteredNodes } = useNodeSearch(tableNodes);

    // Pre-select only the untainted (and opted-in control-plane) nodes. Tainted
    // workers stay visible but unchecked until the user opts into them.
    const defaultSelectableNodes = React.useMemo(
      () =>
        includeControlPlaneNodes
          ? nodesIncludingControlPlane(tableNodes)
          : nodesWithoutTaints(tableNodes),
      [includeControlPlaneNodes, tableNodes]
    );

    const onNodeSelect = React.useCallback(
      (nodes: NodeData[]) => {
        setSelectedNodes(
          createWizardNodeState(
            isNodeFixed ? nodes.filter((node) => !isNodeFixed(node)) : nodes
          )
        );
      },
      [isNodeFixed, setSelectedNodes]
    );
    const isNodeSelectable = React.useCallback(
      (node: NodeData) => !isDisabled && !isNodeFixed?.(node),
      [isDisabled, isNodeFixed]
    );

    // Initialize once so an intentional deselect-all action is preserved.
    React.useEffect(() => {
      if (!allNodesLoaded || hasInitializedSelection.current) {
        return;
      }

      if (tableNodes.length > 0 && !selectedNodes.length) {
        onNodeSelect(defaultSelectableNodes);
      }
      hasInitializedSelection.current = true;
    }, [
      allNodesLoaded,
      onNodeSelect,
      selectedNodes.length,
      tableNodes,
      defaultSelectableNodes,
    ]);

    const selectedNodeNames = React.useMemo(
      () => new Set(selectedNodes.map((node) => node.name)),
      [selectedNodes]
    );
    const selectedNodeData = React.useMemo(
      () =>
        tableNodes.filter(
          (node) => selectedNodeNames.has(getName(node)) || isNodeFixed?.(node)
        ),
      [isNodeFixed, selectedNodeNames, tableNodes]
    );

    // A search-filtered table reports selections only among the currently-visible
    // rows, so merge them back with selections hidden by the active search.
    const handleRowSelection = React.useCallback(
      (visibleSelected: NodeData[]) => {
        onNodeSelect(
          mergePreservedSelection(
            selectedNodeData,
            visibleSelected,
            filteredNodes
          )
        );
      },
      [filteredNodes, onNodeSelect, selectedNodeData]
    );

    // "Select all / none" operates on the visible, selectable rows and preserves
    // search-hidden selections (same contract as the SAN flow).
    const selectableFilteredNodes = React.useMemo(
      () => filteredNodes.filter(isNodeSelectable),
      [filteredNodes, isNodeSelectable]
    );
    const bulkSelect = useNodeBulkSelect({
      selectableNodes: selectableFilteredNodes,
      selectedNodes: selectedNodeData,
      onChange: onNodeSelect,
    });

    // Control-plane nodes are shown (but left unselected) when the box is
    // checked; unchecking drops them while preserving the worker selection.
    const handleIncludeControlPlaneNodes = React.useCallback(
      (_event: React.FormEvent<HTMLInputElement>, isChecked: boolean) => {
        const nextSelectedNodes = selectedNodeData.filter(
          (node) => isChecked || !isControlPlaneNode(node)
        );

        setIncludeControlPlaneNodes(isChecked);
        onNodeSelect(nextSelectedNodes);
      },
      [onNodeSelect, selectedNodeData]
    );

    return (
      <>
        <IncludeControlPlaneCheckbox
          isChecked={includeControlPlaneNodes}
          isDisabled={isDisabled}
          onChange={handleIncludeControlPlaneNodes}
          className="pf-v6-u-mb-sm"
        />
        <NodeSearchToolbar query={query} onQueryChange={setQuery}>
          <ToolbarItem>
            <NodeBulkSelect {...bulkSelect} />
          </ToolbarItem>
        </NodeSearchToolbar>
        <NodesTable
          nodes={filteredNodes}
          selectedNodes={selectedNodeData}
          setSelectedNodes={handleRowSelection}
          loaded={allNodesLoaded}
          isRowSelectable={isNodeSelectable}
          nameColumnTitle={t('Node')}
          roleColumnTitle={t('OCP Node role')}
          showTaints
        />
        {selectedNodes.length > 0 && (
          <KernelDevelStatus eligibility={kernelDevelEligibility} />
        )}
        {isDisabled && (
          <Alert
            variant="info"
            title={t('Nodes are disabled')}
            isInline
            className="pf-v6-u-mt-md"
          >
            {t('Nodes are disabled because the local cluster is configured')}
          </Alert>
        )}
      </>
    );
  }
);

type SANNodesSectionProps = {
  isDisabled?: boolean;
  selectedNodes: WizardNodeState[];
  setSelectedNodes: (nodes: WizardNodeState[]) => void;
  includeControlPlane?: boolean;
  enableStretchCluster?: boolean;
};

export const SANNodesSection: React.FC<SANNodesSectionProps> = React.memo(
  ({
    isDisabled,
    selectedNodes,
    setSelectedNodes,
    includeControlPlane,
    enableStretchCluster,
  }) => {
    const { t } = useCustomTranslation();

    const onNodeSelect = React.useCallback(
      (nodes: NodeData[]) => {
        setSelectedNodes(
          createWizardNodeState(nodes, { enableStretchCluster }).map((node) => {
            const previousRole = selectedNodes.find(
              (n) => n.name === node.name
            )?.localClusterRole;
            return previousRole && node.localClusterRole !== NodeType.ARBITER
              ? { ...node, localClusterRole: previousRole }
              : node;
          })
        );
      },
      [enableStretchCluster, setSelectedNodes, selectedNodes]
    );

    const onLocalClusterRoleChange = React.useCallback(
      (nodeName: string, role: NodeType) => {
        setSelectedNodes(
          selectedNodes.map((node) =>
            node.name === nodeName ? { ...node, localClusterRole: role } : node
          )
        );
      },
      [setSelectedNodes, selectedNodes]
    );

    return (
      <>
        <SelectLocalClusterNodesTable
          nodes={selectedNodes}
          onRowSelected={onNodeSelect}
          onLocalClusterRoleChange={onLocalClusterRoleChange}
          includeControlPlane={includeControlPlane}
          enableStretchCluster={enableStretchCluster}
        />
        {isDisabled && (
          <Alert
            variant="info"
            title={t('Nodes are disabled')}
            isInline
            className="pf-v6-u-mt-md"
          >
            {t('Nodes are disabled because the local cluster is configured')}
          </Alert>
        )}
      </>
    );
  }
);

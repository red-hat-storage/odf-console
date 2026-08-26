import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { NodeType } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  nodesIncludingControlPlane,
  nodesWithoutTaints,
} from '@odf/core/utils';
import { getName, useCustomTranslation } from '@odf/shared';
import { isControlPlaneNode, isWorkerNode } from '@odf/shared/utils';
import { Alert, Checkbox } from '@patternfly/react-core';
import { NodesTable } from '../../../nodes-table/NodesTable';
import { WizardNodeState } from '../../reducer';
import { SelectLocalClusterNodesTable } from '../../select-nodes-table/select-local-cluster-nodes-table';

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

type ScaleNodesSectionProps = {
  isDisabled?: boolean;
  selectedNodes: WizardNodeState[];
  setSelectedNodes: (nodes: WizardNodeState[]) => void;
  statusContent?: React.ReactNode;
};

export const ScaleNodesSection: React.FC<ScaleNodesSectionProps> = React.memo(
  ({ isDisabled, selectedNodes, setSelectedNodes, statusContent }) => {
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
    const tableNodes = React.useMemo(
      () =>
        includeControlPlaneNodes
          ? nodesIncludingControlPlane([...workerNodes, ...controlPlaneNodes])
          : nodesWithoutTaints(workerNodes),
      [controlPlaneNodes, includeControlPlaneNodes, workerNodes]
    );

    const onNodeSelect = React.useCallback(
      (nodes: NodeData[]) => {
        setSelectedNodes(createWizardNodeState(nodes));
      },
      [setSelectedNodes]
    );
    const isNodeSelectable = React.useCallback(() => !isDisabled, [isDisabled]);

    // Initialize once so an intentional deselect-all action is preserved.
    React.useEffect(() => {
      if (!allNodesLoaded || hasInitializedSelection.current) {
        return;
      }

      if (tableNodes.length > 0 && !selectedNodes.length) {
        onNodeSelect(tableNodes);
      }
      hasInitializedSelection.current = true;
    }, [allNodesLoaded, onNodeSelect, selectedNodes.length, tableNodes]);

    const selectedNodeNames = React.useMemo(
      () => new Set(selectedNodes.map((node) => node.name)),
      [selectedNodes]
    );
    const selectedNodeData = React.useMemo(
      () => tableNodes.filter((node) => selectedNodeNames.has(getName(node))),
      [selectedNodeNames, tableNodes]
    );

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
        <NodesTable
          nodes={tableNodes}
          selectedNodes={selectedNodeData}
          setSelectedNodes={onNodeSelect}
          loaded={allNodesLoaded}
          isRowSelectable={isNodeSelectable}
          nameColumnTitle={t('Node')}
        />
        {statusContent}
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
          createWizardNodeState(nodes, { enableStretchCluster })
        );
      },
      [enableStretchCluster, setSelectedNodes]
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

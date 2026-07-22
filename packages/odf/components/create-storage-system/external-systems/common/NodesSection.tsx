import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { nodesWithoutTaints } from '@odf/core/utils';
import { getName, useCustomTranslation } from '@odf/shared';
import {
  Card,
  CardHeader,
  Flex,
  CardTitle,
  CardBody,
  FlexItem,
  Alert,
  Checkbox,
} from '@patternfly/react-core';
import { WizardNodeState } from '../../reducer';
import {
  NodesTable,
  SelectNodesTable,
} from '../../select-nodes-table/select-nodes-table';
import './NodesSection.scss';

const hasNodeRole = (node: NodeData, role: string): boolean =>
  Object.prototype.hasOwnProperty.call(
    node.metadata?.labels || {},
    `node-role.kubernetes.io/${role}`
  );

const isControlPlaneNode = (node: NodeData): boolean =>
  hasNodeRole(node, 'control-plane') || hasNodeRole(node, 'master');

const isWorkerNode = (node: NodeData): boolean =>
  hasNodeRole(node, 'worker') && !isControlPlaneNode(node);

type NodesSectionProps = {
  isDisabled?: boolean;
  selectedNodes: WizardNodeState[];
  setSelectedNodes: (nodes: WizardNodeState[]) => void;
  allNodesDescription?: string;
  selectNodesDescription?: string;
  statusContent?: React.ReactNode;
  showNodesTable?: boolean;
};

export const NodesSection: React.FC<NodesSectionProps> = React.memo(
  ({
    isDisabled,
    selectedNodes,
    setSelectedNodes,
    allNodesDescription,
    selectNodesDescription,
    statusContent,
    showNodesTable = false,
  }) => {
    const { t } = useCustomTranslation();
    const [isUseAllNodes, setIsUseAllNodes] = React.useState(true);
    const [includeControlPlaneNodes, setIncludeControlPlaneNodes] =
      React.useState(false);
    const [allNodes, allNodesLoaded] = useNodesData(!showNodesTable);
    const hasInitializedSelection = React.useRef(false);

    const workerNodes = React.useMemo(
      () => allNodes.filter(isWorkerNode),
      [allNodes]
    );
    const controlPlaneNodes = React.useMemo(
      () => allNodes.filter(isControlPlaneNode),
      [allNodes]
    );
    const tableNodes = React.useMemo(
      () =>
        nodesWithoutTaints(
          includeControlPlaneNodes
            ? [...workerNodes, ...controlPlaneNodes]
            : workerNodes
        ),
      [controlPlaneNodes, includeControlPlaneNodes, workerNodes]
    );

    const onNodeSelect = React.useCallback(
      (nodes: NodeData[]) => {
        const nodesData = createWizardNodeState(nodes);
        setSelectedNodes(nodesData);
      },
      [setSelectedNodes]
    );

    // Initialize once so an intentional deselect-all action is preserved.
    React.useEffect(() => {
      if (!allNodesLoaded || hasInitializedSelection.current) {
        return;
      }

      const defaultNodes = showNodesTable ? tableNodes : allNodes;
      if (isUseAllNodes && defaultNodes.length > 0 && !selectedNodes.length) {
        onNodeSelect(defaultNodes);
      }
      hasInitializedSelection.current = true;
    }, [
      isUseAllNodes,
      allNodesLoaded,
      allNodes,
      onNodeSelect,
      selectedNodes.length,
      showNodesTable,
      tableNodes,
    ]);

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
        const nextTableNodes = nodesWithoutTaints(
          isChecked ? [...workerNodes, ...controlPlaneNodes] : workerNodes
        );
        const nextSelectedNodes = nextTableNodes.filter(
          (node) =>
            selectedNodeNames.has(getName(node)) || isControlPlaneNode(node)
        );

        setIncludeControlPlaneNodes(isChecked);
        onNodeSelect(nextSelectedNodes);
      },
      [controlPlaneNodes, onNodeSelect, selectedNodeNames, workerNodes]
    );

    // Handle "All nodes" selection directly in the click handler
    const handleAllNodesClick = React.useCallback(() => {
      setIsUseAllNodes(true);
      if (allNodesLoaded && allNodes.length > 0) {
        onNodeSelect(allNodes);
      }
    }, [allNodesLoaded, allNodes, onNodeSelect]);

    // Handle "Select Nodes" selection - clear previous selection
    const handleSelectNodesClick = React.useCallback(() => {
      setIsUseAllNodes(false);
      setSelectedNodes([]);
    }, [setSelectedNodes]);

    const defaultAllNodesDescription = t(
      'All non control plane nodes are selected to handle requests to IBM Scale'
    );
    const defaultSelectNodesDescription = t(
      'Select a minimum of 3 nodes to handle requests to IBM scale'
    );

    return (
      <>
        {showNodesTable ? (
          <>
            <Checkbox
              id="include-control-plane-nodes"
              label={t('Include control plane nodes')}
              isChecked={includeControlPlaneNodes}
              isDisabled={isDisabled}
              onChange={handleIncludeControlPlaneNodes}
              className="pf-v6-u-mb-sm"
            />
            <NodesTable
              nodesData={tableNodes}
              selectedNodes={selectedNodeData}
              onRowSelected={onNodeSelect}
              disableLabeledNodes={false}
              systemNamespace=""
              isDisabled={isDisabled}
              nameColumnTitle={t('Node')}
            />
          </>
        ) : (
          <>
            <Flex direction={{ default: 'row' }}>
              <FlexItem>
                <Card
                  className="odf-nodes-section__card"
                  isSelected={isUseAllNodes}
                  isSelectable
                  id="all-nodes"
                  isDisabled={isDisabled}
                >
                  <CardHeader
                    selectableActions={{
                      onChange: handleAllNodesClick,
                      selectableActionId: 'use-all-nodes',
                      variant: 'single',
                      name: 'node-selector',
                      selectableActionAriaLabelledby: 'all-nodes',
                    }}
                  >
                    <CardTitle>{t('All Nodes (Default)')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {allNodesDescription || defaultAllNodesDescription}
                  </CardBody>
                </Card>
              </FlexItem>
              <FlexItem>
                <Card
                  className="odf-nodes-section__card"
                  isSelected={!isUseAllNodes}
                  isSelectable
                  id="selected-nodes"
                  isDisabled={isDisabled}
                >
                  <CardHeader
                    selectableActions={{
                      onChange: handleSelectNodesClick,
                      selectableActionId: 'use-selected-nodes',
                      variant: 'single',
                      name: 'node-selector',
                      selectableActionAriaLabelledby: 'selected-nodes',
                    }}
                  >
                    <CardTitle>{t('Select Nodes')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {selectNodesDescription || defaultSelectNodesDescription}
                  </CardBody>
                </Card>
              </FlexItem>
            </Flex>
            {!isUseAllNodes && (
              <SelectNodesTable
                nodes={selectedNodes}
                onRowSelected={onNodeSelect}
                systemNamespace={''}
              />
            )}
          </>
        )}
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

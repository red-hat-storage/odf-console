import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import {
  Card,
  CardHeader,
  Flex,
  CardTitle,
  CardBody,
  FlexItem,
  Alert,
} from '@patternfly/react-core';
import { WizardNodeState } from '../../reducer';
import { SelectNodesTable } from '../../select-nodes-table/select-nodes-table';
import './NodesSection.scss';

type NodesSectionProps = {
  isDisabled?: boolean;
  selectedNodes: WizardNodeState[];
  setSelectedNodes: (nodes: WizardNodeState[]) => void;
  allNodesDescription?: string;
  selectNodesDescription?: string;
};

export const NodesSection: React.FC<NodesSectionProps> = React.memo(
  ({
    isDisabled,
    selectedNodes,
    setSelectedNodes,
    allNodesDescription,
    selectNodesDescription,
  }) => {
    const { t } = useCustomTranslation();
    const [isUseAllNodes, setIsUseAllNodes] = React.useState(true);
    const [allNodes, allNodesLoaded] = useNodesData(true);

    const onNodeSelect = React.useCallback(
      (nodes: NodeData[]) => {
        const nodesData = createWizardNodeState(nodes);
        setSelectedNodes(nodesData);
      },
      [setSelectedNodes]
    );

    // Initialize selected nodes when component mounts and "All nodes" is selected by default
    React.useEffect(() => {
      if (
        isUseAllNodes &&
        allNodesLoaded &&
        allNodes.length > 0 &&
        selectedNodes.length === 0
      ) {
        onNodeSelect(allNodes);
      }
    }, [
      isUseAllNodes,
      allNodesLoaded,
      allNodes,
      selectedNodes.length,
      onNodeSelect,
    ]);

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

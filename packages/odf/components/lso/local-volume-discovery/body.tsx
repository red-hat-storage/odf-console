import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import { Radio } from '@patternfly/react-core';
import { WizardNodeState } from '../../create-storage-system/reducer';
import { SelectNodesTable } from '../../create-storage-system/select-nodes-table/select-nodes-table';
import './body.scss';

export const LocalVolumeDiscoveryBody: React.FC<
  LocalVolumeDiscoveryBodyProps
> = ({ allNodes, showSelectNodes, setSelectNodes, setShowSelectNodes }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <div id="auto-detect-volume-radio-group-node-selector">
        <Radio
          label={
            <>
              {t('Disks on all nodes')} {'('}
              {t('{{nodes, number}} node', {
                nodes: allNodes.length,
                count: allNodes.length,
              })}
              {')'}
            </>
          }
          name="nodes-selection"
          id="auto-detect-volume-radio-all-nodes"
          className="odf-lvd-body__all-nodes-radio--padding"
          value="allNodes"
          onChange={setShowSelectNodes}
          description={t('Discovers available disks on all nodes.')}
          checked={!showSelectNodes}
        />
        <Radio
          label={t('Disks on selected nodes')}
          name="nodes-selection"
          id="auto-detect-volume-radio-select-nodes"
          value="selectedNodes"
          onChange={setShowSelectNodes}
          description={t(
            'Allows you to limit the discovery for available disks to specific nodes.'
          )}
          checked={showSelectNodes}
        />
      </div>
      {showSelectNodes && (
        <div className="odf-lvd-body__select-nodes">
          <SelectNodesTable
            nodes={[]}
            onRowSelected={setSelectNodes}
            systemNamespace={''}
          />
        </div>
      )}
    </>
  );
};

type LocalVolumeDiscoveryBodyProps = {
  allNodes: WizardNodeState[];
  selectNodes: WizardNodeState[];
  showSelectNodes: boolean;
  setSelectNodes: (nodes: NodeData[]) => void;
  setShowSelectNodes: (boolean) => void;
  taintsFilter?: (node: WizardNodeState) => boolean;
};

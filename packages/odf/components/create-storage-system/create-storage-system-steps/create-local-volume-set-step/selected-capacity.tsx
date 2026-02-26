import * as React from 'react';
import {
  calculateRadius,
  createWizardNodeState,
} from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { DiscoveredDisk, DiskMetadata, NodeData } from '@odf/core/types';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { ChartDonut, ChartLabel } from '@patternfly/react-charts/victory';
import * as _ from 'lodash-es';
import { Button } from '@patternfly/react-core';
import { WizardState, WizardDispatch } from '../../reducer';
import { SelectedNodesTable } from '../capacity-and-nodes-step/selected-nodes-table';
import { Modal, DiskListModal } from './disk-list-modal';
import './selected-capacity.scss';

const getTotalCapacity = (disks: DiscoveredDisk[]): number =>
  disks.reduce((total: number, disk: DiskMetadata) => total + disk.size, 0);

export const SelectedCapacity: React.FC<SelectedCapacityProps> = ({
  state,
  chartDisks,
  allDiscoveredDisks,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [showNodeList, setShowNodeList] = React.useState(false);
  const [showDiskList, setShowDiskList] = React.useState(false);

  React.useEffect(() => {
    const chartNodes: Set<string> = chartDisks.reduce(
      (data: Set<string>, disk: DiscoveredDisk) => data.add(disk.node),
      new Set()
    );
    if (!_.isEqual(chartNodes, state.chartNodes)) {
      dispatch({
        type: 'wizard/setCreateLocalVolumeSet',
        payload: { field: 'chartNodes', value: chartNodes },
      });
    }
  }, [chartDisks, dispatch, state.chartNodes]);

  const totalCapacity = getTotalCapacity(allDiscoveredDisks);
  const selectedCapacity = getTotalCapacity(chartDisks);

  const donutData = [
    { x: 'Selected', y: selectedCapacity },
    {
      x: 'Available',
      y: Number(totalCapacity) - Number(selectedCapacity),
    },
  ];
  const { podStatusOuterRadius: radius } = calculateRadius(220);

  return (
    <div className="odf-install__chart-wrapper">
      <div className="odf-install_capacity-header">
        {t('Selected capacity')}
      </div>
      <div className="odf-install__stats">
        <Button
          variant="link"
          isDisabled={!state.chartNodes.size}
          onClick={() => setShowNodeList(true)}
          className="odf-install__node-list-btn"
        >
          {t('{{nodes, number}} Node', {
            nodes: state.chartNodes.size,
            count: state.chartNodes.size,
          })}
        </Button>
        <div className="odf-install_stats--divider" />
        <Button
          variant="link"
          isDisabled={!chartDisks.length}
          onClick={() => setShowDiskList(true)}
          className="odf-install__disk-list-btn"
        >
          {t('{{disks, number}} Disk', {
            disks: chartDisks.length,
            count: chartDisks.length,
          })}
        </Button>
      </div>
      <ChartDonut
        ariaDesc={t('Selected versus Available Capacity')}
        ariaTitle={t('Selected versus Available Capacity')}
        height={220}
        width={220}
        radius={radius}
        data={donutData}
        labels={({ datum }) =>
          `${humanizeBinaryBytes(datum.y).string} ${datum.x}`
        }
        subTitle={t('Out of {{capacity}}', {
          capacity: humanizeBinaryBytes(totalCapacity).string,
        })}
        title={humanizeBinaryBytes(selectedCapacity).string}
        constrainToVisibleArea
        subTitleComponent={
          <ChartLabel dy={5} style={{ fill: `var(--pf-t--color--gray--50)` }} />
        }
      />
      <DiskListModal
        showDiskList={showDiskList}
        disks={chartDisks}
        onCancel={() => setShowDiskList(false)}
      />
      <NodeListModal
        showNodeList={showNodeList}
        filteredNodes={state.chartNodes}
        onCancel={() => setShowNodeList(false)}
      />
    </div>
  );
};

type SelectedCapacityProps = {
  state: WizardState['createLocalVolumeSet'];
  dispatch: WizardDispatch;
  chartDisks: DiscoveredDisk[];
  allDiscoveredDisks: DiscoveredDisk[];
};

const filterNodes = (nodesData: NodeData[], filteredNodes: Set<string>) => {
  const filteredData = nodesData?.filter((node: NodeData) =>
    filteredNodes.has(getName(node))
  );
  return createWizardNodeState(filteredData);
};

const NodeListModal: React.FC<NodeListModalProps> = ({
  filteredNodes,
  onCancel,
  showNodeList,
}) => {
  const { t } = useCustomTranslation();

  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData();
  const filteredData = React.useMemo(
    () => filterNodes(nodesData, filteredNodes),
    [nodesData, filteredNodes]
  );

  return (
    <Modal
      title={t('Selected nodes')}
      isOpen={showNodeList}
      onClose={onCancel}
      className="odf-install__filtered-modal"
      actions={[
        <Button key="confirm" variant="primary" onClick={onCancel}>
          {t('Close')}
        </Button>,
      ]}
    >
      <StatusBox
        skeleton={<div className="loading-skeleton--table" />}
        data={nodesData}
        loaded={nodesLoaded}
        loadError={nodesLoadError}
      >
        <SelectedNodesTable data={filteredData} showDetails={false} />
      </StatusBox>
    </Modal>
  );
};

type NodeListModalProps = {
  showNodeList: boolean;
  filteredNodes: Set<string>;
  onCancel: () => void;
};

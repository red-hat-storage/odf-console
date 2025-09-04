import * as React from 'react';
import {
  getTotalCpu,
  getTotalMemory,
  pluralize,
} from '@odf/core/components/utils';
import { getAllZone } from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes, isArbiterNode } from '@odf/shared/utils';
import { TextContent, Text } from '@patternfly/react-core';
import { WizardNodeState } from '../reducer';

export const SelectNodesTableFooter: React.FC<SelectNodesDetailsProps> =
  React.memo(({ nodes, isTwoNodesOneArbiterCluster }) => {
    const { t } = useCustomTranslation();

    const filteredNodes = isTwoNodesOneArbiterCluster
      ? nodes.filter((n) => !isArbiterNode(n))
      : nodes;
    const totalCpu = getTotalCpu(filteredNodes);
    const totalMemory = getTotalMemory(filteredNodes);
    const zones = getAllZone(filteredNodes);
    // eg: pluralize(3, "node", "nodes", true) => "3 nodes"
    const nodesWithCountStr = pluralize(
      filteredNodes.length,
      'node',
      'nodes',
      true
    );
    const zonesWithCountStr = pluralize(zones.size, 'zone', 'zones', true);
    return (
      <TextContent>
        <Text data-test-id="nodes-selected">
          {t('{{nodeStr}}', {
            nodeStr: nodesWithCountStr,
          })}{' '}
          {t('selected ({{cpu}} CPUs and {{memory}} on ', {
            cpu: totalCpu,
            memory: humanizeBinaryBytes(totalMemory).string,
          })}
          {t('{{zoneStr}}', {
            zoneStr: zonesWithCountStr,
          })}
          {')'}
          {isTwoNodesOneArbiterCluster ? t(' + 1 arbiter detcted') : ''}
        </Text>
      </TextContent>
    );
  });
SelectNodesTableFooter.displayName = 'SelectNodesTableFooter';

type SelectNodesDetailsProps = {
  nodes: WizardNodeState[];
  isTwoNodesOneArbiterCluster: boolean;
};

import * as React from 'react';
import { getTotalCpu, getTotalMemory } from '@odf/core/components/utils';
import { getAllZone } from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { Content } from '@patternfly/react-core';
import { WizardNodeState } from '../reducer';

export const SelectNodesTableFooter: React.FC<SelectNodesDetailsProps> =
  React.memo(({ nodes }) => {
    const { t } = useCustomTranslation();

    const totalCpu = getTotalCpu(nodes);
    const totalMemory = getTotalMemory(nodes);
    const zones = getAllZone(nodes);

    return (
      <Content>
        <Content component="p" data-test-id="nodes-selected">
          {t('{{nodeCount, number}} node', {
            nodeCount: nodes.length,
            count: nodes.length,
          })}{' '}
          {t('selected ({{cpu}} CPUs and {{memory}} on ', {
            cpu: totalCpu,
            memory: humanizeBinaryBytes(totalMemory).string,
          })}
          {t('{{zoneCount, number}} zone', {
            zoneCount: zones.size,
            count: zones.size,
          })}
          {')'}
        </Content>
      </Content>
    );
  });
SelectNodesTableFooter.displayName = 'SelectNodesTableFooter';

type SelectNodesDetailsProps = {
  nodes: WizardNodeState[];
};

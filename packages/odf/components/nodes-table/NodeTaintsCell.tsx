import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { getName } from '@odf/shared/selectors';
import { Taint } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button, Popover } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

type NodeTaintsCellProps = {
  node: NodeData;
};

/**
 * Renders a node's taints as a "{n} taints" link that opens a popover listing
 * each taint's Key / Value / Effect. Shows "-" when the node has no taints.
 * Shared across the SAN and Scale node-selection tables.
 */
export const NodeTaintsCell: React.FC<NodeTaintsCellProps> = ({ node }) => {
  const { t } = useCustomTranslation();
  const taints: Taint[] = node.spec?.taints ?? [];

  if (taints.length === 0) {
    return <>{'-'}</>;
  }

  const nodeName = getName(node);
  const title = t('Taints on {{nodeName}}', { nodeName });

  return (
    <Popover
      aria-label={title}
      headerContent={title}
      hasAutoWidth
      bodyContent={
        <Table variant="compact" borders={false} aria-label={title}>
          <Thead>
            <Tr>
              <Th>{t('Key')}</Th>
              <Th>{t('Value')}</Th>
              <Th>{t('Effect')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {taints.map((taint, index) => (
              <Tr key={`${taint.key}-${taint.effect}-${index}`}>
                <Td dataLabel={t('Key')}>{taint.key}</Td>
                <Td dataLabel={t('Value')}>{taint.value || ''}</Td>
                <Td dataLabel={t('Effect')}>{taint.effect}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      }
    >
      <Button variant="link" isInline data-test="node-taints-link">
        {t('{{count}} taints', { count: taints.length })}
      </Button>
    </Popover>
  );
};

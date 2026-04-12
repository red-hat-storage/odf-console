import * as React from 'react';
import { ERASURE_CODING_SCHEMES } from '@odf/core/constants';
import type { ErasureCodingScheme } from '@odf/core/types';
import {
  getStorageOverheadPercent,
  isRecommendedScheme,
} from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { Badge } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';

export type ErasureCodingTableProps = {
  nodeCount: number;
  selectedScheme: ErasureCodingScheme | null;
  onSelectScheme: (scheme: ErasureCodingScheme) => void;
  rawCapacityBytes?: number | null;
  showOnlySchemeAndOverhead?: boolean;
};

export const ErasureCodingTable: React.FC<ErasureCodingTableProps> = ({
  nodeCount,
  selectedScheme,
  onSelectScheme,
  rawCapacityBytes,
  showOnlySchemeAndOverhead = false,
}) => {
  const { t } = useCustomTranslation();

  const columnNames = {
    scheme: t('Scheme (k+m)'),
    storageOverhead: t('Storage overhead'),
    effectiveCapacity: t('Effective capacity'),
  };

  const rows = React.useMemo(() => {
    const schemes = ERASURE_CODING_SCHEMES.filter(
      (scheme) => nodeCount >= scheme.k + scheme.m
    );
    return schemes.map((scheme) => {
      const recommended = isRecommendedScheme(scheme, nodeCount);
      // effective data capacity = raw * k/(k+m): in a k+m EC scheme, k parts carry data (data chunks) and m parts parity (coding chunks),
      // so only k/(k+m) of rawCapacityBytes approximates effective usable space available for user data.
      const effectiveBytes =
        rawCapacityBytes != null
          ? Math.floor((rawCapacityBytes * scheme.k) / (scheme.k + scheme.m))
          : null;
      return {
        k: scheme.k,
        m: scheme.m,
        schemeLabel: `${scheme.k}+${scheme.m}`,
        storageOverhead: `${getStorageOverheadPercent(scheme.k, scheme.m)}%`,
        effectiveCapacity:
          effectiveBytes != null
            ? humanizeBinaryBytes(effectiveBytes).string
            : '-',
        recommended,
      };
    });
  }, [nodeCount, rawCapacityBytes]);

  return (
    <Table aria-label={t('Erasure coding scheme selection')} variant="compact">
      <Thead>
        <Tr>
          <Th screenReaderText={t('Row select')} />
          <Th>{columnNames.scheme}</Th>
          <Th>{columnNames.storageOverhead}</Th>
          {!showOnlySchemeAndOverhead && (
            <Th>{columnNames.effectiveCapacity}</Th>
          )}
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row, rowIndex) => (
          <Tr key={`${row.k}+${row.m}`}>
            <Td
              select={{
                rowIndex,
                onSelect: () => onSelectScheme({ k: row.k, m: row.m }),
                isSelected:
                  selectedScheme?.k === row.k && selectedScheme?.m === row.m,
                isDisabled: false,
                variant: 'radio',
              }}
            />
            <Td dataLabel={columnNames.scheme}>
              {row.schemeLabel}
              {row.recommended && (
                <Badge key="recommended" className="pf-v6-u-ml-sm" isRead>
                  {t('Recommended')}
                </Badge>
              )}
            </Td>
            <Td dataLabel={columnNames.storageOverhead}>
              {row.storageOverhead}
            </Td>
            {!showOnlySchemeAndOverhead && (
              <Td dataLabel={columnNames.effectiveCapacity}>
                {row.effectiveCapacity}
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

import * as React from 'react';
import { ERASURE_CODING_SCHEMES } from '@odf/core/constants';
import type { ErasureCodingSchema } from '@odf/core/types';
import {
  getStorageOverheadPercent,
  isRecommendedSchema,
} from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import classNames from 'classnames';
import { Badge } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import './erasure-coding-schema-table.scss';

export type ErasureCodingSchemaTableProps = {
  nodeCount: number;
  selectedSchema: ErasureCodingSchema | null;
  onSelectSchema: (schema: ErasureCodingSchema) => void;
  /** Optional: raw capacity in bytes for effective capacity column (e.g. from capacity step). */
  rawCapacityBytes?: number | null;
  /** Day 2: when true, show only Scheme and Storage overhead columns (no effective capacity). */
  showOnlySchemeAndOverhead?: boolean;
};

export const ErasureCodingSchemaTable: React.FC<
  ErasureCodingSchemaTableProps
> = ({
  nodeCount,
  selectedSchema,
  onSelectSchema,
  rawCapacityBytes,
  showOnlySchemeAndOverhead = false,
}) => {
  const { t } = useCustomTranslation();

  const columnNames = {
    scheme: t('Scheme'),
    storageOverhead: t('Storage overhead'),
    effectiveCapacity: t('Effective capacity'),
  };

  const rows = React.useMemo(() => {
    const schemes = ERASURE_CODING_SCHEMES.filter(
      (s) => nodeCount >= s.k + s.m
    );
    return schemes.map((s) => {
      const recommended = isRecommendedSchema(s, nodeCount);
      const effectiveBytes =
        rawCapacityBytes != null
          ? Math.floor((rawCapacityBytes * s.k) / (s.k + s.m))
          : null;
      return {
        k: s.k,
        m: s.m,
        schemeLabel: `${s.k}+${s.m}`,
        storageOverhead: `${getStorageOverheadPercent(s.k, s.m)}%`,
        effectiveCapacity:
          effectiveBytes != null
            ? humanizeBinaryBytes(effectiveBytes).string
            : '—',
        recommended,
      };
    });
  }, [nodeCount, rawCapacityBytes]);

  return (
    <Table
      aria-label={t('Erasure coding scheme selection')}
      variant="compact"
      className={classNames('odf-erasure-coding-schema-table', {
        'odf-erasure-coding-schema-table--two-cols': showOnlySchemeAndOverhead,
      })}
    >
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
                onSelect: () => onSelectSchema({ k: row.k, m: row.m }),
                isSelected:
                  selectedSchema?.k === row.k && selectedSchema?.m === row.m,
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

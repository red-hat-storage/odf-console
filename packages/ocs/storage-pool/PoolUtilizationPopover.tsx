import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Popover, PopoverProps } from '@patternfly/react-core';
import { PoolType } from '../constants';
import { getPoolUtilizationState } from '../utils/pool-utilization';

export const PoolUtilizationPopover: React.FC<PoolUtilizationPopoverProps> = ({
  utilizationPercentage,
  poolType,
  poolName,
  hasAutoWidth = true,
  children,
}) => {
  const { t } = useCustomTranslation();
  const utilizationInfo = getPoolUtilizationState(utilizationPercentage, t);

  const dataTypeLabel =
    poolType === PoolType.BLOCK
      ? t('Block')
      : poolType === PoolType.FILESYSTEM
        ? t('Filesystem')
        : t('Unknown');

  const popoverBody = (
    <div>
      <p>
        <strong>{t('Data Type:')}</strong> {dataTypeLabel}
      </p>
      <p>
        <strong>{t('Pool:')}</strong> {poolName}
      </p>
      <p>
        <strong>{t('Utilization:')}</strong> {utilizationPercentage.toFixed(1)}%
      </p>
      {utilizationInfo.actionableMessage && (
        <p>
          <strong>{t('Action Required:')}</strong>{' '}
          {utilizationInfo.actionableMessage}
        </p>
      )}
      <p>
        {t(
          'Maximum available capacity varies by pool and depends on device class'
        )}
      </p>
    </div>
  );

  return (
    <Popover
      aria-label={t('Pool utilization information')}
      bodyContent={popoverBody}
      hasAutoWidth={hasAutoWidth}
    >
      {children}
    </Popover>
  );
};

type PoolUtilizationPopoverProps = {
  utilizationPercentage: number;
  poolType: PoolType;
  poolName: string;
  hasAutoWidth?: PopoverProps['hasAutoWidth'];
  children: React.ReactElement;
};

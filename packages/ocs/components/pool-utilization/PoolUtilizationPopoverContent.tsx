import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { Label } from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { PoolType } from '../../constants';
import { PoolRowData } from '../../types';

export type PoolUtilizationPopoverContentProps = {
  pool: PoolRowData;
};

export const PoolUtilizationPopoverContent: React.FC<
  PoolUtilizationPopoverContentProps
> = ({ pool }) => {
  const { t } = useCustomTranslation();
  const Icon = pool.critical ? ExclamationCircleIcon : ExclamationTriangleIcon;
  const iconColor = pool.critical ? dangerColor.value : warningColor.value;
  const volumeMode =
    pool.type === PoolType.BLOCK ? t('Block') : t('Filesystem');

  return (
    <div className="odf-pool-utilization-popover">
      <div className="odf-pool-utilization-popover__header">
        <Icon style={{ color: iconColor }} className="pf-v5-u-mr-sm" />
        <span className="odf-pool-utilization-popover__pool-name">
          {pool.metadata.name}
        </span>
      </div>
      <div className="odf-pool-utilization-popover__body">
        <div className="odf-pool-utilization-popover__item">
          <strong>{t('Used:')}</strong> {pool.usedCapacity}
          <Label
            variant="filled"
            color={pool.type === PoolType.BLOCK ? 'blue' : 'green'}
            className="pf-v5-u-ml-sm"
          >
            {volumeMode}
          </Label>
        </div>
        <div className="odf-pool-utilization-popover__item">
          <strong>{t('Maximum available:')}</strong> {pool.totalCapacity}
        </div>
        {pool.critical && (
          <div className="odf-pool-utilization-popover__message">
            {t(
              'Storage pool critically full. Add capacity to avoid disruptions'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

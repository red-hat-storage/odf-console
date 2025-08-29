import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  Label,
} from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens';
import { PoolType } from '../../../constants';
import { StoragePoolTableData } from './types';

export type PoolUtilizationPopoverContentProps = {
  pool: StoragePoolTableData;
};

export const PoolUtilizationPopoverContent: React.FC<
  PoolUtilizationPopoverContentProps
> = ({ pool }) => {
  const { t } = useCustomTranslation();
  const Icon = pool.critical ? ExclamationCircleIcon : ExclamationTriangleIcon;
  const iconColor = pool.critical ? dangerColor.value : warningColor.value;
  const volumeType =
    pool.type === PoolType.BLOCK ? t('Block') : t('Filesystem');

  return (
    <div>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        className="pf-v5-u-mb-sm"
      >
        <Icon style={{ color: iconColor }} />
        <span className="pf-v5-u-font-weight-bold">{pool.metadata.name}</span>
      </Flex>
      <DescriptionList isHorizontal>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Used:')}</DescriptionListTerm>
          <DescriptionListDescription>
            {pool.usedCapacity}
            <Label
              variant="filled"
              color={pool.type === PoolType.BLOCK ? 'blue' : 'green'}
              className="pf-v5-u-ml-sm"
            >
              {volumeType}
            </Label>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Maximum available:')}</DescriptionListTerm>
          <DescriptionListDescription>
            {pool.totalCapacity}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
      {pool.critical && (
        <div className="pf-v5-u-mt-sm pf-v5-u-color-200">
          {t('Storage pool critically full. Add capacity to avoid disruptions')}
        </div>
      )}
    </div>
  );
};

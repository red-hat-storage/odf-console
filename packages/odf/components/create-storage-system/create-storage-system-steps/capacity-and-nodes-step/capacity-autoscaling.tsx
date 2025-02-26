import * as React from 'react';
import { OSD_CAPACITY_SIZES } from '@odf/core/constants';
import {
  useCustomTranslation,
  TypeaheadDropdown,
  CAPACITY_AUTOSCALING_LIMIT_IN_TIB,
  CAPACITY_OSD_MAX_SIZE_IN_TIB,
  StorageSizeUnit,
} from '@odf/shared';
import { getFormattedCapacity } from '@odf/shared/utils';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  Popover,
  SelectOptionProps,
} from '@patternfly/react-core';
import './capacity-autoscaling.scss';

const getItem = (value: number) => ({
  value: `${value}${StorageSizeUnit.Ti}`,
  children: getFormattedCapacity(`${value}${StorageSizeUnit.Ti}`),
});

const getCapacityDropdownItems = (
  osdAmount: number,
  osdSize: number,
  maxOsdSize = CAPACITY_OSD_MAX_SIZE_IN_TIB,
  capacityLimit = CAPACITY_AUTOSCALING_LIMIT_IN_TIB
): SelectOptionProps[] => {
  const items = [];
  let capacity: number;

  // Vertical scaling.
  while (osdSize * 2 <= maxOsdSize) {
    osdSize *= 2;
    capacity = osdSize * osdAmount;
    items.push(getItem(capacity));
  }

  // Horizontal scaling.
  if (items.length > 0) {
    while (capacity + osdSize * osdAmount <= capacityLimit) {
      capacity += osdSize * osdAmount;
      items.push(getItem(capacity));
    }
  }

  return items;
};

type CapacityAutoScalingProps = {
  capacityLimit: string;
  className?: string;
  enable: boolean;
  isEditView?: boolean;
  onChange: (_ev: React.FormEvent<HTMLInputElement>, checked: boolean) => void;
  onLimitSelect: (selected: string) => void;
  osdAmount: number;
  osdSize: string;
};

export const CapacityAutoScaling: React.FC<CapacityAutoScalingProps> = ({
  capacityLimit,
  className,
  enable,
  isEditView = false,
  onChange,
  onLimitSelect,
  osdAmount,
  osdSize,
}) => {
  const { t } = useCustomTranslation();
  const capacityItems = React.useMemo(
    () => getCapacityDropdownItems(osdAmount, OSD_CAPACITY_SIZES[osdSize]),
    [osdAmount, osdSize]
  );

  return (
    <div className={className}>
      {!isEditView && (
        <div className="pf-v5-u-font-family-heading pf-v5-u-mb-sm">
          {t('Smart capacity scaling')}
        </div>
      )}
      <Checkbox
        label={t('Enable smart capacity scaling for your cluster')}
        description={
          <div>
            {t(
              'Opt-in to automatically add additional raw capacity equivalent to the configured deployment size whenever used capacity reaches 70%. This ensures your deployment scales seamlessly to meet demand.'
            )}
            <Popover
              aria-label={t('How does smart scaling work?')}
              bodyContent={t(
                'Smart scaling adds capacity through OSD expansion by resizing existing OSDs or adding new OSDs to maintain node balance.'
              )}
              footerContent={
                <>
                  <span className="pf-v5-u-font-weight-bold pf-v5-u-mr-xs">
                    {t('Note:')}
                  </span>
                  {t(
                    `OSD expansion is limited to a maximum of ${getFormattedCapacity(
                      `${CAPACITY_OSD_MAX_SIZE_IN_TIB}${StorageSizeUnit.Ti}`
                    )}.`
                  )}
                </>
              }
            >
              <Button
                className="odf-capacity-autoscaling__popover-link"
                variant={ButtonVariant.link}
              >
                {t('How does it work?')}
              </Button>
            </Popover>
          </div>
        }
        id="capacity-autoscaling"
        data-checked-state={enable}
        isChecked={enable}
        onChange={onChange}
      />
      {enable && (
        <div className="odf-capacity-limit__section">
          <Alert
            title={t(
              'This may incur additional costs for the underlying storage.'
            )}
            variant={AlertVariant.info}
          />
          <div className="pf-v5-u-font-family-heading">
            {t('Cluster expansion limit')}
          </div>
          <div>
            {t(
              'The maximum limit to which the cluster can expand in the cloud. Smart scaling is suspended if exceeded.'
            )}
          </div>
          <TypeaheadDropdown
            ariaLabel={t(
              'Select the maximum limit to which the cluster can expand.'
            )}
            className="odf-capacity-limit__selector"
            id="cluster-capacity-limit"
            items={capacityItems}
            onSelect={onLimitSelect}
            placeholder="Select the maximum limit to which the cluster can expand"
            selectedValue={capacityLimit}
          />
        </div>
      )}
    </div>
  );
};

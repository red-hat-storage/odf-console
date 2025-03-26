import * as React from 'react';
import {
  useCustomTranslation,
  TypeaheadDropdown,
  CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB,
  CAPACITY_OSD_MAX_SIZE_IN_TIB,
  StorageSizeUnit,
} from '@odf/shared';
import {
  getFormattedCapacity,
  getStorageSizeInTiBWithoutUnit,
} from '@odf/shared/utils';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  Label,
  Popover,
  SelectOptionProps,
} from '@patternfly/react-core';
import './capacity-autoscaling.scss';
import { InfoCircleIcon } from '@patternfly/react-icons';

const getItem = (capacityLimit: number) => {
  const limit = Number.isInteger(capacityLimit)
    ? capacityLimit
    : capacityLimit.toFixed(2);
  return {
    'data-limit': limit,
    value: `${limit}${StorageSizeUnit.Ti}`,
    children: getFormattedCapacity(`${limit}${StorageSizeUnit.Ti}`),
  };
};

const getCapacityLimitDropdownItems = (
  osdAmount: number,
  osdSize: number,
  capacityLimit: string
): SelectOptionProps[] => {
  const items = [];
  let capacity: number;

  if (osdSize <= 0 || osdAmount <= 0) {
    return items;
  }

  // Vertical scaling.
  while (osdSize * 2 <= CAPACITY_OSD_MAX_SIZE_IN_TIB) {
    osdSize *= 2;
    capacity = osdSize * osdAmount;
    items.push(getItem(capacity));
  }

  // Horizontal scaling.
  while (
    capacity + osdSize * osdAmount <=
    CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB
  ) {
    capacity += osdSize * osdAmount;
    items.push(getItem(capacity));
  }

  // If capacity limit has been set via CLI and not already included
  // in the items, we include it:
  const itemValues = items.map((item) => item.value);
  if (capacityLimit && !itemValues.includes(capacityLimit)) {
    items.push(getItem(getStorageSizeInTiBWithoutUnit(capacityLimit)));
    items.sort((a, b) => a['data-limit'] - b['data-limit']);
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
    () =>
      getCapacityLimitDropdownItems(
        osdAmount,
        getStorageSizeInTiBWithoutUnit(osdSize),
        capacityLimit
      ),
    [capacityLimit, osdAmount, osdSize]
  );
  const capacityLimitPlaceHolder = t(
    'Select the maximum limit to which the cluster can expand.'
  );
  return (
    <div className={className}>
      {!isEditView && (
        <div className="pf-v5-u-font-family-heading pf-v5-u-mb-sm">
          {t('Smart capacity scaling')}
        </div>
      )}
      <Checkbox
        label={
          <span>
            {t('Enable smart capacity scaling for your cluster')}
            {isEditView && (
              <Label
                color="cyan"
                className="pf-v5-u-ml-sm pf-v5-u-font-size-sm"
                icon={<InfoCircleIcon />}
                isCompact
              >
                {t('incur additional costs')}
              </Label>
            )}
          </span>
        }
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
                    'OSD expansion is limited to a maximum of {{osdMaxSize}}.',
                    {
                      osdMaxSize: getFormattedCapacity(
                        `${CAPACITY_OSD_MAX_SIZE_IN_TIB}${StorageSizeUnit.Ti}`
                      ),
                    }
                  )}
                </>
              }
            >
              <Button
                className="odf-capacity-autoscaling__popover-link pf-v5-u-font-size-sm"
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
            isInline
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
            ariaLabel={capacityLimitPlaceHolder}
            className="odf-capacity-limit__selector"
            id="cluster-capacity-limit"
            items={capacityItems}
            onSelect={onLimitSelect}
            placeholder={capacityLimitPlaceHolder}
            selectedValue={capacityLimit}
          />
        </div>
      )}
    </div>
  );
};

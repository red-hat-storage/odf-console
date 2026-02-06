import * as React from 'react';
import {
  useCustomTranslation,
  TypeaheadDropdown,
  CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB,
  CAPACITY_OSD_MAX_SIZE_IN_TIB,
  StorageSizeUnit,
} from '@odf/shared';
import {
  formatCapacityText,
  formatCapacityValue,
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

const getItem = (capacityLimit: number) => ({
  'data-limit': capacityLimit,
  value: formatCapacityValue(`${capacityLimit}${StorageSizeUnit.Ti}`),
  children: formatCapacityText(`${capacityLimit}${StorageSizeUnit.Ti}`),
});

const getCapacityLimitDropdownItems = (
  osdAmount: number,
  osdSize: number,
  capacityLimit: string
): SelectOptionProps[] => {
  const items = [];
  if (osdSize <= 0 || osdAmount <= 0) {
    return items;
  }

  let capacity = osdSize * osdAmount;

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
        <div className="pf-v6-u-font-family-heading pf-v6-u-mb-sm">
          {t('Automatic capacity scaling')}
        </div>
      )}
      <Checkbox
        label={
          <span>
            {t('Enable automatic capacity scaling for your cluster')}
            {isEditView && (
              <Label
                color="teal"
                className="pf-v6-u-ml-sm pf-v6-u-font-size-sm"
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
              aria-label={t('How does automatic capacity scaling work?')}
              bodyContent={t(
                'Automatic capacity scaling adds capacity through OSD expansion by resizing existing OSDs or adding new OSDs to maintain node balance.'
              )}
              footerContent={
                <>
                  <span className="pf-v6-u-font-weight-bold pf-v6-u-mr-xs">
                    {t('Note:')}
                  </span>
                  {t(
                    'OSD expansion is limited to a maximum of {{osdMaxSize}}.',
                    {
                      osdMaxSize: formatCapacityText(
                        `${CAPACITY_OSD_MAX_SIZE_IN_TIB}${StorageSizeUnit.Ti}`
                      ),
                    }
                  )}
                </>
              }
            >
              <Button
                className="odf-capacity-autoscaling__popover-link pf-v6-u-font-size-sm"
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
          <div className="pf-v6-u-font-family-heading">
            {t('Cluster expansion limit')}
          </div>
          <div>
            {t(
              'The maximum limit to which the cluster can expand in the cloud. Automatic capacity scaling is suspended if exceeded.'
            )}
          </div>
          <TypeaheadDropdown
            ariaLabel={capacityLimitPlaceHolder}
            className="odf-capacity-limit__selector"
            id="cluster-capacity-limit"
            items={capacityItems}
            onSelect={onLimitSelect}
            placeholder={capacityLimitPlaceHolder}
            selectedValue={formatCapacityValue(capacityLimit)}
          />
        </div>
      )}
    </div>
  );
};

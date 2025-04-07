import * as React from 'react';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import {
  StorageSizeUnit,
  StorageSizeUnitName,
} from '@odf/shared/types/storage';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getStorageSizeInTiBWithoutUnit } from '@odf/shared/utils';
import { SelectOption } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import '../../style.scss';

const valueLabelMap = (t: TFunction) => {
  return {
    // value (stored in redux-state): label (visible on UI)
    [`512${StorageSizeUnit.Gi}`]: t('0.5 {{sizeUnit}}', {
      sizeUnit: StorageSizeUnitName.TiB,
    }),
    [`1${StorageSizeUnit.Ti}`]: t('1 {{sizeUnit}}', {
      sizeUnit: StorageSizeUnitName.TiB,
    }),
    [`2${StorageSizeUnit.Ti}`]: t('2 {{sizeUnit}}', {
      sizeUnit: StorageSizeUnitName.TiB,
    }),
    [`4${StorageSizeUnit.Ti}`]: t('4 {{sizeUnit}}', {
      sizeUnit: StorageSizeUnitName.TiB,
    }),
    [`8${StorageSizeUnit.Ti}`]: t('8 {{sizeUnit}}', {
      sizeUnit: StorageSizeUnitName.TiB,
    }),
  } as const;
};

const labelDescriptionMap = (t: TFunction) => {
  return {
    // label (visible on UI) : description to show below each label
    [t(`0.5 ${StorageSizeUnitName.TiB}`)]: t('ExtraSmallScale'),
    [t(`1 ${StorageSizeUnitName.TiB}`)]: t('SmallScale'),
    [t(`2 ${StorageSizeUnitName.TiB}`)]: t('Standard'),
    [t(`4 ${StorageSizeUnitName.TiB}`)]: t('LargeScale'),
    [t(`8 ${StorageSizeUnitName.TiB}`)]: t('ExtraLargeScale'),
  } as const;
};

const dropdownOptions: (t: TFunction) => JSX.Element[] = (t) =>
  _.map(valueLabelMap(t), (v, _unused) => (
    <SelectOption
      data-test-dropdown-menu={v}
      key={v}
      value={v}
      description={labelDescriptionMap(t)[v]}
    />
  ));

export const TotalCapacityText: React.FC<TotalCapacityTextProps> = ({
  capacity,
  replica,
}) => {
  const { t } = useCustomTranslation();

  return (
    <span>
      {t(
        'x {{replica}} replicas = {{osdSize, number(maximumFractionDigits: 2)}} {{sizeUnit}}',
        {
          replica,
          osdSize: getStorageSizeInTiBWithoutUnit(capacity) * replica,
          sizeUnit: StorageSizeUnitName.TiB,
        }
      )}
    </span>
  );
};

type TotalCapacityTextProps = { capacity: string; replica: number };

export const OSDSizeDropdown: React.FC<OSDSizeDropdownProps> = ({
  selectedKey,
  id,
  onChange,
}) => {
  const { t } = useCustomTranslation();

  return (
    <SingleSelectDropdown
      id={id}
      selectOptions={dropdownOptions(t)}
      onChange={onChange}
      selectedKey={valueLabelMap(t)[selectedKey]}
      className="dropdown--full-width"
      valueLabelMap={valueLabelMap(t)}
      data-test-id="dropdown-button"
    />
  );
};

type OSDSizeDropdownProps = {
  selectedKey: string;
  id?: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  'data-test-id'?: string;
};

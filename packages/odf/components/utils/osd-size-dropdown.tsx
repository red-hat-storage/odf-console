import * as React from 'react';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { SelectOption } from '@patternfly/react-core';
import { OSD_CAPACITY_SIZES } from '../../constants';
import '../../style.scss';

const valueLabelMap = (t: TFunction) => {
  return {
    // value (stored in redux-state): label (visible on UI)
    '512Gi': t('0.5 TiB'),
    '2Ti': t('2 TiB'),
    '4Ti': t('4 TiB'),
  } as const;
};

const labelDescriptionMap = (t: TFunction) => {
  return {
    // label (visible on UI) : description to show below each label
    [t('0.5 TiB')]: t('SmallScale'),
    [t('2 TiB')]: t('Standard'),
    [t('4 TiB')]: t('LargeScale'),
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
      {t('x {{replica}} replicas = {{osdSize, number}} TiB', {
        replica,
        osdSize: OSD_CAPACITY_SIZES[capacity] * replica,
      })}
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

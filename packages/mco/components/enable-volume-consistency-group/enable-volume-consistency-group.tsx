import * as React from 'react';
import { TFunction } from 'react-i18next';
import { Checkbox } from '@patternfly/react-core';

type VolumeConsistencyCheckboxProps = {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  t: TFunction;
};

export const VolumeConsistencyCheckbox: React.FC<
  VolumeConsistencyCheckboxProps
> = ({ isChecked, onChange, t }) => {
  const handleChange = (
    _event: React.FormEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    onChange(checked);
  };

  return (
    <Checkbox
      id="enable-volume-consistency-groups"
      label={t('Enable disaster recovery for volume consistency groups')}
      description={t(
        'Protect applications deployed across multiple volumes and ensure consistent recovery with volume consistency groups.'
      )}
      isChecked={isChecked}
      onChange={handleChange}
    />
  );
};

import * as React from 'react';
import { FEATURES } from '@odf/core/features';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  useFlag,
  ProvisionerProps,
} from '@openshift-console/dynamic-plugin-sdk';
import { Checkbox } from '@patternfly/react-core';

import './sc-form.scss';

export const ThickProvision: React.FC<ProvisionerProps> = ({
  parameterKey,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();
  const isThickProvisionSupported = useFlag(FEATURES.OCS_THICK_PROVISION);

  const [checked, isChecked] = React.useState(false);

  const setChecked = (value: boolean) => {
    onParamChange(parameterKey, value.toString(), false);
    isChecked(value);
  };

  return (
    isThickProvisionSupported && (
      <div className="ocs-storage-class__form">
        <Checkbox
          id="ocs-sc-thickprovision-checkbox"
          data-test="ocs-sc-thickprovision-checkbox"
          isChecked={checked}
          data-checked-state={checked}
          label={t('Enable Thick Provisioning')}
          onChange={setChecked}
        />
        <span className="help-block">
          {t(
            'By enabling thick-provisioning, volumes will allocate the requested capacity upon volume creation. Volume creation will be slower when thick-provisioning is enabled.'
          )}
        </span>
      </div>
    )
  );
};

import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ProvisionerProps } from '@openshift-console/dynamic-plugin-sdk';
import { Checkbox } from '@patternfly/react-core';

import './sc-form.scss';

export const ThickProvision: React.FC<ProvisionerProps> = ({
  parameterKey,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();
  // Setting the flag as "false" because this flag is missing from latest OCS CSV, which means this feature is currently disabled.
  // https://github.com/red-hat-storage/ocs-operator/blob/main/deploy/ocs-operator/manifests/ocs-operator.clusterserviceversion.yaml#L1593
  const isThickProvisionSupported = false;

  const [checked, isChecked] = React.useState(false);

  const setChecked = (value: boolean) => {
    onParamChange(parameterKey, value.toString(), false);
    isChecked(value);
  };

  return isThickProvisionSupported ? (
    <div className="ocs-storage-class__form">
      <Checkbox
        id="ocs-sc-thickprovision-checkbox"
        data-test="ocs-sc-thickprovision-checkbox"
        isChecked={checked}
        data-checked-state={checked}
        label={t('Enable Thick Provisioning')}
        onChange={(_event, value: boolean) => setChecked(value)}
      />
      <span className="help-block">
        {t(
          'By enabling thick-provisioning, volumes will allocate the requested capacity upon volume creation. Volume creation will be slower when thick-provisioning is enabled.'
        )}
      </span>
    </div>
  ) : null;
};

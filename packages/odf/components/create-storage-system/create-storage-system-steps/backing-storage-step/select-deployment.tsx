import * as React from 'react';
import { FDF_FLAG } from '@odf/core/redux';
import { BackingStorageType, DeploymentType } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import {
  Select,
  SelectOption,
  SelectProps,
  SelectVariant,
} from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import { FormGroup } from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

const options = (isFDF: boolean) => [
  DeploymentType.FULL,
  ...(isFDF ? [DeploymentType.PROVIDER_MODE] : []),
  DeploymentType.MCG,
];

const optionsDescription = (t: TFunction) => ({
  [DeploymentType.MCG]: t(
    'Deploys MultiCloud Object Gateway without block and file services.'
  ),
  [DeploymentType.FULL]: t(
    'Deploys Data Foundation with block, shared fileSystem and object services.'
  ),
  [DeploymentType.PROVIDER_MODE]: t(
    'Deploys Data Foundation as a provider cluster'
  ),
});

export const SelectDeployment: React.FC<SelectDeploymentProps> = ({
  deployment,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);

  const isFDF = useFlag(FDF_FLAG);

  const descriptions = optionsDescription(t);

  const handleSelection: SelectProps['onSelect'] = (_, value) => {
    dispatch({
      type: 'backingStorage/setDeployment',
      // 'value' on SelectProps['onSelect'] is string hence does not match with payload of type "DeploymentType"
      payload: value as DeploymentType,
    });
    if (value === DeploymentType.PROVIDER_MODE) {
      dispatch({
        type: 'backingStorage/setType',
        payload: BackingStorageType.EXISTING,
      });
    }
    setIsSelectOpen(false);
  };

  const handleToggling: SelectProps['onToggle'] = (
    _event,
    isExpanded: boolean
  ) => setIsSelectOpen(isExpanded);

  const selectOptions = options(isFDF).map((option) => (
    <SelectOption
      key={option}
      value={option}
      description={descriptions[option]}
    />
  ));

  return (
    <FormGroup label={t('Deployment type')} fieldId="deployment-type">
      <Select
        className="odf-backing-storage__selection--width"
        variant={SelectVariant.single}
        onToggle={(_event, isExpanded: boolean) =>
          handleToggling(_event, isExpanded)
        }
        onSelect={handleSelection}
        selections={deployment}
        isOpen={isSelectOpen}
      >
        {selectOptions}
      </Select>
    </FormGroup>
  );
};

type SelectDeploymentProps = {
  dispatch: WizardDispatch;
  deployment: WizardState['backingStorage']['deployment'];
};

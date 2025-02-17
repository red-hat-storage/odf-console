import * as React from 'react';
import { DeploymentType } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Select,
  SelectOption,
  SelectProps,
  SelectVariant,
} from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { FormGroup } from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

const selectOptions = (t: TFunction) => {
  const options = [DeploymentType.FULL, DeploymentType.MCG];

  const optionsDescription = {
    [DeploymentType.MCG]: t(
      'Deploys MultiCloud Object Gateway without block and file services.'
    ),
    [DeploymentType.FULL]: t(
      'Deploys Data Foundation with block, shared fileSystem and object services.'
    ),
  };

  return options.map((option) => (
    <SelectOption
      key={option}
      value={option}
      description={optionsDescription[option]}
    >
      {t(option)}
    </SelectOption>
  ));
};

export const SelectDeployment: React.FC<SelectDeploymentProps> = ({
  deployment,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);

  const handleSelection: SelectProps['onSelect'] = (_, value) => {
    dispatch({
      type: 'backingStorage/setDeployment',
      // 'value' on SelectProps['onSelect'] is string hence does not match with payload of type "DeploymentType"
      payload: value as DeploymentType,
    });
    setIsSelectOpen(false);
  };

  const handleToggling: SelectProps['onToggle'] = (
    _event,
    isExpanded: boolean
  ) => setIsSelectOpen(isExpanded);

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
        {selectOptions(t)}
      </Select>
    </FormGroup>
  );
};

type SelectDeploymentProps = {
  dispatch: WizardDispatch;
  deployment: WizardState['backingStorage']['deployment'];
};

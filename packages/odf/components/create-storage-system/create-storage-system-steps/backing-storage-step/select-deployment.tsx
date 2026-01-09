import * as React from 'react';
import { DeploymentType } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import { Select, SelectOption, SelectProps } from '@patternfly/react-core';
import {
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  SelectList,
} from '@patternfly/react-core';
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
      {option}
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

  const onToggleClick = () => {
    setIsSelectOpen(!isSelectOpen);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isSelectOpen}
      className="odf-backing-storage__selection--width"
      isFullWidth
    >
      {deployment}
    </MenuToggle>
  );

  return (
    <FormGroup label={t('Deployment type')} fieldId="deployment-type">
      <Select
        onSelect={handleSelection}
        selected={deployment}
        isOpen={isSelectOpen}
        onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
        toggle={toggle}
        shouldFocusToggleOnSelect
        popperProps={{ width: 'trigger' }}
      >
        <SelectList>{selectOptions(t)}</SelectList>
      </Select>
    </FormGroup>
  );
};

type SelectDeploymentProps = {
  dispatch: WizardDispatch;
  deployment: WizardState['backingStorage']['deployment'];
};

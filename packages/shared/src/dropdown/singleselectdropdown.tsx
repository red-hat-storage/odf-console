import * as React from 'react';
import {
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
  MenuToggleStatus,
} from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const SingleSelectDropdown: React.FC<SingleSelectDropdownProps> = ({
  onChange,
  selectOptions,
  selectedKey = '',
  valueLabelMap,
  validated,
  ...props
}) => {
  const { t } = useCustomTranslation();

  const [isOpen, setIsOpen] = React.useState(false);
  const [newOptions, setNewOptions] = React.useState<JSX.Element[]>([]);
  const [status, setStatus] = React.useState<MenuToggleStatus>();

  React.useEffect(() => {
    let derivedValidated = '';
    derivedValidated = validated;
    if (derivedValidated === 'error') derivedValidated = 'danger';

    if (derivedValidated !== 'default') {
      setStatus(derivedValidated as MenuToggleStatus);
    } else {
      setStatus(undefined);
    }
  }, [validated]);

  const allOptions =
    newOptions.length > 0 ? selectOptions.concat(newOptions) : selectOptions;

  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    value: string | number | undefined
  ) => {
    const stringValue = String(value);

    const mappedValue = valueLabelMap
      ? Object.keys(valueLabelMap).find(
          (key) => valueLabelMap[key] === stringValue
        )
      : stringValue;

    onChange(mappedValue ?? '');
    setIsOpen(false);
  };

  const handleCreateOption = () => {
    const newValue = `New option ${newOptions.length + 1}`;
    const newOption = (
      <SelectOption key={newValue} value={newValue}>
        {newValue}
      </SelectOption>
    );
    setNewOptions([...newOptions, newOption]);
    onChange(newValue);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen((prev) => !prev)}
      isExpanded={isOpen}
      isDisabled={props.isDisabled}
      style={{ width: '700px' }}
      status={status}
    >
      {selectedKey || props.placeholderText || t('Select options')}
    </MenuToggle>
  );

  return (
    <div className="test" data-test={props['data-test']}>
      <Select
        id={props.id}
        isOpen={isOpen}
        selected={selectedKey}
        onSelect={onSelect}
        onOpenChange={(open) => setIsOpen(open)}
        toggle={toggle}
        shouldFocusToggleOnSelect
        popperProps={{ width: 'trigger' }}
      >
        <SelectList>
          {allOptions}
          {props.isCreatable && (
            <SelectOption
              key="create-option"
              value={t('Create new')}
              onClick={handleCreateOption}
            >
              {t('Create new')}
            </SelectOption>
          )}
        </SelectList>
      </Select>
    </div>
  );
};

export type SingleSelectDropdownProps = {
  id?: string;
  selectedKey?: string;
  placeholderText?: string;
  valueLabelMap?: { [key: string]: string };
  className?: string;
  selectOptions: JSX.Element[];
  onChange: (selected: string) => void;
  'data-test'?: string;
  onFilter?: (
    e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent,
    value: string
  ) => void;
  hasInlineFilter?: boolean;
  isDisabled?: boolean;
  validated?: 'success' | 'warning' | 'error' | 'default';
  required?: boolean;
  isCreatable?: boolean;
};

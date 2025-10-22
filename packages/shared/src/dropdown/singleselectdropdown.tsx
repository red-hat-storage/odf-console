import * as React from 'react';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import {
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
  MenuToggleStatus,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
} from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const SingleSelectDropdown: React.FC<SingleSelectDropdownProps> = ({
  onChange,
  selectOptions,
  selectedKey = '',
  validated,
  ...props
}) => {
  const { t } = useCustomTranslation();

  const [isOpen, setIsOpen] = React.useState(false);
  const [newOptions, setNewOptions] = React.useState<JSX.Element[]>([]);
  const [status, setStatus] = React.useState<MenuToggleStatus>();
  const [filterValue, setFilterValue] = React.useState('');
  const [inputValue, setInputValue] = React.useState('');

  // Show the correct label (e.g., "Balanced mode") for selectedKey
  React.useEffect(() => {
    if (selectedKey) {
      const matchedOption = React.Children.toArray(selectOptions).find(
        (opt: any) => opt.props?.value === selectedKey
      ) as React.ReactElement | undefined;

      if (matchedOption) {
        setInputValue(String(matchedOption.props.children));
      } else {
        setInputValue(selectedKey);
      }
    } else {
      setInputValue('');
    }
  }, [selectedKey, selectOptions]);

  //  Handle validation status mapping
  React.useEffect(() => {
    let derivedValidated = '';
    derivedValidated = validated;
    if (derivedValidated === 'error') derivedValidated = 'danger';
    if (derivedValidated && derivedValidated !== 'default') {
      setStatus(derivedValidated as MenuToggleStatus);
    } else {
      setStatus(undefined);
    }
  }, [validated]);

  //  Apply inline filter + isCreatable
  const filteredOptions = React.useMemo(() => {
    let options = selectOptions;
    if (props.hasInlineFilter && filterValue) {
      options = selectOptions.filter((option) =>
        String(option.props.children)
          .toLowerCase()
          .includes(filterValue.toLowerCase())
      );
      if (
        !props.isCreatable &&
        !selectOptions.some(
          (opt) =>
            String(opt.props.value).toLowerCase() === filterValue.toLowerCase()
        )
      ) {
        options = [
          // This option is only for display the token "no option found"
          ...options,
          <SelectOption key="disabled-options" value="__disabled__" isDisabled>
            {t('No option found')}
          </SelectOption>,
        ];
      } else if (
        props.isCreatable &&
        !selectOptions.some(
          (opt) =>
            String(opt.props.value).toLowerCase() === filterValue.toLowerCase()
        )
      ) {
        options = [
          ...options,
          <SelectOption key="create-option" value="__create__">
            {t(`Create "${filterValue}"`)}
          </SelectOption>,
        ];
      }
    }
    return options;
  }, [filterValue, props.hasInlineFilter, props.isCreatable, selectOptions, t]);

  const allOptions =
    newOptions.length > 0
      ? filteredOptions.concat(newOptions)
      : filteredOptions;

  //  Handle selection
  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    value: string | number | undefined
  ) => {
    if (!value) return;

    if (value === '__create__') {
      const newValue = filterValue.trim();
      if (newValue) {
        const newOption = (
          <SelectOption key={newValue} value={newValue}>
            {newValue}
          </SelectOption>
        );
        setNewOptions((prev) => [...prev, newOption]);
        onChange(newValue);
        setInputValue(newValue);
        setFilterValue('');
        setIsOpen(false);
      }
      return;
    }

    const stringValue = String(value);

    // find label from selectOptions for display
    const matchedOption = React.Children.toArray(selectOptions).find(
      (opt: any) => opt.props?.value === stringValue
    ) as React.ReactElement | undefined;

    const displayLabel = matchedOption
      ? String(matchedOption.props.children)
      : stringValue;

    onChange(stringValue);
    setInputValue(displayLabel);
    setIsOpen(false);
    setFilterValue('');
  };

  const onTextInputChange = (
    _e: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    setFilterValue(value);
    setInputValue(value);
  };

  const onClearButtonClick = () => {
    setFilterValue('');
    setInputValue('');
    onChange(''); // also reset parent
  };

  const onInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else if (!inputValue) {
      setIsOpen(false);
    }
  };

  //  Custom toggle renderer
  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    if (props.hasInlineFilter || props.isCreatable) {
      return (
        <MenuToggle
          ref={toggleRef}
          variant="typeahead"
          aria-label={props['aria-label'] || 'Options menu'}
          isExpanded={isOpen}
          isDisabled={props.isDisabled} // flag to indicate if the toggle is diabled or not.
          status={status}
          onClick={() => setIsOpen((prev) => !prev)}
          style={{ width: '700px' }}
        >
          <TextInputGroup isPlain>
            <TextInputGroupMain
              value={inputValue}
              onChange={onTextInputChange}
              onClick={onInputClick}
              placeholder={props.placeholderText || t('Select options')}
              autoComplete="off"
            />
            <TextInputGroupUtilities
              {...(!inputValue ? { style: { display: 'none' } } : {})}
            >
              <Button
                variant="plain"
                onClick={onClearButtonClick}
                aria-label="Clear input"
                icon={<TimesIcon />}
              />
            </TextInputGroupUtilities>
          </TextInputGroup>
        </MenuToggle>
      );
    }

    return (
      <MenuToggle
        ref={toggleRef}
        aria-label={props['aria-label'] || 'Typeahead single select'}
        onClick={() => setIsOpen((prev) => !prev)}
        isExpanded={isOpen}
        isDisabled={props.isDisabled}
        style={{ width: '700px' }}
        status={status}
      >
        {inputValue || props.placeholderText || t('Select options')}
      </MenuToggle>
    );
  };

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
        <SelectList>{allOptions}</SelectList>
      </Select>
    </div>
  );
};

// Props type
export type SingleSelectDropdownProps = {
  id?: string;
  selectedKey?: string;
  placeholderText?: string;
  valueLabelMap?: { [key: string]: string }; // optional, auto-handled
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
  'aria-label'?: string;
};

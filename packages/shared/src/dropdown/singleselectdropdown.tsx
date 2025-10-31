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
  className,
  valueLabelMap,
  ...props
}) => {
  const { t } = useCustomTranslation();

  const [isOpen, setIsOpen] = React.useState(false);
  const [newOptions, setNewOptions] = React.useState<JSX.Element[]>([]);
  const [status, setStatus] = React.useState<MenuToggleStatus>();
  const [filterValue, setFilterValue] = React.useState('');
  const [inputValue, setInputValue] = React.useState('');

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

  React.useEffect(() => {
    let derivedValidated = validated === 'error' ? 'danger' : validated;
    setStatus(
      derivedValidated && derivedValidated !== 'default'
        ? (derivedValidated as MenuToggleStatus)
        : undefined
    );
  }, [validated]);

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

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | React.ChangeEvent, selection: string) => {
      /**
       * For case when the dropdownitem that we want to show on UI (label)
       * and its corresponding value that we want to store in the redux-state is different.
       * e.g: OSDSizeDropdown
       */
      const value = valueLabelMap
        ? Object.keys(valueLabelMap).find(
            (key) => valueLabelMap[key] === selection
          )
        : selection;
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
    },
    [valueLabelMap, onChange, setIsOpen, filterValue]
  );
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
    onChange('');
  };

  const onInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else if (!inputValue) {
      setIsOpen(false);
    }
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    if (props.hasInlineFilter || props.isCreatable) {
      return (
        <MenuToggle
          ref={toggleRef}
          variant="typeahead"
          aria-label={props['aria-label'] || 'Options menu'}
          isExpanded={isOpen}
          isDisabled={props.isDisabled}
          status={status}
          onClick={() => setIsOpen((prev) => !prev)}
          className={className}
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
        status={status}
        className={className}
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

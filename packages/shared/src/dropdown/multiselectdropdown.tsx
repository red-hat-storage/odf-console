import * as React from 'react';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
  Checkbox,
  SelectProps,
  MenuToggleStatus,
} from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';
import './multiselectdropdown.scss';

export type MultiSelectDropdownProps = Omit<
  SelectProps,
  'onChange' | 'onToggle' | 'toggle'
> & {
  id?: string;
  className?: string;
  selections?: string[];
  selectOptions: JSX.Element[];
  placeholderText?: string;
  onChange: (selected: string[]) => void;
  validated?: 'success' | 'warning' | 'error' | 'default';
  required?: boolean;
  isCreatable?: boolean;
  isDisabled?: boolean;
  variant?: 'typeahead' | 'checkbox';
  popperProps?: SelectProps['popperProps'];
  hasInlineFilter?: boolean;
};

type Option = {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
};

const CREATE_NEW = '__create_new__';

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  className,
  selections = [],
  selectOptions,
  placeholderText = 'Select options',
  onChange,
  validated,
  required = false,
  isCreatable = false,
  isDisabled,
  variant = 'typeahead',
  popperProps,
  hasInlineFilter,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [createdOptions, setCreatedOptions] = React.useState<Option[]>([]);
  const [status, setStatus] = React.useState<MenuToggleStatus>();
  const textInputRef = React.useRef<HTMLInputElement>(null);

  const baseOptions = React.useMemo<Option[]>(
    () =>
      selectOptions.map((opt) => ({
        value: String(opt.props.value ?? opt.props.children),
        label: opt.props.children,
        description: opt.props.description,
      })),
    [selectOptions]
  );

  const fullOptions = React.useMemo(
    () => [...baseOptions, ...createdOptions],
    [baseOptions, createdOptions]
  );

  const visibleOptions = React.useMemo(() => {
    let filtered = fullOptions;
    if (hasInlineFilter && inputValue) {
      filtered = fullOptions.filter((o) =>
        String(o.label).toLowerCase().includes(inputValue.toLowerCase())
      );

      if (
        isCreatable &&
        !fullOptions.some(
          (o) => o.value.toLowerCase() === inputValue.toLowerCase()
        )
      ) {
        filtered = [{ value: CREATE_NEW, label: `Create "${inputValue}"` }];
      }
    }
    return filtered;
  }, [fullOptions, inputValue, isCreatable, hasInlineFilter]);

  React.useEffect(() => {
    let derivedValidated = validated === 'error' ? 'danger' : validated;
    setStatus(
      derivedValidated && derivedValidated !== 'default'
        ? (derivedValidated as MenuToggleStatus)
        : undefined
    );
  }, [validated]);

  const handleSelect = (value: string) => {
    let newSelections = [...selections];
    if (value === CREATE_NEW) {
      const newVal = inputValue.trim();
      if (!newVal) return;
      if (
        !fullOptions.some((o) => o.value.toLowerCase() === newVal.toLowerCase())
      ) {
        setCreatedOptions((prev) => [
          ...prev,
          { value: newVal, label: newVal },
        ]);
      }
      newSelections = selections.includes(newVal)
        ? selections.filter((s) => s !== newVal)
        : [...selections, newVal];
      setInputValue('');
    } else {
      newSelections = selections.includes(value)
        ? selections.filter((s) => s !== value)
        : [...selections, value];
    }
    onChange(newSelections);
  };

  const onInputChange = (
    _e: React.FormEvent<HTMLInputElement>,
    val: string
  ) => {
    setInputValue(val);
    if (val && !isOpen) setIsOpen(true);
  };

  const onClearAll = () => {
    onChange([]);
    setInputValue('');
  };

  const onInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else if (!inputValue) {
      setIsOpen(false);
    }
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    const hasSelection = selections.length > 0;

    return (
      <MenuToggle
        variant="typeahead"
        isExpanded={isOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
          textInputRef.current?.focus();
        }}
        isFullWidth
        innerRef={toggleRef}
        aria-label={t('Multi-select typeahead')}
        isDisabled={isDisabled}
        status={status}
        className={
          hasSelection
            ? 'odf-multiselect-menu-toggle--has-selection'
            : 'odf-multiselect-menu-toggle'
        }
      >
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={inputValue}
            onChange={onInputChange}
            id={`${id || 'multi-typeahead'}-input`}
            innerRef={textInputRef}
            autoComplete="off"
            placeholder={!hasSelection ? placeholderText : ''}
            onClick={onInputClick}
            role="combobox"
            isExpanded={isOpen}
            className={
              hasSelection
                ? 'odf-multiselect-input--has-selection'
                : 'odf-multiselect-input'
            }
          >
            {hasSelection && (
              <div className="odf-multiselect-selections-container">
                {selections.map((sel) => (
                  <span // this is the css class for the selected item box
                    key={sel}
                    className="odf-multiselect-selection-chip"
                  >
                    {sel}
                    <Button
                      variant="plain"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(selections.filter((s) => s !== sel));
                      }}
                      aria-label={t('Remove selection')}
                      icon={<TimesIcon />}
                      className="odf-multiselect-chip-remove-button"
                    />
                  </span>
                ))}
              </div>
            )}
          </TextInputGroupMain>

          {hasSelection && (
            <TextInputGroupUtilities>
              <Button
                variant="plain"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAll();
                }}
                aria-label={t('Clear all selections')}
                icon={<TimesIcon />}
              />
            </TextInputGroupUtilities>
          )}
        </TextInputGroup>
      </MenuToggle>
    );
  };

  if (variant === 'typeahead') {
    return (
      <Select
        id={id}
        className={className}
        isOpen={isOpen}
        onOpenChange={(open) => !open && setIsOpen(false)}
        onSelect={(_e, value) => handleSelect(value as string)}
        selected={selections}
        toggle={toggle}
        isDisabled={isDisabled}
        {...(required && { 'aria-required': true })}
        {...(validated && { validated })}
        popperProps={popperProps}
      >
        <SelectList isAriaMultiselectable>
          {visibleOptions.map((opt) => (
            <SelectOption
              key={opt.value}
              value={opt.value}
              description={opt.description}
            >
              {opt.label}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    );
  }

  if (variant === 'checkbox') {
    return (
      <Select
        id={id}
        className={className}
        isOpen={isOpen}
        selected={selections}
        onOpenChange={(open) => !open && setIsOpen(false)}
        toggle={toggle}
        isDisabled={isDisabled}
        {...(required && { 'aria-required': true })}
        {...(validated && { validated })}
        popperProps={popperProps}
      >
        <SelectList>
          {visibleOptions.map((opt) => (
            <SelectOption key={opt.value} value={opt.value}>
              <Checkbox
                id={`chk-${opt.value}`}
                label={opt.label}
                isChecked={selections.includes(opt.value)}
                onChange={() => handleSelect(opt.value)}
              />
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    );
  }

  return null;
};

import * as React from 'react';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import {
  Label,
  LabelGroup,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
  SelectProps,
  MenuToggleStatus,
} from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';
import './multiselectdropdown.scss';

export type MultiSelectDropdownProps = Omit<
  SelectProps,
  'onChange' | 'onToggle' | 'toggle' | 'variant'
> & {
  id?: string;
  className?: string;
  selections?: string[];
  selectOptions: JSX.Element[];
  placeholderText?: string;
  onChange: (selected: string[], selection?: string) => void;
  validated?: 'success' | 'warning' | 'error' | 'default';
  isCreatable?: boolean;
  isDisabled?: boolean;
  variant?: 'checkbox' | 'typeahead';
  popperProps?: SelectProps['popperProps'];
  hasInlineFilter?: boolean;
  onClear?: () => void;
  'aria-label'?: string;
  'data-test'?: string;
};

type Option = {
  value: string;
  key: string;
  label: React.ReactNode;
  description?: React.ReactNode;
};

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  className,
  selections = [],
  selectOptions,
  placeholderText = 'Select options',
  onChange,
  validated,
  isCreatable = false,
  isDisabled,
  variant,
  popperProps,
  hasInlineFilter,
  onClear,
  ...props
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');
  const [createdOptions, setCreatedOptions] = React.useState<Option[]>([]);
  const [status, setStatus] = React.useState<MenuToggleStatus>();
  const [newOptionVal, setNewOptionVal] = React.useState('');
  const textInputRef = React.useRef<HTMLInputElement>(null);
  const DISABLED = '__disabled__';
  const isCheckboxVariant = variant === 'checkbox';

  const baseOptions = React.useMemo<Option[]>(() => {
    return selectOptions.map((opt) => ({
      value: String(opt.props.value ?? opt.props.children),
      key: String(opt.key ?? opt.props.children),
      label: opt.props.children,
      description: opt.props.description,
    }));
  }, [selectOptions]);

  const fullOptions = React.useMemo(
    () => [...baseOptions, ...createdOptions],
    [baseOptions, createdOptions]
  );

  React.useEffect(() => {
    if (filterValue) {
      setNewOptionVal(filterValue);
    }
  }, [filterValue]);

  const visibleOptions = React.useMemo(() => {
    let filteredOptions = fullOptions;
    const lowerValue = filterValue.toLowerCase();
    if (hasInlineFilter && filterValue) {
      filteredOptions = fullOptions.filter((opt) =>
        String(opt.label).toLowerCase().includes(lowerValue)
      );

      const exactMatchExists = fullOptions.some(
        (opt) => opt.value.toLowerCase() === lowerValue
      );

      if (filteredOptions.length === 0 && isCreatable) {
        return [
          {
            value: filterValue,
            key: filterValue,
            label: `Create "${filterValue}"`,
          },
        ];
      }

      if (isCreatable && !exactMatchExists) {
        return [
          {
            value: filterValue,
            key: filterValue,
            label: `Create "${filterValue}"`,
          },
          ...filteredOptions,
        ];
      }
    }

    return filteredOptions;
  }, [fullOptions, filterValue, isCreatable, hasInlineFilter]);

  React.useEffect(() => {
    let derivedValidated = validated === 'error' ? 'danger' : validated;
    setStatus(
      derivedValidated && derivedValidated !== 'default'
        ? (derivedValidated as MenuToggleStatus)
        : undefined
    );
  }, [validated]);

  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    value: string
  ) => {
    let newSelections = [...selections];
    const createVal = newOptionVal;

    if (value === createVal) {
      if (!createVal) return;

      if (
        !fullOptions.some(
          (o) => o.value.toLowerCase() === createVal.toLowerCase()
        )
      ) {
        setCreatedOptions((prev) => [
          ...prev,
          { value: createVal, key: createVal, label: createVal },
        ]);
      }

      newSelections = selections.includes(createVal)
        ? selections.filter((s) => s !== createVal)
        : [...selections, createVal];

      setFilterValue('');
    } else {
      newSelections = selections.includes(value)
        ? selections.filter((s) => s !== value)
        : [...selections, value];
    }

    onChange(newSelections, value);
  };

  const onInputChange = (
    _e: React.FormEvent<HTMLInputElement>,
    val: string
  ) => {
    setFilterValue(val);
    if (val && !isOpen) setIsOpen(true);
  };

  const onClearAll = () => {
    setFilterValue('');
    if (onClear) onClear();
    else onChange([]);
  };

  const onInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else if (!filterValue) {
      setIsOpen(false);
    }
  };

  const onToggleClick = () => {
    setIsOpen((prev) => !prev);
    textInputRef.current?.focus();
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    const hasSelection = selections.length > 0;

    return (
      <MenuToggle
        variant="typeahead"
        isExpanded={isOpen}
        onClick={onToggleClick}
        isFullWidth
        innerRef={toggleRef}
        aria-label={props['aria-label'] || t('Multi-select typeahead')}
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
            value={filterValue}
            onChange={onInputChange}
            id={`${id || 'multi-typeahead'}-input`}
            innerRef={textInputRef}
            autoComplete="off"
            placeholder={placeholderText}
            onClick={onInputClick}
            role="combobox"
            isExpanded={isOpen}
            className={
              hasSelection
                ? 'odf-multiselect-input--has-selection'
                : 'odf-multiselect-input'
            }
          >
            {hasSelection && variant === 'typeahead' && (
              <LabelGroup aria-label={t('Current selections')}>
                {selections.map((sel) => (
                  <Label
                    variant="outline"
                    key={sel}
                    onClose={(ev: React.MouseEvent | React.ChangeEvent) => {
                      ev.stopPropagation();
                      onSelect(ev, sel);
                    }}
                  >
                    {sel}
                  </Label>
                ))}
              </LabelGroup>
            )}
          </TextInputGroupMain>
          <TextInputGroupUtilities
            {...(selections.length === 0 ? { style: { display: 'none' } } : {})}
          >
            <Button
              icon={<TimesIcon aria-hidden />}
              variant="plain"
              onClick={onClearAll}
              aria-label={t('Clear input value')}
            />
          </TextInputGroupUtilities>
        </TextInputGroup>
      </MenuToggle>
    );
  };

  const options = () => {
    if (visibleOptions.length === 0) {
      return (
        <SelectOption key="disabled-options" value={DISABLED} isDisabled>
          {t('No option found')}
        </SelectOption>
      );
    }

    return visibleOptions.map((opt) => (
      <SelectOption
        key={opt.value}
        value={opt.value}
        description={opt.description}
        hasCheckbox={isCheckboxVariant}
        isSelected={selections.includes(opt.value)}
      >
        {opt.label}
      </SelectOption>
    ));
  };

  return (
    <Select
      id={id}
      className={className}
      onSelect={onSelect}
      isOpen={isOpen}
      selected={selections}
      onOpenChange={(open) => setIsOpen(open)}
      toggle={toggle}
      popperProps={popperProps}
      data-test={props['data-test']}
    >
      <SelectList isAriaMultiselectable={variant === 'typeahead'}>
        {options()}
      </SelectList>
    </Select>
  );
};

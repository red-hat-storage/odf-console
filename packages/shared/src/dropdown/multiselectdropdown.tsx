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
  SelectProps,
  MenuToggleStatus,
  ChipGroup,
  Chip,
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
  onChange: (selected: string[], selection?: string) => void;
  validated?: 'success' | 'warning' | 'error' | 'default';
  isCreatable?: boolean;
  isDisabled?: boolean;
  variant?: 'typeahead' | 'checkbox';
  popperProps?: SelectProps['popperProps'];
  hasInlineFilter?: boolean;
};

type Option = {
  value: string;
  key: String;
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
  variant = 'typeahead',
  popperProps,
  hasInlineFilter,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterValue, setfilterValue] = React.useState('');
  const [createdOptions, setCreatedOptions] = React.useState<Option[]>([]);
  const [status, setStatus] = React.useState<MenuToggleStatus>();
  const textInputRef = React.useRef<HTMLInputElement>(null);
  const DISABLED = '__disabled__';

  const baseOptions = React.useMemo<Option[]>(
    () =>
      selectOptions.map((opt) => ({
        value: String(opt.props.value ?? opt.props.children),
        key: String(opt.props.key ?? opt.props.children),
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
    let filteredOptions = fullOptions;
    if (hasInlineFilter && filterValue) {
      const lowerValue = filterValue.trim().toLowerCase();

      filteredOptions = fullOptions.filter((opt) =>
        String(opt.label).toLowerCase().includes(lowerValue)
      );

      const exactMatchExists = fullOptions.some(
        (opt) => opt.value.toLowerCase() === lowerValue
      );

      if (filteredOptions.length === 0 && isCreatable) {
        return [
          {
            value: filterValue.trim(),
            key: filterValue.trim(),
            label: `Create "${filterValue.trim()}"`,
          },
        ];
      }

      if (isCreatable && !exactMatchExists) {
        return [
          {
            value: filterValue.trim(),
            key: filterValue.trim(),
            label: `Create "${filterValue.trim()}"`,
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
    const createVal = filterValue.trim();

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

      setfilterValue('');
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
    setfilterValue(val);
    if (val && !isOpen) setIsOpen(true);
  };

  const onClearAll = () => {
    onChange([]);
    setfilterValue('');
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
              <ChipGroup aria-label="Current selections">
                {selections.map((sel) => (
                  <Chip
                    key={sel}
                    onClick={(ev: React.MouseEvent | React.ChangeEvent) => {
                      ev.stopPropagation();
                      onSelect(ev, sel);
                    }}
                  >
                    {sel}
                  </Chip>
                ))}
              </ChipGroup>
            )}
          </TextInputGroupMain>
          <TextInputGroupUtilities
            {...(selections.length === 0 ? { style: { display: 'none' } } : {})}
          >
            <Button
              variant="plain"
              onClick={onClearAll}
              aria-label="Clear input value"
            >
              <TimesIcon aria-hidden />
            </Button>
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
        hasCheckbox={variant === 'checkbox'}
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
      isDisabled={isDisabled}
      popperProps={popperProps}
    >
      <SelectList isAriaMultiselectable={variant === 'typeahead'}>
        {options()}
      </SelectList>
    </Select>
  );
};

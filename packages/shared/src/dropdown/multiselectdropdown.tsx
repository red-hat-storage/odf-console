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

export type MultiSelectDropdownProps = Omit<
  SelectProps,
  'onChange' | 'onToggle'
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
  popperprops?: SelectProps['popperProps'];
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
    let derivedValidated = '';
    derivedValidated = validated;
    if (derivedValidated === 'error') derivedValidated = 'danger';
    if (derivedValidated && derivedValidated !== 'default') {
      setStatus(derivedValidated as MenuToggleStatus);
    } else {
      setStatus(undefined);
    }
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
        style={
          {
            cursor: 'pointer',
            '--pf-v5-c-menu-toggle__text--Color': hasSelection
              ? '#FFFFFF'
              : 'var(--pf-v5-global--Color--200)',
          } as React.CSSProperties
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
            style={{
              color: hasSelection
                ? '#FFFFFF'
                : 'var(--pf-v5-global--Color--200)',
              fontWeight: hasSelection ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {hasSelection && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                {selections.map((sel) => (
                  <span
                    key={sel}
                    style={{
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--pf-v5-global--Color--100)',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '12px',
                    }}
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
                      style={{
                        marginLeft: '4px',
                        color: 'inherit',
                        padding: 0,
                      }}
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

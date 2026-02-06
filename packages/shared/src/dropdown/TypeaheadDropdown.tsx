import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Select,
  SelectOption,
  SelectList,
  SelectOptionProps,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';

type TypeaheadDropdownProps = {
  ariaLabel?: string;
  className?: string;
  id?: string;
  onSelect?: (selected: string) => void;
  items: SelectOptionProps[];
  placeholder?: string;
  selectedValue?: string | number;
};

export const TypeaheadDropdown: React.FC<TypeaheadDropdownProps> = ({
  ariaLabel,
  className,
  id,
  items,
  onSelect = () => undefined,
  placeholder,
  selectedValue,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedValueText = selectedValue ? String(selectedValue) : '';
  const [selected, setSelected] = React.useState<string>(selectedValueText);
  const [isUserSelection, setIsUserSelection] = React.useState(false);
  const selectedItem = items.find((item) => item.value === selected);
  const [inputValue, setInputValue] = React.useState<string>(
    selectedItem ? selectedItem.children.toString : ''
  );
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(
    null
  );
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const textInputRef = React.useRef<HTMLInputElement>();

  const NO_RESULTS = t('no results');

  let selectOptions: SelectOptionProps[] = items;
  // Filter menu items based on the text input value when one exists
  if (filterValue) {
    selectOptions = items.filter((menuItem) =>
      String(menuItem.children)
        .toLowerCase()
        .includes(filterValue.toLowerCase())
    );

    // When no options are found after filtering, display 'No results found'
    if (!selectOptions.length) {
      selectOptions = [
        {
          isAriaDisabled: true,
          children: t('No results found for {{ filterValue }}', {
            filterValue,
          }),
          value: NO_RESULTS,
        },
      ];
    }

    // Open the menu when the input value changes and the new value is not empty
    if (!isOpen) {
      setIsOpen(true);
    }
  }

  const createItemId = (value: any) =>
    `select-typeahead-${String(value).replace(' ', '-')}`;

  const setActiveAndFocusedItem = (itemIndex: number) => {
    setFocusedItemIndex(itemIndex);
    const focusedItem = selectOptions[itemIndex];
    setActiveItemId(createItemId(focusedItem.value));
  };

  const resetActiveAndFocusedItem = () => {
    setFocusedItemIndex(null);
    setActiveItemId(null);
  };

  const closeMenu = () => {
    setIsOpen(false);
    resetActiveAndFocusedItem();
  };

  const onInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else if (!inputValue) {
      closeMenu();
    }
  };

  const selectOption = (value: string | number) => {
    if (value && value !== NO_RESULTS) {
      const optionText = selectOptions.find(
        (option) => option.value === value
      )?.children;
      setInputValue(String(optionText));
      setFilterValue('');
      setSelected(String(value));

      closeMenu();
    }
  };

  const onOptionSelect = (
    _event: React.SyntheticEvent | undefined,
    value: string | undefined
  ) => {
    const optionValue = value || '';
    selectOption(optionValue);
    onSelect(optionValue);
    setIsUserSelection(true);
  };

  // We update the preselected value on re-render if the user hasn't interacted yet.
  if (!isUserSelection && selectedValueText !== selected) {
    selectOption(selectedValueText);
  }

  const onTextInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    setInputValue(value);
    setFilterValue(value);

    resetActiveAndFocusedItem();

    if (value !== selected) {
      setSelected('');
      setIsUserSelection(true);
    }
  };

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus = 0;

    if (!isOpen) {
      setIsOpen(true);
    }

    if (selectOptions.every((option) => option.isDisabled)) {
      return;
    }

    if (key === 'ArrowUp') {
      // When no index is set or at the first index, focus to the last, otherwise decrement focus index
      if (focusedItemIndex === null || focusedItemIndex === 0) {
        indexToFocus = selectOptions.length - 1;
      } else {
        indexToFocus = focusedItemIndex - 1;
      }

      // Skip disabled options
      while (selectOptions[indexToFocus].isDisabled) {
        indexToFocus--;
        if (indexToFocus === -1) {
          indexToFocus = selectOptions.length - 1;
        }
      }
    }

    if (key === 'ArrowDown') {
      // When no index is set or at the last index, focus to the first, otherwise increment focus index
      if (
        focusedItemIndex === null ||
        focusedItemIndex === selectOptions.length - 1
      ) {
        indexToFocus = 0;
      } else {
        indexToFocus = focusedItemIndex + 1;
      }

      // Skip disabled options
      while (selectOptions[indexToFocus].isDisabled) {
        indexToFocus++;
        if (indexToFocus === selectOptions.length) {
          indexToFocus = 0;
        }
      }
    }

    setActiveAndFocusedItem(indexToFocus);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem =
      focusedItemIndex !== null ? selectOptions[focusedItemIndex] : null;

    switch (event.key) {
      case 'Enter':
        if (isOpen && focusedItem && !focusedItem?.isAriaDisabled) {
          onOptionSelect(event, focusedItem?.value);
        }

        if (!isOpen) {
          setIsOpen(true);
        }

        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const onToggleClick = () => {
    setIsOpen(!isOpen);
    textInputRef?.current?.focus();
  };

  const onClearButtonClick = () => {
    setSelected('');
    setInputValue('');
    setFilterValue('');
    resetActiveAndFocusedItem();
    textInputRef?.current?.focus();
    onSelect('');
    setIsUserSelection(true);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      aria-label={ariaLabel}
      onClick={onToggleClick}
      isExpanded={isOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onInputClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id={`${id}-input`}
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={placeholder}
          {...(activeItemId && { 'aria-activedescendant': activeItemId })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls={`${id}-listbox`}
        />

        <TextInputGroupUtilities
          {...(!inputValue ? { style: { display: 'none' } } : {})}
        >
          <Button
            icon={<TimesIcon aria-hidden />}
            variant={ButtonVariant.plain}
            onClick={onClearButtonClick}
            aria-label={t('Clear selected value')}
          />
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );
  return (
    <div className={className}>
      <Select
        id={id}
        isOpen={isOpen}
        selected={selected}
        onSelect={onOptionSelect}
        onOpenChange={(isOpened: boolean) => {
          !isOpened && closeMenu();
        }}
        toggle={toggle}
        shouldFocusFirstItemOnOpen={false}
      >
        <SelectList id={`${id}-listbox`}>
          {selectOptions.map((option, index) => (
            <SelectOption
              key={option.value || option.children}
              isFocused={focusedItemIndex === index}
              className={option.className}
              id={createItemId(option.value)}
              {...option}
              ref={null}
              isSelected={option.value === selected}
            />
          ))}
        </SelectList>
      </Select>
    </div>
  );
};

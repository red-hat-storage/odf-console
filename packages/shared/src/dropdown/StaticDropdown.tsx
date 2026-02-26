import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';

type StaticDropdownProps = {
  onSelect: (selectedItem: string) => void;
  onBlur?: () => void;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
  defaultSelection?: string;
  dropdownItems: {
    [key: string]: JSX.Element | string;
  };
  defaultText?: string;
  textGenerator?: (
    key: string,
    dropdownItems?: StaticDropdownProps['dropdownItems']
  ) => JSX.Element | string;
  'data-test'?: string;
  isDisabled?: boolean;
  isFullWidth?: boolean;
};

const StaticDropdown: React.FC<StaticDropdownProps> = ({
  onSelect,
  className,
  defaultSelection = '',
  dropdownItems,
  defaultText = '',
  textGenerator,
  'data-test': dataTest,
  isDisabled = false,
  isFullWidth = false,
}) => {
  const [selectedItem, setSelectedItem] = React.useState(defaultSelection);
  const [isOpen, setOpen] = React.useState(false);

  const onChange = (
    _event?: React.MouseEvent<Element, MouseEvent>,
    value?: string | number
  ) => {
    const key = value as string;
    if (key) {
      setSelectedItem(key);
      onSelect(key);
    }
    setSelectedItem(key);
    setOpen(false);
  };

  const processedDropdownItems = React.useMemo(
    () =>
      Object.entries(dropdownItems).map(([k, v]) => (
        <DropdownItem key={k} id={k} value={k} data-test-dropdown-menu={v}>
          {v}
        </DropdownItem>
      )),
    [dropdownItems]
  );

  const dropdownText =
    selectedItem && textGenerator
      ? textGenerator(selectedItem, dropdownItems)
      : selectedItem || defaultText;

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setOpen((o) => !o)}
      isExpanded={isOpen}
      isDisabled={isDisabled}
      data-test={dataTest}
      isFullWidth={isFullWidth}
    >
      {dropdownText}
    </MenuToggle>
  );

  return (
    <Dropdown
      className={className}
      isOpen={isOpen}
      onSelect={onChange}
      onOpenChange={(open: boolean) => setOpen(open)}
      toggle={toggle}
      popperProps={isFullWidth ? { width: 'trigger' } : undefined}
    >
      <DropdownList>{processedDropdownItems}</DropdownList>
    </Dropdown>
  );
};

export default StaticDropdown;

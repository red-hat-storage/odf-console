import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';

type StaticDropdownProps = {
  onSelect: (selectedItem: string) => void;
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
};

const StaticDropdown: React.FC<StaticDropdownProps> = ({
  onSelect,
  className,
  defaultSelection = '',
  dropdownItems,
  defaultText = '',
  textGenerator,
}) => {
  const [selectedItem, setSelectedItem] = React.useState(defaultSelection);
  const [isOpen, setOpen] = React.useState(false);

  const onChange = (event?: React.SyntheticEvent<HTMLDivElement>) => {
    const key = event?.currentTarget?.id;
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
        <DropdownItem key={k} id={k}>{v}</DropdownItem>
      )),
    [dropdownItems]
  );

  const dropdownText =
    selectedItem && textGenerator
      ? textGenerator(selectedItem, dropdownItems)
      : selectedItem || defaultText;

  return (
    <Dropdown
      className={className}
      isOpen={isOpen}
      dropdownItems={processedDropdownItems}
      toggle={
        <DropdownToggle onToggle={() => setOpen((o) => !o)}>
          {dropdownText}
        </DropdownToggle>
      }
      autoFocus={false}
      onSelect={onChange}
    />
  );
};

export default StaticDropdown;

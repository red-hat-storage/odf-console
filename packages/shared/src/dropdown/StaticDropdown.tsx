import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';

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
};

const StaticDropdown: React.FC<StaticDropdownProps> = ({
  onSelect,
  onBlur,
  className,
  defaultSelection = '',
  dropdownItems,
  defaultText = '',
  textGenerator,
  required,
  'data-test': dataTest,
  isDisabled = false,
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
        <DropdownItem key={k} id={k} data-test-dropdown-menu={v}>
          {v}
        </DropdownItem>
      )),
    [dropdownItems]
  );

  const dropdownText =
    selectedItem && textGenerator
      ? textGenerator(selectedItem, dropdownItems)
      : selectedItem || defaultText;

  return (
    <Dropdown
      required={required}
      className={className}
      isOpen={isOpen}
      dropdownItems={processedDropdownItems}
      toggle={
        <DropdownToggle
          onToggle={() => setOpen((o) => !o)}
          isDisabled={isDisabled}
        >
          {dropdownText}
        </DropdownToggle>
      }
      autoFocus={false}
      onSelect={onChange}
      onBlur={onBlur}
      onClick={onBlur}
      data-test={dataTest}
    />
  );
};

export default StaticDropdown;

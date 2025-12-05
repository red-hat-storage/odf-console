import * as React from 'react';
import { Dropdown, DropdownItem, MenuToggle } from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  id,
  text,
  dropdownItems,
  dropdownPosition,
  isDisabled,
  isPlain,
  toggleVariant,
  onToggle,
  onSelect,
}) => {
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const { t } = useCustomTranslation();
  const toggleRef = React.useRef<HTMLButtonElement>();

  const onClick = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <Dropdown
      popperProps={{
        position: dropdownPosition || 'right',
      }}
      toggle={{
        toggleNode: (
          <MenuToggle
            ref={toggleRef}
            aria-label={t('Select input')}
            variant={toggleVariant || 'default'}
            id={id}
            isDisabled={isDisabled}
            onClick={() => {
              setOpen(!isOpen);
              !!onToggle && onToggle(!isOpen);
            }}
            isExpanded={isOpen}
          >
            {text}
          </MenuToggle>
        ),
        toggleRef,
      }}
      isOpen={isOpen}
      isPlain={isPlain}
    >
      {dropdownItems.map((item) => (
        <DropdownItem
          key={item.id}
          isDisabled={item?.isDisabled}
          onClick={() => onClick(item.id)}
        >
          {item.text}
        </DropdownItem>
      ))}
    </Dropdown>
  );
};

export type ActionDropdownItems = {
  id: string;
  isDisabled?: boolean;
  text: string | React.ReactNode;
};

export type ToggleVariant = 'primary' | 'secondary' | 'default';

export type ActionDropdownProps = {
  dropdownItems: ActionDropdownItems[];
  text: string;
  isDisabled?: boolean;
  id: string;
  toggleVariant?: ToggleVariant;
  dropdownPosition?: 'right' | 'left' | 'center' | 'start' | 'end';
  isPlain?: boolean;
  onSelect: (id: string) => void;
  onToggle?: (isOpen?: boolean) => void;
};

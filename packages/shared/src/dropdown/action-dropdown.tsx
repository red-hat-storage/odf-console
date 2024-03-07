import * as React from 'react';
import {
  Dropdown,
  DropdownToggle,
  DropdownItem,
  DropdownPosition,
} from '@patternfly/react-core/deprecated';
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

  const onClick = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <Dropdown
      position={dropdownPosition || DropdownPosition.right}
      dropdownItems={dropdownItems.map((item) => (
        <DropdownItem
          key={item.id}
          isDisabled={item?.isDisabled}
          onClick={() => onClick(item.id)}
        >
          {item.text}
        </DropdownItem>
      ))}
      toggle={
        <DropdownToggle
          aria-label={t('Select input')}
          toggleVariant={toggleVariant || 'default'}
          id={id}
          isDisabled={isDisabled}
          onToggle={() => {
            setOpen(!isOpen);
            !!onToggle && onToggle(!isOpen);
          }}
        >
          {text}
        </DropdownToggle>
      }
      isOpen={isOpen}
      isPlain={isPlain}
    />
  );
};

export type ActionDropdownItems = {
  id: string;
  isDisabled?: boolean;
  text: string | React.ReactNode;
};

export type ActionDropdownProps = {
  dropdownItems: ActionDropdownItems[];
  text: string;
  isDisabled?: boolean;
  id: string;
  toggleVariant?: 'primary' | 'secondary' | 'default';
  dropdownPosition?: DropdownPosition;
  isPlain?: boolean;
  onSelect: (id: string) => void;
  onToggle?: (isOpen?: boolean) => void;
};

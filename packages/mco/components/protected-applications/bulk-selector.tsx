import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleCheckbox,
  MenuToggleElement,
} from '@patternfly/react-core';

type BulkSelectorProps = {
  selectedCount: number;
  eligiblePageCount: number;
  eligibleTotalCount: number;
  isPartiallySelected: boolean;
  isAllSelected: boolean;
  onSelectNone: () => void;
  onSelectPage: () => void;
  onSelectAll: () => void;
};

export const BulkSelector: React.FC<BulkSelectorProps> = ({
  selectedCount,
  eligiblePageCount,
  eligibleTotalCount,
  isPartiallySelected,
  isAllSelected,
  onSelectNone,
  onSelectPage,
  onSelectAll,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const onToggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  const onDropdownSelect = () => setIsOpen(false);

  const toggleCheckbox = () => {
    if (selectedCount > 0) {
      onSelectNone();
    } else {
      onSelectPage();
    }
  };

  const statusText =
    selectedCount > 0 ? t('{{count}} selected', { count: selectedCount }) : '';

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggle}
      splitButtonItems={[
        <MenuToggleCheckbox
          id="bulk-select-checkbox"
          key="bulk-select-checkbox"
          aria-label={t('Select all')}
          isChecked={isAllSelected ? true : isPartiallySelected ? null : false}
          onChange={toggleCheckbox}
        >
          {statusText}
        </MenuToggleCheckbox>,
      ]}
      aria-label={t('Bulk selection')}
    />
  );

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onDropdownSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
    >
      <DropdownList>
        <DropdownItem key="select-none" onClick={onSelectNone}>
          {t('Select none (0 items)')}
        </DropdownItem>
        <DropdownItem key="select-page" onClick={onSelectPage}>
          {t('Select page ({{count}} items)', { count: eligiblePageCount })}
        </DropdownItem>
        <DropdownItem key="select-all" onClick={onSelectAll}>
          {t('Select all ({{count}} items)', { count: eligibleTotalCount })}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

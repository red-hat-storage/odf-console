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

type NodeBulkSelectProps = {
  selectedCount: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: () => void;
  onSelectNone: () => void;
};

// Reusable "{{count}} selected" split-button bulk-select control for the node
// tables (Fusion Access SAN and IBM Storage Scale). Presentational only: pair it
// with `useNodeBulkSelect` to compute the props from a selection. Pass it to
// <NodeSearchToolbar> as a child so both flows share one control. These tables
// are not paginated, so there is no "select page" action.
export const NodeBulkSelect: React.FC<NodeBulkSelectProps> = ({
  selectedCount,
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
  onSelectNone,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const onToggle = React.useCallback(() => setIsOpen((prev) => !prev), []);
  const onDropdownSelect = () => setIsOpen(false);

  const toggleCheckbox = () => {
    if (selectedCount > 0) {
      onSelectNone();
    } else {
      onSelectAll();
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
          id="node-bulk-select-checkbox"
          key="node-bulk-select-checkbox"
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
        <DropdownItem key="select-all" onClick={onSelectAll}>
          {t('Select all')}
        </DropdownItem>
        <DropdownItem key="select-none" onClick={onSelectNone}>
          {t('Select none')}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

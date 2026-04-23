import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarFilter,
  ToolbarGroup,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToolbarLabelGroup,
  ToolbarLabel,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';

export type DRPCFilterToolbarProps = {
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
  statusOptions: string[];
  selectedStatuses: string[];
  onSelectedStatusesChange: (statuses: string[]) => void;
};

export const DRPCFilterToolbar: React.FC<DRPCFilterToolbarProps> = ({
  nameFilter,
  onNameFilterChange,
  statusOptions,
  selectedStatuses,
  onSelectedStatusesChange,
}) => {
  const { t } = useCustomTranslation();
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);

  const onStatusSelect = (_event: React.MouseEvent, value: string) => {
    onSelectedStatusesChange(
      selectedStatuses.includes(value)
        ? selectedStatuses.filter((s) => s !== value)
        : [...selectedStatuses, value]
    );
  };

  const onDeleteStatusLabel = (
    _category: string | ToolbarLabelGroup,
    label: ToolbarLabel | string
  ) => {
    let val: string;
    if (typeof label === 'string') {
      val = label;
    } else if ('key' in label && typeof label.key === 'string') {
      val = label.key;
    } else {
      // Fallback: convert to string
      val = String(label);
    }
    onSelectedStatusesChange(selectedStatuses.filter((s) => s !== val));
  };

  const onClearAllFilters = () => {
    onNameFilterChange('');
    onSelectedStatusesChange([]);
  };

  const statusToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsStatusOpen((prev) => !prev)}
      isExpanded={isStatusOpen}
      icon={<FilterIcon />}
    >
      {selectedStatuses.length === 1
        ? selectedStatuses[0]
        : selectedStatuses.length > 1
          ? t('{{count}} statuses', { count: selectedStatuses.length })
          : t('Status')}
    </MenuToggle>
  );

  return (
    <Toolbar clearAllFilters={onClearAllFilters} className="pf-v6-u-ml-md">
      <ToolbarContent>
        <ToolbarItem>
          <SearchInput
            placeholder={t('Find by name')}
            value={nameFilter}
            onChange={(_event, value) => onNameFilterChange(value)}
            onClear={() => onNameFilterChange('')}
          />
        </ToolbarItem>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <ToolbarFilter
              labels={selectedStatuses}
              deleteLabel={onDeleteStatusLabel}
              deleteLabelGroup={() => onSelectedStatusesChange([])}
              categoryName={t('Status')}
            >
              <Select
                isOpen={isStatusOpen}
                onSelect={onStatusSelect}
                onOpenChange={setIsStatusOpen}
                toggle={statusToggle}
              >
                <SelectList>
                  {statusOptions.map((status) => (
                    <SelectOption
                      key={status}
                      value={status}
                      hasCheckbox
                      isSelected={selectedStatuses.includes(status)}
                    >
                      {status}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarFilter>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

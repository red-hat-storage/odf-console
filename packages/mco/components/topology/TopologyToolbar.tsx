import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { FilterType } from './types';
import './TopologyToolbar.scss';

export type TopologyToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedFilters: FilterType[];
  onFilterChange: (filters: FilterType[]) => void;
};

const TopologyToolbar: React.FC<TopologyToolbarProps> = ({
  searchValue,
  onSearchChange,
  selectedFilters,
  onFilterChange,
}) => {
  const { t } = useCustomTranslation();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const filterOptions = React.useMemo(
    () => [
      { value: FilterType.Namespace, label: t('Namespace') },
      { value: FilterType.Cluster, label: t('Cluster name') },
      { value: FilterType.Application, label: t('Application name') },
      { value: FilterType.Policy, label: t('Policy') },
    ],
    [t]
  );

  const onSelect = React.useCallback(
    (
      _event: React.MouseEvent<Element, MouseEvent> | undefined,
      value: string | number | undefined
    ) => {
      if (value) {
        const filterValue = value as unknown as FilterType;
        const newFilters = selectedFilters.includes(filterValue)
          ? selectedFilters.filter((f) => f !== filterValue)
          : [...selectedFilters, filterValue];
        onFilterChange(newFilters);
      }
    },
    [selectedFilters, onFilterChange]
  );

  const getFilterLabel = React.useCallback(() => {
    if (selectedFilters.length === 0) {
      return t('Namespace, Cluster name, Application name or Policy');
    }
    if (selectedFilters.length === 1) {
      const option = filterOptions.find(
        (opt) => opt.value === selectedFilters[0]
      );
      return option?.label || '';
    }
    return t('{{count}} filters selected', { count: selectedFilters.length });
  }, [selectedFilters, t, filterOptions]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        isExpanded={isFilterOpen}
        icon={<FilterIcon />}
        className="topology-toolbar__filter-toggle"
      >
        {getFilterLabel()}
      </MenuToggle>
    ),
    [isFilterOpen, getFilterLabel]
  );

  return (
    <Toolbar
      className="topology-toolbar"
      clearAllFilters={() => {
        onSearchChange('');
        onFilterChange([]);
      }}
      collapseListedFiltersBreakpoint="xl"
    >
      <ToolbarContent>
        <ToolbarItem className="topology-toolbar__search">
          <SearchInput
            placeholder={t('Search')}
            value={searchValue}
            onChange={(_event, value) => onSearchChange(value)}
            onClear={() => onSearchChange('')}
          />
        </ToolbarItem>
        <ToolbarItem className="topology-toolbar__filter">
          <Select
            id="topology-filter-select"
            isOpen={isFilterOpen}
            selected={selectedFilters}
            onSelect={onSelect}
            onOpenChange={(isOpen) => setIsFilterOpen(isOpen)}
            toggle={toggle}
          >
            <SelectList>
              {filterOptions.map((option) => (
                <SelectOption
                  key={option.value}
                  value={option.value}
                  isSelected={selectedFilters.includes(option.value)}
                  hasCheckbox
                >
                  {option.label}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default TopologyToolbar;

import * as React from 'react';
import { SelectOption, SelectGroup, SelectList } from '@patternfly/react-core';

type GroupedSelectItems = {
  group: string;
  items: { name: string; id: string }[];
}[];

export const getSelectOptions = (
  selectItems: { name: string; id: string }[]
): React.ReactElement[] =>
  selectItems.map(({ id, name }) => (
    <SelectOption key={id} value={id}>
      {name}
    </SelectOption>
  ));

export const getGroupedSelectOptions = (
  groupedSelectItems: GroupedSelectItems
): React.ReactElement[] =>
  groupedSelectItems.map(({ group, items }) => (
    <SelectGroup key={group} label={group}>
      <SelectList>{getSelectOptions(items)}</SelectList>
    </SelectGroup>
  ));

export const getOptionsMenuItems = (
  dropdownItems: GroupedSelectItems,
  selectedItems: string[]
) => {
  return dropdownItems.map(({ group, items }) => (
    <SelectGroup
      className="nb-data-consumption-card__dropdown-item--hide-list-style"
      key={group}
      label={group}
    >
      <SelectList>
        {items.map((item) => (
          <SelectOption
            isSelected={selectedItems.includes(item.id)}
            id={item.id}
            key={item.id}
            value={item.id}
          >
            {item.name}
          </SelectOption>
        ))}
      </SelectList>
    </SelectGroup>
  ));
};

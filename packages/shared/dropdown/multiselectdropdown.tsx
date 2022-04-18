import * as React from 'react';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  onChange,
  placeholder,
  id,
  options,
  defaultSelected = [],
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(defaultSelected || []);
  const onSelect = (event: React.MouseEvent | React.ChangeEvent, selection: string) => {
    let cSelected: string[] = selected;
    if (selected.includes(selection)) {
      cSelected = selected.filter((item) => item !== selection);
    } else {
      cSelected = [...selected, selection];
    }
    setSelected(cSelected);
    onChange(cSelected);
  };

  const { t } = useCustomTranslation();

  const items: JSX.Element[] = options.map((item) => <SelectOption key={item} value={item} />);
  
  return (
      <Select
        variant={SelectVariant.typeaheadMulti}
        aria-label={t('Select input')}
        onToggle={setOpen}
        onSelect={onSelect}
        selections={selected}
        isOpen={isOpen}
        placeholderText={placeholder || t('Select options')}
        aria-labelledby={id}
        noResultsFoundText={t('No results found')}
      >
        {items}
      </Select>
  );
};

export type MultiSelectDropdownProps = {
  id?: string;
  options?: string[];
  defaultSelected?: string[];
  placeholder?: string;
  onChange: (selected: string[]) => void;
};

import * as React from 'react';
import {
  Select,
  SelectOption,
  SelectVariant,
  SelectProps,
} from '@patternfly/react-core';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  onChange,
  placeholderText,
  id,
  options,
  selections = [],
  variant,
  ...rest
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    selection: string
  ) => {
    const prevSelection = selections as string[];
    let cSelected = prevSelection;
    if (prevSelection.includes(selection)) {
      cSelected = prevSelection.filter((item) => item !== selection);
    } else {
      cSelected = [...prevSelection, selection];
    }
    onChange(cSelected);
  };

  const { t } = useCustomTranslation();

  const items: JSX.Element[] = options.map((item) => (
    <SelectOption key={item} value={item} />
  ));

  return (
    <Select
      variant={variant || SelectVariant.typeaheadMulti}
      aria-label={t('Select input')}
      onToggle={setOpen}
      onSelect={onSelect}
      selections={selections}
      isOpen={isOpen}
      placeholderText={placeholderText || t('Select options')}
      aria-labelledby={id}
      noResultsFoundText={t('No results found')}
      isCheckboxSelectionBadgeHidden
      {...rest}
    >
      {items}
    </Select>
  );
};

export type MultiSelectDropdownProps = Omit<
  SelectProps,
  'onChange' | 'onToggle'
> & {
  id?: string;
  options?: string[];
  onChange: (selected: string[]) => void;
};

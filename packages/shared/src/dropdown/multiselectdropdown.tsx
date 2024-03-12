import * as React from 'react';
import {
  Select,
  SelectOption,
  SelectVariant,
  SelectProps,
} from '@patternfly/react-core/deprecated';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  onChange,
  placeholderText,
  id,
  options,
  selectOptions,
  selections = [],
  variant,
  isCreatable,
  ...rest
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [newOptions, setNewOptions] = React.useState<JSX.Element[]>([]);
  const allOptions =
    newOptions.length > 0 ? selectOptions.concat(newOptions) : selectOptions;

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
    onChange(cSelected, selection);
  };

  const { t } = useCustomTranslation();

  const items: JSX.Element[] = options?.map((item) => (
    <SelectOption key={item} value={item} />
  ));

  const onCreateOption = (newValue: string) =>
    setNewOptions([
      ...newOptions,
      <SelectOption key={newValue} value={newValue} />,
    ]);

  return (
    <Select
      variant={variant || SelectVariant.typeaheadMulti}
      aria-label={t('Select input')}
      onToggle={() => setOpen((o) => !o)}
      onSelect={onSelect}
      selections={selections}
      isOpen={isOpen}
      placeholderText={placeholderText || t('Select options')}
      aria-labelledby={id}
      noResultsFoundText={t('No results found')}
      isCheckboxSelectionBadgeHidden
      onCreateOption={(isCreatable && onCreateOption) || undefined}
      {...rest}
    >
      {allOptions || items}
    </Select>
  );
};

export type MultiSelectDropdownProps = Omit<
  SelectProps,
  'onChange' | 'onToggle'
> & {
  id?: string;
  options?: string[];
  selectOptions?: JSX.Element[];
  onChange: (selected: string[], selection?: string) => void;
  isCreatable?: boolean;
};

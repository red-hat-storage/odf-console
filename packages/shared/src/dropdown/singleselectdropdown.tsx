import * as React from 'react';
import {
  Select,
  SelectOption,
  SelectProps,
  SelectVariant,
} from '@patternfly/react-core/deprecated';
import { useCustomTranslation } from '../useCustomTranslationHook';

export const SingleSelectDropdown: React.FC<SingleSelectDropdownProps> = ({
  onChange,
  selectOptions,
  selectedKey = '',
  valueLabelMap,
  ...props
}) => {
  const { t } = useCustomTranslation();

  const [isOpen, setOpen] = React.useState(false);
  const [newOptions, setNewOptions] = React.useState<JSX.Element[]>([]);
  const allOptions =
    newOptions.length > 0 ? selectOptions.concat(newOptions) : selectOptions;

  const onSelect = React.useCallback(
    (event: React.MouseEvent | React.ChangeEvent, selection: string) => {
      /**
       * For case when the dropdownitem that we want to show on UI (label)
       * and its corresponding value that we want to store in the redux-state is different.
       * e.g: OSDSizeDropdown
       */
      const value = valueLabelMap
        ? Object.keys(valueLabelMap).find(
            (key) => valueLabelMap[key] === selection
          )
        : selection;
      onChange(value);
      setOpen(false);
    },
    [valueLabelMap, onChange, setOpen]
  );

  const onCreateOption = (newValue: string) =>
    setNewOptions([
      ...newOptions,
      <SelectOption key={newValue} value={newValue} />,
    ]);

  return (
    // surround select with data-test to be able to find it in tests
    <div className="test" data-test={props['data-test']}>
      <Select
        {...props}
        variant={SelectVariant.single}
        aria-label={t('Select input')}
        onToggle={() => setOpen((o) => !o)}
        onSelect={onSelect}
        selections={selectedKey}
        isOpen={isOpen}
        placeholderText={props?.placeholderText || t('Select options')}
        aria-labelledby={props?.id}
        noResultsFoundText={t('No results found')}
        onCreateOption={(props?.isCreatable && onCreateOption) || undefined}
      >
        {allOptions}
      </Select>
    </div>
  );
};

export type SingleSelectDropdownProps = {
  id?: string;
  selectedKey?: string;
  placeholderText?: string;
  valueLabelMap?: { [key: string]: string };
  className?: string;
  selectOptions: JSX.Element[];
  onChange: (selected: string) => void;
  'data-test'?: string;
  onFilter?: SelectProps['onFilter'];
  hasInlineFilter?: SelectProps['hasInlineFilter'];
  isDisabled?: boolean;
  validated?: 'success' | 'warning' | 'error' | 'default';
  required?: boolean;
  isCreatable?: boolean;
};

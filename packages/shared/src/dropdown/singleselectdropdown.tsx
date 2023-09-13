import * as React from 'react';
import { Select, SelectProps, SelectVariant } from '@patternfly/react-core';
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

  return (
    // surround select with data-test-id to be able to find it in tests
    <div className="test" data-test-id={props['data-test-id']}>
      <Select
        {...props}
        variant={SelectVariant.single}
        aria-label={t('Select input')}
        onToggle={setOpen}
        onSelect={onSelect}
        selections={selectedKey}
        isOpen={isOpen}
        placeholderText={props?.placeholderText || t('Select options')}
        aria-labelledby={props?.id}
        noResultsFoundText={t('No results found')}
      >
        {selectOptions}
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
  'data-test-id'?: string;
  onFilter?: SelectProps['onFilter'];
  hasInlineFilter?: SelectProps['hasInlineFilter'];
  isDisabled?: boolean;
  validated?: 'success' | 'warning' | 'error' | 'default';
  required?: boolean;
};

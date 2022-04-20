import * as React from 'react';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import classNames from 'classnames';
import {
  InputGroup,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { TimeUnits } from '../../constants';

export const TimeDurationDropdown: React.FC<TimeDurationDropdownProps> = ({
  id,
  inputClassName,
  onChange,
  required,
  testID,
  placeholder,
  inputID,
}) => {
  const [unit, setUnit] = React.useState(TimeUnits.HOUR);
  const [value, setValue] = React.useState(0);
  const [validated, setValidated] = React.useState(ValidatedOptions.success);

  const onValueChange = (val) => {
    setValue(val);
    onChange({ value: val, unit }, setValidated);
  };

  const onUnitChange = (newUnit) => {
    setUnit(newUnit);
    onChange({ value, unit: newUnit }, setValidated);
  };

  return (
    <InputGroup>
      <TextInput
        className={classNames('pf-c-form-control', inputClassName)}
        type="number"
        onChange={onValueChange}
        placeholder={placeholder}
        data-test={testID}
        value={value}
        id={inputID}
        validated={validated}
      />
      <StaticDropdown
        defaultSelection={TimeUnits.HOUR}
        dropdownItems={TimeUnits}
        onSelect={onUnitChange}
        required={required}
      />
    </InputGroup>
  );
};

type TimeDurationDropdownProps = {
  id: string;
  placeholder?: string;
  inputClassName?: string;
  onChange: Function;
  required?: boolean;
  testID?: string;
  inputID?: string;
};

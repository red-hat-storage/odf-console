import * as React from 'react';
import { NumberInput } from '@patternfly/react-core';
import StaticDropdown from '../dropdown/StaticDropdown';
import { useCustomTranslation } from '../useCustomTranslationHook';

const NumberSpinner: React.FC<NumberSpinnerProps> = ({
  className,
  changeValueBy,
  min,
  value,
  ...inputProps
}) => {
  const { t } = useCustomTranslation();

  return (
    <div className="co-m-number-spinner">
      <NumberInput
        min={min}
        value={value}
        onMinus={() => changeValueBy(-1)}
        onChange={inputProps.onChange}
        onPlus={() => changeValueBy(1)}
        inputProps={{ ...inputProps }}
        className={className}
        minusBtnAriaLabel={t('Decrement')}
        plusBtnAriaLabel={t('Increment')}
        isDisabled={inputProps.disabled}
      />
    </div>
  );
};

type NumberSpinnerProps = {
  value: number;
  className?: string;
  changeValueBy: (operation: number) => void;
  min?: number;
} & React.HTMLProps<HTMLInputElement>;

export const RequestSizeInput: React.FC<RequestSizeInputProps> = ({
  children,
  defaultRequestSizeUnit,
  defaultRequestSizeValue,
  describedBy,
  dropdownUnits,
  inputID,
  isInputDisabled,
  minValue,
  name,
  onChange,
  placeholder,
  required,
  testID,
  unitText,
}) => {
  const parsedRequestSizeValue = parseInt(String(defaultRequestSizeValue), 10);
  const defaultValue = Number.isFinite(parsedRequestSizeValue)
    ? parsedRequestSizeValue
    : null;
  const [unit, setUnit] = React.useState<string>(defaultRequestSizeUnit);
  const [value, setValue] = React.useState<number>(defaultValue);

  const onValueChange: React.ReactEventHandler<HTMLInputElement> = (event) => {
    setValue(parseInt(event.currentTarget.value, 10));
    onChange({ value: parseInt(event.currentTarget.value, 10), unit });
  };

  const changeValueBy = (changeBy: number) => {
    // When default defaultRequestSizeValue is not set, value becomes NaN and increment decrement buttons of NumberSpinner don't work.
    const newValue = Number.isFinite(value) ? value + changeBy : 0 + changeBy;
    setValue(newValue);
    onChange({ value: newValue, unit });
  };

  const onUnitChange = (newUnit) => {
    setUnit(newUnit);
    onChange({ value, unit: newUnit });
  };

  React.useEffect(() => {
    setUnit(defaultRequestSizeUnit);
    setValue(defaultValue);
  }, [defaultRequestSizeUnit, defaultValue]);

  const inputName = `${name}Value`;
  return (
    <div>
      <div className="pf-v6-c-input-group">
        <NumberSpinner
          onChange={onValueChange}
          changeValueBy={changeValueBy}
          placeholder={placeholder}
          aria-describedby={describedBy}
          name={inputName}
          id={inputID}
          data-test={testID}
          required={required}
          value={value}
          min={minValue}
          disabled={isInputDisabled}
        />
        <StaticDropdown
          className="request-size-input__unit"
          dropdownItems={dropdownUnits}
          onSelect={onUnitChange}
          textGenerator={(key, map) =>
            !!unitText ? `${map[key]} ${unitText}` : map[key]
          }
          defaultSelection={defaultRequestSizeUnit}
          isDisabled={isInputDisabled}
        />
      </div>
      {children}
    </div>
  );
};

export type RequestSizeInputProps = {
  placeholder?: string;
  name: string;
  onChange: Function;
  required?: boolean;
  dropdownUnits: any;
  defaultRequestSizeUnit: string;
  defaultRequestSizeValue: string | number;
  describedBy?: string;
  step?: number;
  minValue?: number;
  inputID?: string;
  testID?: string;
  isInputDisabled?: boolean;
  unitText?: string;
};

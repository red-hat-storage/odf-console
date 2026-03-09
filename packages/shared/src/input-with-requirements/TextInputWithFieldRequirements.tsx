import * as React from 'react';
import { InputGroupItem } from '@patternfly/react-core/dist/esm/components/InputGroup/InputGroupItem';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
import cn from 'classnames';
import { useController, Control, FieldValues } from 'react-hook-form';
import {
  FormGroup,
  FormGroupProps,
  InputGroup,
  TextInput,
  Popover,
  PopoverProps,
  PopoverPosition,
  HelperText,
  HelperTextItem,
  Button,
  TextInputProps,
  Icon,
  FormHelperText,
  HelperTextItemProps,
} from '@patternfly/react-core';
import useFieldRequirements from './useFieldRequirements';
import './TextInputWithFieldRequirements.scss';

export type TextInputWithFieldRequirementsProps = {
  fieldRequirements: string[];
  control: Control<FieldValues>;
  defaultValue?: any;
  formGroupProps: FormGroupProps;
  // In PF5 FormGroupProps don't have helperText
  helperText?: string;
  textInputProps: TextInputProps & {
    'data-test': string;
    disabled?: boolean;
  };
  popoverProps: Omit<PopoverProps, 'bodyContent'>;
  infoElement?: JSX.Element;
  inputPrefixElement?: JSX.Element;
};

export type ValidationIconProp = {
  status: HelperTextItemProps['variant'];
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'error':
      return <ExclamationCircleIcon />;
    case 'success':
      return <CheckCircleIcon />;

    default:
      return <InfoCircleIcon />;
  }
};

const getVariant = (status: string) => {
  switch (status) {
    case 'error':
      return 'danger';
    case 'success':
      return 'success';
    default:
      return 'info';
  }
};

const TextInputWithFieldRequirements: React.FC<
  TextInputWithFieldRequirementsProps
> = ({
  fieldRequirements,
  control,
  formGroupProps,
  textInputProps,
  popoverProps,
  defaultValue = '',
  helperText,
  infoElement,
  inputPrefixElement,
}) => {
  const {
    field: { name, value, onChange, onBlur },
    fieldState: { error, isDirty, isTouched },
    formState: { isSubmitted },
  } = useController({
    name: textInputProps.name || 'name',
    control,
    defaultValue: defaultValue,
  });
  const state = useFieldRequirements(
    fieldRequirements,
    isDirty || isSubmitted,
    error
  );
  const [isVisible, setIsVisible] = React.useState(false);
  const [validated, setValidated] =
    React.useState<HelperTextItemProps['variant']>('default');

  React.useEffect(() => {
    setValidated(
      isDirty || isTouched || isSubmitted
        ? error
          ? 'error'
          : 'success'
        : 'default'
    );
  }, [error, isDirty, isTouched, isSubmitted]);

  const handleInputChange = React.useCallback(
    (event: React.FormEvent<HTMLInputElement>, newValue: string) => {
      if (!isVisible) setIsVisible(true);
      textInputProps?.onChange?.(event, newValue);
      onChange(newValue, event);
    },
    [isVisible, onChange, textInputProps]
  );

  const handleInputBlur = React.useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      setIsVisible(false);
      textInputProps?.onBlur?.(event);
      onBlur();
    },
    [onBlur, textInputProps]
  );

  return (
    <FormGroup {...formGroupProps}>
      {infoElement}
      <div className="field-requirements-input-section">
        {inputPrefixElement}
        <InputGroup
          data-test="field-requirements-input-group"
          className={cn(
            'rich-input__group',
            error && 'rich-input__group--invalid',
            !error && (isDirty || isSubmitted) && 'rich-input__group--success'
          )}
        >
          <InputGroupItem isFill>
            <TextInput
              {...textInputProps}
              name={name}
              value={value}
              className={cn('rich-input__text', textInputProps?.className)}
              onBlur={handleInputBlur}
              onFocus={() => setIsVisible(true)}
              onClick={() => setIsVisible(true)}
              onChange={handleInputChange}
              onKeyUp={onBlur /*Required for avoiding outdated validations.*/}
            />
          </InputGroupItem>
          <InputGroupItem>
            <Popover
              data-test="field-requirements-popover"
              position={PopoverPosition.top}
              isVisible={isVisible}
              shouldOpen={() => setIsVisible(true)}
              shouldClose={() => setIsVisible(false)}
              bodyContent={
                <HelperText component="ul">
                  {Object.keys(state.fieldRequirements).map((rule) => {
                    return (
                      <HelperTextItem
                        variant={state.fieldRequirements[rule]}
                        component="li"
                        key={rule}
                      >
                        {rule}
                      </HelperTextItem>
                    );
                  })}
                </HelperText>
              }
              withFocusTrap={false}
              {...popoverProps}
            >
              <Button
                icon={
                  <Icon status={getVariant(validated)}>
                    {getStatusIcon(validated)}
                  </Icon>
                }
                variant="plain"
                aria-label="Validation"
                tabIndex={-1}
              />
            </Popover>
          </InputGroupItem>
        </InputGroup>
      </div>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{helperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default TextInputWithFieldRequirements;

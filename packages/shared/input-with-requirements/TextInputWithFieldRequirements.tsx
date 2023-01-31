import * as React from 'react';
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
} from '@patternfly/react-core';
import useFieldRequirements from './useFieldRequirements';
import './TextInputWithFieldRequirements.scss';

export type TextInputWithFieldRequirementsProps = {
  fieldRequirements: string[];
  control: Control<FieldValues>;
  defaultValue?: any;
  formGroupProps: FormGroupProps;
  textInputProps: TextInputProps & {
    'data-test': string;
    disabled?: boolean;
  };
  popoverProps: Omit<PopoverProps, 'bodyContent'>;
};

export type ValidationIconProp = {
  status: FormGroupProps['validated'];
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

const TextInputWithFieldRequirements: React.FC<TextInputWithFieldRequirementsProps> =
  ({
    fieldRequirements,
    control,
    formGroupProps,
    textInputProps,
    popoverProps,
    defaultValue = '',
  }) => {
    const {
      field: { name, value, onChange },
      fieldState: { error, isDirty },
    } = useController({
      name: textInputProps.name || 'name',
      control,
      defaultValue: defaultValue,
    });
    const state = useFieldRequirements(fieldRequirements, isDirty, error);
    const [isVisible, setIsVisible] = React.useState(false);
    const [validated, setValidated] =
      React.useState<FormGroupProps['validated']>('default');

    React.useEffect(() => {
      setValidated(!isDirty ? 'default' : error ? 'error' : 'success');
    }, [error, isDirty]);

    const handleInputChange = (
      value: string,
      event: React.FormEvent<HTMLInputElement>
    ) => {
      if (!isVisible) setIsVisible(true);
      textInputProps?.onChange?.(value, event);
      onChange(value, event);
    };

    return (
      <FormGroup {...formGroupProps} validated={validated}>
        <InputGroup
          className={cn(
            'rich-input__group',
            error && 'rich-input__group--invalid',
            !error && isDirty && 'rich-input__group--success'
          )}
        >
          <TextInput
            {...textInputProps}
            name={name}
            value={value}
            className={cn('rich-input__text', textInputProps?.className)}
            onBlur={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onClick={() => setIsVisible(true)}
            onChange={handleInputChange}
          />
          <Popover
            aria-label="popover example"
            position={PopoverPosition.top}
            isVisible={isVisible}
            shouldOpen={() => setIsVisible(true)}
            shouldClose={() => setIsVisible(false)}
            bodyContent={
              <HelperText component="ul">
                {Object.keys(state.fieldRequirements).map((rule) => {
                  return (
                    <HelperTextItem
                      isDynamic
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
            {...popoverProps}
          >
            <Button variant="plain" aria-label="Validation" tabIndex={-1}>
              <Icon status={getVariant(validated)}>
                {getStatusIcon(validated)}
              </Icon>
            </Button>
          </Popover>
        </InputGroup>
      </FormGroup>
    );
  };

export default TextInputWithFieldRequirements;

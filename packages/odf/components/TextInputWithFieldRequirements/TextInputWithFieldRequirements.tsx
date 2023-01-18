import * as React from 'react';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
import cn from 'classnames';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useController, Control, FieldValues } from 'react-hook-form';
import {
  FormGroup,
  FormGroupProps,
  InputGroup,
  TextInput,
  Popover,
  PopoverPosition,
  HelperText,
  HelperTextItem,
  Button,
  TextInputProps,
  Icon,
} from '@patternfly/react-core';
import useFieldRequirements from './useFieldRequirements';

export type TextInputWithFieldRequirementsProps = {
  fieldRequirements: string[];
  control: Control<FieldValues>;
  formGroupProps: FormGroupProps;
  textInputProps: TextInputProps;
};

export type ValidationIconProp = {
  status: FormGroupProps['validated'];
};

export const ValidationIcon: React.FC<ValidationIconProp> = ({ status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'error':
        return <ExclamationTriangleIcon />;
      case 'success':
        return <CheckCircleIcon />;

      default:
        return <InfoCircleIcon />;
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'error':
        return 'danger';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };
  return <Icon status={getVariant()}>{getStatusIcon()}</Icon>;
};

const TextInputWithFieldRequirements: React.FC<TextInputWithFieldRequirementsProps> =
  ({ fieldRequirements, control, formGroupProps, textInputProps }) => {
    const {
      field: { name, value, onChange },
      fieldState: { error, isDirty },
    } = useController({
      name: textInputProps.name || 'name',
      control,
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
            headerContent={'Field requirements'}
            bodyContent={
              <HelperText component="ul">
                {Object.keys(state.fieldRequirements).map((rule) => {
                  return (
                    <HelperTextItem
                      hasIcon
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
          >
            <Button variant="plain" aria-label="Validation" tabIndex={-1}>
              <ValidationIcon status={validated} />
            </Button>
          </Popover>
        </InputGroup>
      </FormGroup>
    );
  };

export default TextInputWithFieldRequirements;

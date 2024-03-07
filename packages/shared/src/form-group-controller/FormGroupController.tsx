import * as React from 'react';
import { useController, UseControllerProps } from 'react-hook-form';
import {
  FormGroup,
  FormGroupProps,
  FormHelperText,
  HelperText,
  HelperTextItem,
  HelperTextItemProps,
  ValidatedOptions,
} from '@patternfly/react-core';

export type FormGroupControllerRenderProps = {
  value: any;
  validated: HelperTextItemProps['variant'];
  onChange: (...event: any[]) => void;
  onBlur: () => void;
};

export type FormGroupControllerProps = UseControllerProps & {
  formGroupProps: FormGroupProps & {
    helperText?: string;
  };
  render: (props: FormGroupControllerRenderProps) => React.ReactNode;
};

const FormGroupController: React.FC<FormGroupControllerProps> = ({
  formGroupProps,
  render,
  ...controllerProps
}) => {
  const {
    field: { value, onChange, onBlur },
    fieldState: { error, isDirty },
    formState: { isSubmitted },
  } = useController(controllerProps);
  const [validated, setValidated] =
    React.useState<HelperTextItemProps['variant']>('default');

  React.useEffect(() => {
    setValidated(
      isDirty || isSubmitted ? (error ? 'error' : 'success') : 'default'
    );
  }, [error, isDirty, isSubmitted]);

  return (
    <FormGroup id={controllerProps.name} {...formGroupProps}>
      {render({ value, validated, onChange, onBlur })}
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={validated}>
            {validated === ValidatedOptions.error && error?.message}
            {validated === ValidatedOptions.default &&
              formGroupProps?.helperText}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default FormGroupController;

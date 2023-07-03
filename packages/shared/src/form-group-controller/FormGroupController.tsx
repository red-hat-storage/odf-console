import * as React from 'react';
import { useController, UseControllerProps } from 'react-hook-form';
import { FormGroup, FormGroupProps } from '@patternfly/react-core';

export type FormGroupControllerRenderProps = {
  value: any;
  validated: FormGroupProps['validated'];
  onChange: (...event: any[]) => void;
  onBlur: () => void;
};

export type FormGroupControllerProps = UseControllerProps & {
  formGroupProps: FormGroupProps;
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
    React.useState<FormGroupProps['validated']>('default');

  React.useEffect(() => {
    setValidated(
      isDirty || isSubmitted ? (error ? 'error' : 'success') : 'default'
    );
  }, [error, isDirty, isSubmitted]);

  return (
    <FormGroup
      id={controllerProps.name}
      {...formGroupProps}
      validated={validated}
      helperTextInvalid={error?.message}
    >
      {render({ value, validated, onChange, onBlur })}
    </FormGroup>
  );
};

export default FormGroupController;

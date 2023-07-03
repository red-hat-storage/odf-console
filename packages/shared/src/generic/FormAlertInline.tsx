import * as React from 'react';
import { FormAlert, Alert, AlertProps } from '@patternfly/react-core';

export type FormAlertInlineProps = {
  title: string;
  message: string;
  variant?: AlertProps['variant'];
};

const FormAlertInline: React.FunctionComponent<FormAlertInlineProps> = ({
  title,
  message,
  variant = 'danger',
}) => {
  return message ? (
    <FormAlert>
      <Alert
        isInline
        className="co-alert co-alert--scrollable"
        variant={variant}
        title={title}
      >
        <div className="co-pre-line">{message}</div>
      </Alert>
    </FormAlert>
  ) : null;
};

export default FormAlertInline;

import * as React from 'react';
import classNames from 'classnames';
import {
  Alert,
  AlertVariant,
  AlertProps,
  Form,
  FormGroup,
  Radio,
  RadioProps,
} from '@patternfly/react-core';
import '../style.scss';
import './radioSelection.scss';

export const RadioSelection: React.FC<RadioSelectionProps> = (props) => {
  const { title, description, alertProps, selected, radioProps } = props;

  return (
    <>
      {!!alertProps && (
        <Alert
          {...alertProps}
          className={classNames('odf-alert', alertProps.className)}
          title={alertProps.title}
          variant={alertProps?.variant || AlertVariant.info}
          isInline
        >
          {alertProps?.description}
        </Alert>
      )}
      <Form>
        <FormGroup
          label={title}
          helperText={description}
          isHelperTextBeforeField
        >
          <div className="odf-radio-selection__padding-left">
            {radioProps.map((radioProp, index) => (
              <Radio
                {...radioProp}
                className={classNames(
                  'odf-radio-selection__margin-top',
                  radioProp.className
                )}
                key={`radio-selection-${index}`}
                name={radioProp.name}
                description={radioProp?.description}
                label={radioProp.label}
                isChecked={radioProp.value === selected}
                body={radioProp?.body}
                onChange={(_unused, event) => {
                  const selectedValue = event.target?.['value'];
                  radioProp.onChange(selectedValue);
                }}
              />
            ))}
          </div>
        </FormGroup>
      </Form>
    </>
  );
};

type RadioType = Omit<RadioProps, 'ref' | 'onChange'> & {
  onChange: (string) => void;
};

type AlertType = AlertProps & {
  description?: React.ReactNode;
};

export type RadioSelectionProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  selected: string;
  radioProps: RadioType[];
  alertProps?: AlertType;
};

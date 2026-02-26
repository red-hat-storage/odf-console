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
  Tooltip,
  Button,
  Popover,
  PopoverProps,
  PopoverPosition,
  HelperText,
  HelperTextItem,
  TextInputProps,
  Icon,
  FormHelperText,
  HelperTextItemProps,
} from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';
import useFieldRequirements from '../input-with-requirements/useFieldRequirements';
import { useCustomTranslation } from '../useCustomTranslationHook';
import '../input-with-requirements/TextInputWithFieldRequirements.scss';

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  placeholder?: string;
};

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  onChange,
  isRequired,
  placeholder,
}) => {
  const { t } = useCustomTranslation();
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <InputGroup>
      <TextInput
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(_event, newValue) => onChange(newValue)}
        isRequired={isRequired}
        placeholder={placeholder}
      />
      <Tooltip content={showPassword ? t('Hide password') : t('Show password')}>
        <Button
          variant="control"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
        </Button>
      </Tooltip>
    </InputGroup>
  );
};

export type ValidatedPasswordInputProps = {
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

const ValidatedPasswordInput: React.FC<ValidatedPasswordInputProps> = ({
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
  const { t } = useCustomTranslation();
  const [showPassword, setShowPassword] = React.useState(false);
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
              type={showPassword ? 'text' : 'password'}
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
            <Tooltip
              content={showPassword ? t('Hide password') : t('Show password')}
            >
              <Button
                variant="control"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? t('Hide password') : t('Show password')
                }
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </Button>
            </Tooltip>
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
          <HelperTextItem variant={validated}>{helperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default PasswordInput;
export { ValidatedPasswordInput };

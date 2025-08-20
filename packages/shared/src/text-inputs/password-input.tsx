import * as React from 'react';
import { InputGroup, TextInput, Tooltip, Button } from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';

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

export default PasswordInput;

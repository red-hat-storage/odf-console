import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TextInput, FormGroup, Stack, StackItem } from '@patternfly/react-core';

type LogReplicationInfoFormProps = {
  location?: string;
  prefix?: string;
  onPrefixChange: (val: string) => void;
  onLogLocationChange: (val: string) => void;
};

export const LogReplicationInfoForm: React.FC<LogReplicationInfoFormProps> = ({
  location,
  prefix,
  onPrefixChange,
  onLogLocationChange,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Stack hasGutter className="odf-mcg__form">
      <StackItem>
        <FormGroup fieldId="logs-location" label={t('Event log bucket')}>
          <TextInput
            data-test="logs-location-input"
            placeholder={t('Enter a bucket name')}
            type="text"
            id="logs-location-input"
            value={location}
            onChange={(val: string) => {
              onLogLocationChange(val);
            }}
            aria-label={t('Prefix')}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup
          fieldId="log-prefix-input-field"
          label={t('Prefix')}
          helperText={t(
            'Object names starting with given prefix gets synchronised with the target bucket'
          )}
        >
          <TextInput
            data-test="log-prefix-input"
            placeholder={t('Enter a prefix')}
            type="text"
            id="log-prefix-input"
            value={prefix}
            onChange={(val: string) => {
              onPrefixChange(val);
            }}
            aria-label={t('Log Prefix')}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

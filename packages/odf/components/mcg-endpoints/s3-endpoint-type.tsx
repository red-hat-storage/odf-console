import * as React from 'react';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Control } from 'react-hook-form';
import {
  Button,
  TextInput,
  InputGroup,
  InputGroupItem,
} from '@patternfly/react-core';
import { AWS_REGIONS, StoreProviders, StoreType } from '../../constants';
import './noobaa-provider-endpoints.scss';
import { awsRegionItems, endpointsSupported } from '../../utils';

export type ProviderDataState = {
  secretName: string;
  secretKey: string;
  accessKey: string;
  region: string;
  target: string;
  endpoint: string;
};

export type StoreAction =
  | { type: 'setSecretName'; value: string }
  | { type: 'setSecretKey'; value: string }
  | { type: 'setAccessKey'; value: string }
  | { type: 'setRegion'; value: string }
  | { type: 'setTarget'; value: string }
  | { type: 'setEndpoint'; value: string };

type S3EndpointTypeProps = {
  type: StoreType;
  state: ProviderDataState;
  dispatch: React.Dispatch<StoreAction>;
  provider: StoreProviders;
  namespace: string;
  control: Control;
  showSecret: boolean;
  setShowSecret: (showSecret: boolean) => void;
};

export const S3EndPointType: React.FC<S3EndpointTypeProps> = (props) => {
  const { t } = useCustomTranslation();

  const {
    provider,
    namespace,
    state,
    dispatch,
    type,
    control,
    showSecret,
    setShowSecret,
  } = props;

  const targetLabel =
    provider === StoreProviders.AZURE
      ? t('Target blob container')
      : t('Target bucket');
  const credentialField1Label =
    provider === StoreProviders.AZURE ? t('Account name') : t('Access key');
  const credentialField2Label =
    provider === StoreProviders.AZURE ? t('Account key') : t('Secret key');

  const switchToSecret = () => {
    setShowSecret(true);
    dispatch({ type: 'setAccessKey', value: '' });
    dispatch({ type: 'setSecretKey', value: '' });
  };

  const switchToCredentials = () => {
    setShowSecret(false);
    dispatch({ type: 'setSecretName', value: '' });
  };

  return (
    <>
      {provider === StoreProviders.AWS && (
        <FormGroupController
          name="aws-region"
          control={control}
          formGroupProps={{
            label: t('Region'),
            fieldId: 'region',
            className: 'nb-endpoints-form-entry',
            isRequired: true,
          }}
          defaultValue={AWS_REGIONS[0]}
          render={({ value, onChange, onBlur }) => (
            <StaticDropdown
              className="nb-endpoints-form-entry__dropdown"
              onSelect={(key) => {
                onChange(key);
                dispatch({ type: 'setRegion', value: key });
              }}
              onBlur={onBlur}
              dropdownItems={awsRegionItems}
              defaultSelection={value}
              aria-label={t('Region Dropdown')}
              data-test="aws-region-dropdown"
              isFullWidth
            />
          )}
        />
      )}

      {endpointsSupported.includes(provider) && (
        <FormGroupController
          name="endpoint"
          control={control}
          formGroupProps={{
            label: t('Endpoint'),
            fieldId: 'endpoint',
            className: 'nb-endpoints-form-entry',
            isRequired: true,
          }}
          defaultValue={state.endpoint}
          render={({ value, onChange, onBlur }) => (
            <TextInput
              data-test={`${type.toLowerCase()}-s3-endpoint`}
              onChange={(e, val) => {
                onChange(e);
                dispatch({ type: 'setEndpoint', value: val });
              }}
              onBlur={onBlur}
              id="endpoint"
              value={value}
              aria-label={t('Endpoint Address')}
            />
          )}
        />
      )}

      {showSecret ? (
        <FormGroupController
          name="secret"
          control={control}
          formGroupProps={{
            label: t('Secret'),
            fieldId: 'secret-dropdown',
            className:
              'nb-endpoints-form-entry nb-endpoints-form-entry--full-width',
            isRequired: true,
          }}
          render={({ onChange, onBlur }) => (
            <InputGroup>
              <InputGroupItem>
                <ResourceDropdown<SecretKind>
                  className="nb-endpoints-form-entry__dropdown nb-endpoints-form-entry__dropdown--full-width"
                  onSelect={(res) => {
                    const value = getName(res);
                    onChange(value);
                    dispatch({ type: 'setSecretName', value });
                  }}
                  onBlur={onBlur}
                  resource={{
                    kind: SecretModel.kind,
                    isList: true,
                    namespace,
                  }}
                  resourceModel={SecretModel}
                />
              </InputGroupItem>
              <InputGroupItem>
                <Button
                  icon={t('Switch to Credentials')}
                  variant="plain"
                  data-test="switch-to-creds"
                  onClick={switchToCredentials}
                />
              </InputGroupItem>
            </InputGroup>
          )}
        />
      ) : (
        <>
          <FormGroupController
            name="access-key"
            control={control}
            defaultValue={state.accessKey}
            formGroupProps={{
              label: credentialField1Label,
              fieldId: 'access-key',
            }}
            render={({ value, onChange, onBlur }) => (
              <InputGroup>
                <InputGroupItem isFill>
                  <TextInput
                    id="access-key"
                    data-test={`${type.toLowerCase()}-access-key`}
                    value={value}
                    onChange={(e, val) => {
                      onChange(e);
                      dispatch({ type: 'setAccessKey', value: val });
                    }}
                    onBlur={onBlur}
                    aria-label={t('Access Key Field')}
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Button
                    icon={t('Switch to Secret')}
                    variant="plain"
                    onClick={switchToSecret}
                  />
                </InputGroupItem>
              </InputGroup>
            )}
          />
          <FormGroupController
            name="secret-key"
            control={control}
            defaultValue={state.secretKey}
            formGroupProps={{
              className: 'nb-endpoints-form-entry',
              label: credentialField2Label,
              fieldId: 'secret-key',
            }}
            render={({ value, onChange, onBlur }) => (
              <TextInput
                value={value}
                id="secret-key"
                data-test={`${type.toLowerCase()}-secret-key`}
                onChange={(e, val) => {
                  onChange(e);
                  dispatch({ type: 'setSecretKey', value: val });
                }}
                onBlur={onBlur}
                aria-label={t('Secret Key Field')}
                type="password"
              />
            )}
          />
        </>
      )}
      <FormGroupController
        name="target-bucket"
        control={control}
        defaultValue={state.target}
        formGroupProps={{
          label: targetLabel,
          fieldId: 'target-bucket',
          className: 'nb-endpoints-form-entry',
          isRequired: true,
        }}
        render={({ value, onChange, onBlur }) => (
          <TextInput
            id="target-bucket"
            value={value}
            data-test={`${type.toLowerCase()}-target-bucket`}
            onChange={(e, val) => {
              onChange(e);
              dispatch({ type: 'setTarget', value: val });
            }}
            onBlur={onBlur}
            aria-label={targetLabel}
          />
        )}
      />
    </>
  );
};

import * as React from 'react';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  FormGroup,
  TextInput,
  InputGroup,
} from '@patternfly/react-core';
import { AWS_REGIONS, BC_PROVIDERS, StoreType } from '../../constants';
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
  provider: BC_PROVIDERS;
  namespace: string;
};

export const S3EndPointType: React.FC<S3EndpointTypeProps> = (props) => {
  const { t } = useCustomTranslation();

  const [showSecret, setShowSecret] = React.useState(true);
  const { provider, namespace, state, dispatch, type } = props;

  const targetLabel =
    provider === BC_PROVIDERS.AZURE
      ? t('Target blob container')
      : t('Target bucket');
  const credentialField1Label =
    provider === BC_PROVIDERS.AZURE ? t('Account name') : t('Access key');
  const credentialField2Label =
    provider === BC_PROVIDERS.AZURE ? t('Account key') : t('Secret key');

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
      {provider === BC_PROVIDERS.AWS && (
        <FormGroup
          label={t('Region')}
          fieldId="region"
          className="nb-endpoints-form-entry"
          isRequired
        >
          <StaticDropdown
            className="nb-endpoints-form-entry__dropdown"
            onSelect={(key) => {
              dispatch({ type: 'setRegion', value: key });
            }}
            dropdownItems={awsRegionItems}
            defaultSelection={AWS_REGIONS[0]}
            aria-label={t('Region Dropdown')}
            data-test="aws-region-dropdown"
          />
        </FormGroup>
      )}

      {endpointsSupported.includes(provider) && (
        <FormGroup
          label={t('Endpoint')}
          fieldId="endpoint"
          className="nb-endpoints-form-entry"
          isRequired
        >
          <TextInput
            data-test={`${type.toLowerCase()}-s3-endpoint`}
            onChange={(e) => {
              dispatch({ type: 'setEndpoint', value: e });
            }}
            id="endpoint"
            value={state.endpoint}
            aria-label={t('Endpoint Address')}
          />
        </FormGroup>
      )}

      {showSecret ? (
        <FormGroup
          label={t('Secret')}
          fieldId="secret-dropdown"
          className="nb-endpoints-form-entry nb-endpoints-form-entry--full-width"
          isRequired
        >
          <InputGroup>
            <ResourceDropdown<SecretKind>
              className="nb-endpoints-form-entry__dropdown nb-endpoints-form-entry__dropdown--full-width"
              onSelect={(res) =>
                dispatch({ type: 'setSecretName', value: getName(res) })
              }
              resource={{
                kind: SecretModel.kind,
                isList: true,
                namespace,
              }}
              resourceModel={SecretModel}
            />
            <Button
              variant="plain"
              data-test="switch-to-creds"
              onClick={switchToCredentials}
            >
              {t('Switch to Credentials')}
            </Button>
          </InputGroup>
        </FormGroup>
      ) : (
        <>
          <FormGroup label={credentialField1Label} fieldId="access-key">
            <InputGroup>
              <TextInput
                id="access-key"
                data-test={`${type.toLowerCase()}-access-key`}
                value={state.accessKey}
                onChange={(e) => {
                  dispatch({ type: 'setAccessKey', value: e });
                }}
                aria-label={t('Access Key Field')}
              />
              <Button variant="plain" onClick={switchToSecret}>
                {t('Switch to Secret')}
              </Button>
            </InputGroup>
          </FormGroup>
          <FormGroup
            className="nb-endpoints-form-entry"
            label={credentialField2Label}
            fieldId="secret-key"
          >
            <TextInput
              value={state.secretKey}
              id="secret-key"
              data-test={`${type.toLowerCase()}-secret-key`}
              onChange={(e) => {
                dispatch({ type: 'setSecretKey', value: e });
              }}
              aria-label={t('Secret Key Field')}
              type="password"
            />
          </FormGroup>
        </>
      )}
      <FormGroup
        label={targetLabel}
        fieldId="target-bucket"
        className="nb-endpoints-form-entry"
        isRequired
      >
        <TextInput
          id="target-bucket"
          value={state.target}
          data-test={`${type.toLowerCase()}-target-bucket`}
          onChange={(e) => dispatch({ type: 'setTarget', value: e })}
          aria-label={targetLabel}
        />
      </FormGroup>
    </>
  );
};

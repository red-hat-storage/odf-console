import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { validateConnectionName } from '../../constants';
import { HpcsConfig, HPCSParams, ProviderNames } from '../../types';
import { KMSConfigureProps } from './providers';
import { kmsConfigValidation, isValidName } from './utils';
import './kms-config.scss';

const IBM_TOKEN_URL = 'https://iam.cloud.ibm.com/oidc/token';

export const HpcsConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
}) => {
  const { t } = useCustomTranslation();

  const kms = useDeepCompareMemoize(
    state.kms.providerState,
    true
  ) as HpcsConfig;
  const kmsObj: HpcsConfig = React.useMemo(() => _.cloneDeep(kms), [kms]);

  React.useEffect(() => {
    const hasHandled: boolean = kmsConfigValidation(kms, ProviderNames.HPCS);
    if (kms.hasHandled !== hasHandled)
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: {
          ...kms,
          hasHandled,
        },
      });
  }, [dispatch, kms]);

  const setParams =
    (param: string, isRequired: boolean = true) =>
    (value: string) => {
      if (isRequired) {
        const validParam: boolean =
          param === HPCSParams.NAME ? isValidName(value) : true;
        kmsObj[param].value = value;
        kmsObj[param].valid = validParam && value !== '';
      } else {
        kmsObj[param] = value;
      }
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: kmsObj,
      });
    };

  const isValid = (value: boolean) =>
    value ? ValidatedOptions.default : ValidatedOptions.error;

  return (
    <>
      <FormGroup
        fieldId="kms-service-name"
        label={t('Connection name')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={kms.name.value}
          onChange={(_ev, value) => setParams(HPCSParams.NAME)(value)}
          type="text"
          id="kms-service-name"
          name="kms-service-name"
          isRequired
          validated={isValid(kms.name.valid)}
          data-test="kms-service-name-text"
        />

        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={isValid(kms.name.valid)}>
              {isValid(kms.name.valid) === ValidatedOptions.default
                ? t(
                    'An unique name for the key management service within the project. Name must only include alphanumeric characters, "-", "_" or "."'
                  )
                : validateConnectionName(kms.name.value, t)}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="kms-instance-id"
        label={t('Service instance ID')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={kms.instanceId.value}
          onChange={(_ev, value) => setParams(HPCSParams.INSTANCE_ID)(value)}
          type="text"
          id="kms-instance-id"
          name="kms-instance-id"
          isRequired
          validated={isValid(kms.instanceId.valid)}
          data-test="kms-instance-id-text"
        />
        <FormHelperText>
          <HelperText>
            {isValid(kms.instanceId.valid) === ValidatedOptions.error && (
              <HelperTextItem variant={isValid(kms.instanceId.valid)}>
                {t('This is a required field')}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="kms-api-key"
        label={t('Service API key')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={kms.apiKey.value}
          onChange={(_ev, value) => setParams(HPCSParams.API_KEY)(value)}
          type="text"
          id="kms-api-key"
          name="kms-api-key"
          isRequired
          validated={isValid(kms.apiKey.valid)}
          data-test="kms-api-key-text"
        />
        <FormHelperText>
          <HelperText>
            {isValid(kms.apiKey.valid) === ValidatedOptions.error && (
              <HelperTextItem variant={isValid(kms.apiKey.valid)}>
                {t('This is a required field')}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="kms-root-key"
        label={t('Customer root key')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={kms.rootKey.value}
          onChange={(_ev, value) => setParams(HPCSParams.ROOT_KEY)(value)}
          type="text"
          id="kms-root-key"
          name="kms-root-key"
          isRequired
          validated={isValid(kms.rootKey.valid)}
          data-test="kms-root-key-text"
        />
        <FormHelperText>
          <HelperText>
            {isValid(kms.rootKey.valid) === ValidatedOptions.error && (
              <HelperTextItem
                variant={isValid(kms.rootKey.valid) ? 'default' : 'error'}
              >
                {t('This is a required field')}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="kms-base-url"
        label={t('IBM base URL')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={kms.baseUrl.value}
          onChange={(_ev, value) => setParams(HPCSParams.BASE_URL)(value)}
          type="text"
          id="kms-base-url"
          name="kms-base-url"
          isRequired
          validated={isValid(kms.baseUrl.valid)}
          data-test="kms-base-url"
        />
        <FormHelperText>
          <HelperText>
            {isValid(kms.baseUrl.valid) === ValidatedOptions.error && (
              <HelperTextItem variant={isValid(kms.baseUrl.valid)}>
                {t('This is a required field')}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="kms-token-url"
        label={t('IBM token URL')}
        className={`${className}__form-body`}
      >
        <TextInput
          value={kms.tokenUrl}
          onChange={(_ev, value) =>
            setParams(HPCSParams.TOKEN_URL, false)(value)
          }
          placeholder={IBM_TOKEN_URL}
          type="text"
          id="kms-token-url"
          name="kms-token-url"
          data-test="kms-token-url"
        />
      </FormGroup>
    </>
  );
};

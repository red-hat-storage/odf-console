import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import {
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ThalesConfig, ProviderNames } from '../../types';
import { FileUploadInput, UploadInputItem } from './file-upload-input';
import { NameAddrPort } from './name-address-port';
import { KMSConfigureProps } from './providers';
import { kmsConfigValidation } from './utils';
import './kms-config.scss';

export const uploadInputItems: UploadInputItemType = (t) => [
  {
    id: 'clientCert',
    inputName: t('Client certificate'),
  },
  {
    id: 'caCert',
    inputName: t('CA certificate'),
  },
  {
    id: 'clientKey',
    inputName: t('Client private key'),
  },
];

export const ThalesConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
}) => {
  const { t } = useCustomTranslation();

  const thalesState = useDeepCompareMemoize(
    state.kms.providerState,
    true
  ) as ThalesConfig;
  const thalesStateClone: ThalesConfig = React.useMemo(
    () => _.cloneDeep(thalesState),
    [thalesState]
  );

  const { encryption } = state;
  const isScEncryption = encryption.storageClass;

  const updateThalesState = React.useCallback(
    (kmsConfig: ThalesConfig) =>
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: kmsConfig,
      }),
    [dispatch]
  );

  React.useEffect(() => {
    // only need to pass unique identifier for ceph-csi
    const validUniqueId: boolean = isScEncryption
      ? thalesState.uniqueId.valid && thalesState.uniqueId.value !== ''
      : true;
    const hasHandled: boolean =
      validUniqueId && kmsConfigValidation(thalesState, ProviderNames.THALES);
    if (thalesState.hasHandled !== hasHandled) {
      updateThalesState({ ...thalesState, hasHandled });
    }
  }, [updateThalesState, thalesState, isScEncryption]);

  const setUniqueID = (id: string) => {
    thalesStateClone.uniqueId.value = id;
    thalesStateClone.uniqueId.valid = id !== '';
    updateThalesState(thalesStateClone);
  };

  const setTLSServer = (serverName: string) => {
    thalesStateClone.tls = serverName;
    updateThalesState(thalesStateClone);
  };

  const getValidatedUniqueIdProp = getValidatedProp(
    !thalesState.uniqueId.valid
  );

  return (
    <>
      <NameAddrPort
        className={className}
        kmsState={thalesState}
        kmsStateClone={thalesStateClone}
        updateKmsState={updateThalesState}
        canAcceptIP
      />
      {uploadInputItems(t).map((uploadItem: UploadInputItem) => (
        <FileUploadInput
          key={uploadItem.id}
          id={uploadItem.id}
          inputName={uploadItem.inputName}
          className={className}
          kmsState={thalesState}
          kmsStateClone={thalesStateClone}
          updateKmsState={updateThalesState}
        />
      ))}
      {isScEncryption && (
        <FormGroup
          fieldId="kms-unique-id"
          label={t('Unique identifier')}
          className={`${className}__form-body`}
          isRequired
        >
          <TextInput
            value={thalesState.uniqueId.value}
            onChange={(_event, id: string) => setUniqueID(id)}
            type="text"
            id="kms-unique-id"
            name="kms-unique-id"
            isRequired
            validated={getValidatedUniqueIdProp}
            data-test="kms-unique-id"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={getValidatedUniqueIdProp}>
                {getValidatedUniqueIdProp === ValidatedOptions.default
                  ? t(
                      'Unique ID of the key used for encrypting/decrypting. This only applies to encrpyted PVCs.'
                    )
                  : t('This is a required field')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      )}
      <FormGroup
        fieldId="kms-tls-server"
        label={t('TLS server name')}
        className={`${className}__form-body`}
      >
        <TextInput
          value={thalesState.tls}
          onChange={(_event, serverName: string) => setTLSServer(serverName)}
          type="text"
          id="kms-tls-server"
          name="kms-tls-server"
          data-test="kms-tls-server"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'The endpoint server name. Useful when the KMIP endpoint does not have a DNS entry.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </>
  );
};

type UploadInputItemType = (t: TFunction) => UploadInputItem[];

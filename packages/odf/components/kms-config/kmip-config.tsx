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
import { KmipConfig } from '../../types';
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

export const KmipConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
}) => {
  const provider = state.kms.provider;
  const { t } = useCustomTranslation();

  const kmipState = useDeepCompareMemoize(
    state.kms.providerState,
    true
  ) as KmipConfig;
  const kmipStateClone: KmipConfig = React.useMemo(
    () => _.cloneDeep(kmipState),
    [kmipState]
  );

  const { encryption } = state;
  const isScEncryption = encryption.storageClass;

  const updateKmipState = React.useCallback(
    (kmsConfig: KmipConfig) =>
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: kmsConfig,
      }),
    [dispatch]
  );

  React.useEffect(() => {
    // only need to pass unique identifier for ceph-csi
    const validUniqueId: boolean = isScEncryption
      ? kmipState.uniqueId.valid && kmipState.uniqueId.value !== ''
      : true;
    const hasHandled: boolean =
      validUniqueId && kmsConfigValidation(kmipState, provider);
    if (kmipState.hasHandled !== hasHandled) {
      updateKmipState({ ...kmipState, hasHandled });
    }
  }, [updateKmipState, kmipState, isScEncryption, provider]);

  const setUniqueID = (id: string) => {
    kmipStateClone.uniqueId.value = id;
    kmipStateClone.uniqueId.valid = id !== '';
    updateKmipState(kmipStateClone);
  };

  const setTLSServer = (serverName: string) => {
    kmipStateClone.tls = serverName;
    updateKmipState(kmipStateClone);
  };

  const getValidatedUniqueIdProp = getValidatedProp(!kmipState.uniqueId.valid);

  return (
    <>
      <NameAddrPort
        className={className}
        kmsState={kmipState}
        kmsStateClone={kmipStateClone}
        updateKmsState={updateKmipState}
        canAcceptIP
      />
      {uploadInputItems(t).map((uploadItem: UploadInputItem) => (
        <FileUploadInput
          key={uploadItem.id}
          id={uploadItem.id}
          inputName={uploadItem.inputName}
          className={className}
          kmsState={kmipState}
          kmsStateClone={kmipStateClone}
          updateKmsState={updateKmipState}
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
            value={kmipState.uniqueId.value}
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
          value={kmipState.tls}
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

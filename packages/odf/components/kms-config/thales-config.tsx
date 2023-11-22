import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import {
  FormGroup,
  TextInput,
  FileUpload,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { KMSMaxFileUploadSize } from '../../constants';
import { ThalesConfig, ProviderNames } from '../../types';
import { NameAddrPort, isValid } from './name-address-port';
import { KMSConfigureProps } from './providers';
import { kmsConfigValidation } from './utils';
import './kms-config.scss';

const uploadInputItems: UploadInputItems = (t) => [
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

const FileUploadInput: React.FC<FileUploadInputProps> = ({
  id,
  inputName,
  className,
  thalesState,
  thalesStateClone,
  updateThalesState,
}) => {
  const { t } = useCustomTranslation();

  const KMSFileSizeErrorMsg = t(
    'Invalid file: File size exceeds 4MB limit or incorrect file extension (only .pem files allowed).'
  );
  const KMSFileReadErrorMsg = t('File read failed. Please try again.');

  const setError = React.useCallback(
    (errMsg: string) => {
      thalesStateClone[id].value = '';
      thalesStateClone[id].error = errMsg;
      updateThalesState(thalesStateClone);
    },
    [thalesStateClone, updateThalesState, id]
  );

  const readFile = React.useCallback(
    (file: File, filename: string) => {
      const reader = new FileReader();
      reader.onload = () => {
        const input = reader.result;
        thalesStateClone[id].value = input.toString();
        thalesStateClone[id].error = '';
        thalesStateClone[id].fileName = filename;
        updateThalesState(thalesStateClone);
      };
      reader.onerror = () => {
        thalesStateClone[id].fileName = filename;
        setError(KMSFileReadErrorMsg);
      };
      if (file) {
        reader.readAsText(file, 'UTF-8');
      } else {
        thalesStateClone[id].value = '';
        thalesStateClone[id].error = '';
        thalesStateClone[id].fileName = '';
        updateThalesState(thalesStateClone);
      }
    },
    [setError, thalesStateClone, updateThalesState, KMSFileReadErrorMsg, id]
  );

  const updateCertificate = React.useCallback(
    (value: File, filename: string) => {
      readFile(value, filename);
    },
    [readFile]
  );

  return (
    <FormGroup
      key={`thales-${id}`}
      fieldId={id}
      label={inputName}
      className={`${className}__form-body`}
      isRequired
    >
      <FileUpload
        id={id}
        value={thalesState[id].value}
        filename={thalesState[id].fileName}
        onFileInputChange={(_event, file) => updateCertificate(file, file.name)}
        hideDefaultPreview
        filenamePlaceholder={t('Upload a .PEM file here...')}
        dropzoneProps={{
          accept: {
            'text/plain': ['.pem'],
          },
          maxSize: KMSMaxFileUploadSize,
          onDropRejected: () => setError(KMSFileSizeErrorMsg),
        }}
        data-test={id}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={isValid(!thalesState[id].error)}>
            {isValid(thalesState[id].error) === ValidatedOptions.default &&
              thalesState[id].error}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

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
          thalesState={thalesState}
          thalesStateClone={thalesStateClone}
          updateThalesState={updateThalesState}
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
            validated={isValid(thalesState.uniqueId.valid)}
            data-test="kms-unique-id"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={isValid(thalesState.uniqueId.valid)}>
                {isValid(thalesState.uniqueId.valid) ===
                ValidatedOptions.default
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

type UploadInputItem = {
  id: string;
  inputName: string;
};

type UploadInputItems = (t: TFunction) => UploadInputItem[];

type FileUploadInputProps = UploadInputItem & {
  className: string;
  thalesState: ThalesConfig;
  thalesStateClone: ThalesConfig;
  updateThalesState: (kmsConfig: ThalesConfig) => void;
};

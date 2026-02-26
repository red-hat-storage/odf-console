import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import {
  FileUpload,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { KMSMaxFileUploadSize } from '../../../odf/constants';
import { AzureConfig, ThalesConfig } from '../../../odf/types';

export const FileUploadInput: React.FC<
  FileUploadInputProps<AzureConfig | ThalesConfig>
> = ({
  id,
  inputName,
  helperText,
  labelIcon,
  className,
  kmsState,
  kmsStateClone,
  updateKmsState,
}) => {
  const { t } = useCustomTranslation();
  const KMSFileSizeErrorMsg = t(
    'Invalid file: File size exceeds 4MB limit or incorrect file extension (only .pem files allowed).'
  );

  const FileReadErrorMsg = t('File read failed. Please try again.');

  const setError = React.useCallback(
    (errMsg: string) => {
      kmsStateClone[id].value = '';
      kmsStateClone[id].error = errMsg;
      updateKmsState(kmsStateClone);
    },
    [kmsStateClone, updateKmsState, id]
  );

  const readFile = React.useCallback(
    (file?: File, filename?: string) => {
      const reader = new FileReader();
      reader.onload = () => {
        const input = reader.result;
        kmsStateClone[id].value = input.toString();
        kmsStateClone[id].error = '';
        kmsStateClone[id].fileName = filename;
        updateKmsState(kmsStateClone);
      };
      reader.onerror = () => {
        kmsStateClone[id].fileName = filename;
        setError(FileReadErrorMsg);
      };
      if (file) {
        reader.readAsText(file, 'UTF-8');
      } else {
        kmsStateClone[id].value = '';
        kmsStateClone[id].error = '';
        kmsStateClone[id].fileName = '';
        updateKmsState(kmsStateClone);
      }
    },
    [setError, kmsStateClone, updateKmsState, FileReadErrorMsg, id]
  );

  const handleClear = (
    _event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    readFile();
  };

  const updateCertificate = React.useCallback(
    (value: File, filename: string) => {
      readFile(value, filename);
    },
    [readFile]
  );

  return (
    <FormGroup
      key={`kms-${id}`}
      fieldId={id}
      label={inputName}
      labelHelp={labelIcon}
      className={`${className}__form-body`}
      isRequired
    >
      <FileUpload
        id={id}
        value={kmsState[id].value}
        filename={kmsState[id].fileName}
        onClearClick={handleClear}
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
        data-testid={id}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={getValidatedProp(kmsState[id].error)}>
            {getValidatedProp(!kmsState[id].error) === ValidatedOptions.default
              ? kmsState[id].error
              : helperText}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export type UploadInputItem = {
  id: string;
  inputName: string;
};

type FileUploadInputProps<T extends AzureConfig | ThalesConfig> =
  UploadInputItem & {
    helperText?: string;
    labelIcon?: React.ReactElement;
    className: string;
    kmsState: T;
    kmsStateClone: T;
    updateKmsState: (kmsConfig: T) => void;
  };

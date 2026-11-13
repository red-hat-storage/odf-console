import * as React from 'react';
import {
  FileUpload,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { FieldLevelHelp } from '../generic/FieldLevelHelp';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { getValidatedProp } from '../utils/common';

export type TextFileValue = {
  value: string;
  fileName: string;
  error: string;
};

export const emptyTextFileValue: TextFileValue = {
  value: '',
  fileName: '',
  error: '',
};

const textByteLength = (text: string) => new TextEncoder().encode(text).length;

const hasAllowedExtension = (fileName: string, extensions: string[]) =>
  extensions.some((extension) => fileName.toLowerCase().endsWith(extension));

type TextFileUploadProps = {
  id: string;
  label: string;
  helpText: string;
  popover?: React.ReactNode;
  extensions: string[];
  invalidFileMessage: string;
  tooLargeMessage: string;
  maxFileSize: number;
  file: TextFileValue;
  onChange: React.Dispatch<React.SetStateAction<TextFileValue>>;
  textAreaPlaceholder?: string;
  isRequired?: boolean;
};

export const TextFileUpload: React.FC<TextFileUploadProps> = ({
  id,
  label,
  helpText,
  popover,
  extensions,
  invalidFileMessage,
  tooLargeMessage,
  maxFileSize,
  file,
  onChange,
  textAreaPlaceholder,
  isRequired = true,
}) => {
  const { t } = useCustomTranslation();
  const [isLoading, setIsLoading] = React.useState(false);

  const rejectFile = (message: string) => {
    setIsLoading(false);
    onChange({ value: '', fileName: '', error: message });
  };

  const acceptFile = (uploaded: File) => {
    if (!uploaded || !hasAllowedExtension(uploaded.name, extensions)) {
      rejectFile(invalidFileMessage);
      return;
    }
    if (uploaded.size > maxFileSize) {
      rejectFile(tooLargeMessage);
      return;
    }
    onChange((current) => ({
      ...current,
      fileName: uploaded.name,
      error: '',
    }));
  };

  return (
    <FormGroup
      label={
        <span className="pf-v6-u-font-weight-normal">
          {label}
          <FieldLevelHelp>{popover ?? helpText}</FieldLevelHelp>
        </span>
      }
      fieldId={id}
      isRequired={isRequired}
    >
      <FileUpload
        id={id}
        type="text"
        value={file.value}
        filename={file.fileName}
        filenamePlaceholder={t('Drag and drop a file or upload')}
        filenameAriaLabel={label}
        textAreaPlaceholder={textAreaPlaceholder}
        browseButtonText={t('Upload')}
        clearButtonText={t('Clear')}
        allowEditingUploadedText
        isLoading={isLoading}
        validated={getValidatedProp(!!file.error)}
        dropzoneProps={{
          accept: { 'text/plain': extensions },
          maxSize: maxFileSize,
          onDropRejected: (rejections) => acceptFile(rejections[0]?.file),
        }}
        onFileInputChange={(_event, uploaded) => acceptFile(uploaded)}
        onDataChange={(_event, data) =>
          onChange((current) => ({
            ...current,
            value: data,
            error:
              textByteLength(data) > maxFileSize
                ? tooLargeMessage
                : data
                  ? ''
                  : current.error,
          }))
        }
        onTextChange={(_event, text) =>
          onChange((current) => ({
            ...current,
            value: text,
            error: textByteLength(text) > maxFileSize ? tooLargeMessage : '',
          }))
        }
        onReadStarted={() => setIsLoading(true)}
        onReadFinished={() => setIsLoading(false)}
        onReadFailed={() => {
          setIsLoading(false);
          onChange({
            value: '',
            fileName: '',
            error: t('File read failed. Please try again.'),
          });
        }}
        onClearClick={() => {
          setIsLoading(false);
          onChange(emptyTextFileValue);
        }}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={file.error ? 'error' : 'default'}>
            {file.error || helpText}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

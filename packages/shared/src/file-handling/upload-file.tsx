import * as React from 'react';
import {
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatus,
  MultipleFileUploadStatusItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';

type readFile = {
  fileName: string;
  data?: string;
  loadResult?: 'danger' | 'success';
  loadError?: DOMException;
};

enum Status {
  InProgress = 'inProgress',
  Success = 'success',
  Danger = 'danger',
  Error = 'error',
}

type UploadFilePickerProps = {
  infoText: string;
  titleText: string;
  acceptedFiles: string;
  uploadLimit?: number;
  onFileUpload: (currentFiles: File[]) => void;
  compatibleFileFilter?: (file: File) => boolean;
  uploadedFiles?: File[];
};
const UploadFilePicker: React.FC<UploadFilePickerProps> = ({
  onFileUpload,
  infoText,
  titleText,
  uploadLimit,
  compatibleFileFilter,
  uploadedFiles = [],
}) => {
  const [currentFiles, setCurrentFiles] = React.useState<File[]>(
    uploadedFiles.filter((file) => file != null)
  );
  const [readFileData, setReadFileData] = React.useState<readFile[]>([]);
  const [showStatus, setShowStatus] = React.useState(false);
  const [statusIcon, setStatusIcon] = React.useState(Status.InProgress);

  if (!showStatus && currentFiles.length > 0) {
    setShowStatus(true);
  }

  React.useEffect(() => {
    if (readFileData.length < currentFiles.length) {
      setStatusIcon(Status.InProgress);
    } else if (
      readFileData.every((file) => file.loadResult === Status.Success)
    ) {
      setStatusIcon(Status.Success);
    } else {
      setStatusIcon(Status.Danger);
    }
    onFileUpload(currentFiles);
  }, [readFileData, currentFiles, onFileUpload]);

  const removeFiles = (namesOfFilesToRemove: string[]) => {
    const newCurrentFiles = currentFiles.filter(
      (currentFile) =>
        !namesOfFilesToRemove.some((fileName) => fileName === currentFile.name)
    );

    setCurrentFiles(newCurrentFiles);

    const newReadFiles = readFileData.filter(
      (readFile) =>
        !namesOfFilesToRemove.some((fileName) => fileName === readFile.fileName)
    );

    setReadFileData(newReadFiles);
  };

  const updateCurrentFiles = (files: File[]) => {
    setCurrentFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleFileDrop = (_event, droppedFiles: File[]) => {
    // identify what, if any, files are re-uploads of already uploaded files
    const currentFileNames = currentFiles.map((file) => file.name);
    const reUploads = droppedFiles.filter((droppedFile) =>
      currentFileNames.includes(droppedFile.name)
    );

    const compatibleFiles = droppedFiles.filter(compatibleFileFilter);
    Promise.resolve()
      .then(() => removeFiles(reUploads.map((file) => file.name)))
      .then(() => updateCurrentFiles(compatibleFiles));
  };

  const handleReadSuccess = (data: string, file: File) => {
    setReadFileData((prevReadFiles) => [
      ...prevReadFiles,
      { data, fileName: file.name, loadResult: Status.Success },
    ]);
  };

  const handleReadFail = (error: DOMException, file: File) => {
    setReadFileData((prevReadFiles) => [
      ...prevReadFiles,
      { loadError: error, fileName: file.name, loadResult: Status.Danger },
    ]);
  };

  const createHelperText = (file: File) => {
    const fileResult = readFileData.find(
      (readFile) => readFile.fileName === file.name
    );
    if (fileResult?.loadError) {
      return (
        <HelperText isLiveRegion>
          <HelperTextItem variant={Status.Error}>
            {fileResult.loadError.toString()}
          </HelperTextItem>
        </HelperText>
      );
    }
  };

  return (
    <>
      <MultipleFileUpload onFileDrop={handleFileDrop}>
        <MultipleFileUploadMain
          titleText={titleText}
          infoText={infoText}
          isUploadButtonHidden={currentFiles.length === uploadLimit}
        />
        {showStatus && (
          <MultipleFileUploadStatus statusToggleIcon={statusIcon}>
            {currentFiles.map((file) => (
              <MultipleFileUploadStatusItem
                file={file}
                key={file.name}
                onClearClick={() => removeFiles([file.name])}
                onReadSuccess={handleReadSuccess}
                onReadFail={handleReadFail}
                progressHelperText={createHelperText(file)}
              />
            ))}
          </MultipleFileUploadStatus>
        )}
      </MultipleFileUpload>
    </>
  );
};

export default UploadFilePicker;

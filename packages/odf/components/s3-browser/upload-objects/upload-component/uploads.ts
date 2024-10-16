import * as React from 'react';
import { Upload } from '@aws-sdk/lib-storage';
import { getPrefix } from '@odf/core/utils';
import { S3Commands } from '@odf/shared/s3';
import * as _ from 'lodash-es';
import { UploadProgress, UploadStatus } from '../types';

export const uploadFile = async (
  files: File[],
  client: S3Commands,
  bucketName: string,
  setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress>>,
  folderPath: string
) => {
  const performUploadPromise = (
    file: File
  ): ReturnType<typeof Upload.prototype.done> => {
    const key = getPrefix(file.webkitRelativePath || file.name, folderPath);
    const uploader = new Upload({
      client: client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: file,
        ...(file.type ? { ContentType: file.type } : {}),
      },
      partSize: 5 * 1024 * 1024,
      queueSize: 4,
    });
    uploader.on('httpUploadProgress', (progress) => {
      const isComplete = progress.total === progress.loaded;
      setUploadProgress((prev) => ({
        ...prev,
        [progress.Key]: {
          startTime: prev[progress.Key].startTime ?? Date.now(),
          name: progress.Key,
          total: progress.total,
          loaded: progress.loaded,
          abort: () => {
            uploader.abort();
            setUploadProgress((previous) => {
              const clonedPrev = _.cloneDeep(previous);
              clonedPrev[progress.Key].uploadState = UploadStatus.UPLOAD_FAILED;
              return clonedPrev;
            });
          },
          uploadState: isComplete
            ? UploadStatus.UPLOAD_COMPLETE
            : UploadStatus.UPLOAD_START,
        },
      }));
    });
    return uploader.done();
  };
  const allUploadPromise = files.map((file) => performUploadPromise(file));
  try {
    await Promise.allSettled(allUploadPromise);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
  return Date.now();
};

export const convertFileToUploadProgress = (
  file: File
): UploadProgress[keyof UploadProgress] => ({
  total: file.size,
  loaded: 0,
  uploadState: UploadStatus.INIT_STATE,
  abort: null,
  name: file.name,
  filePath: file.webkitRelativePath,
  startTime: undefined,
});

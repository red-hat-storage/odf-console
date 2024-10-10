import * as React from 'react';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Commands } from '@odf/shared/s3';
import * as _ from 'lodash-es';
import { UploadProgress, UploadStatus } from './types';

export function* uploadFile(
  files: File[],
  client: S3Commands,
  bucketName: string,
  setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress>>
): Generator<unknown, unknown, ReturnType<typeof Upload.prototype.done>[]> {
  const performUploadPromise = (
    file: File
  ): ReturnType<typeof Upload.prototype.done> => {
    const uploader = new Upload({
      client: client,
      params: {
        Bucket: bucketName,
        Key: file.name,
        Body: file,
      },
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
  try {
    const allUploadPromise = files.map((file) => performUploadPromise(file));
    while (true) {
      const completed = yield Promise.all(allUploadPromise);
      const totallyCompleted = completed.every(async (p) => {
        try {
          const done = await p;
          return done;
        } catch {
          return true;
        }
      });
      if (totallyCompleted) {
        break;
      }
      yield new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (e) {
    return e;
  }
}

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

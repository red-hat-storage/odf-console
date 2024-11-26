import { humanizeMinutes, humanizeSeconds } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { UploadProgress, UploadProgressBatch, UploadStatus } from './types';

export const getCompletedAndTotalUploadCount = (
  objects: UploadProgressBatch
) => {
  const totalObjects = Object.keys(objects).length;
  const totalUploaded = Object.values(objects).filter(isCompletedFile).length;
  return [totalUploaded, totalObjects];
};

export const getCompletedTotalFailedCount = (
  uploadProgress: UploadProgressBatch
) => {
  const progressItems = Object.values(uploadProgress);
  const [completedUploads, failedUploads] = progressItems.reduce(
    (acc, curr) => {
      const isCompleted = isCompletedFile(curr);
      if (isCompleted) {
        acc = [acc[0] + 1, acc[1]];
        return acc;
      }
      const isFailed = isFailedFile(curr) || isCancelledFile(curr);
      if (isFailed) {
        acc = [acc[0], acc[1] + 1];
        return acc;
      }
      return acc;
    },
    [0, 0]
  );
  return [completedUploads, progressItems.length, failedUploads];
};

export const getTotalTimeElapsed = (
  objects: UploadProgressBatch,
  completionTime: number
): string => {
  const earliestTime = Object.values(objects).reduce((acc, curr) => {
    if (curr.startTime < acc) {
      return curr.startTime;
    } else return acc;
  }, Number.MAX_SAFE_INTEGER);
  let fromNow = completionTime - earliestTime;
  fromNow = fromNow < 0 ? 0 : fromNow;
  const minutes = humanizeMinutes(fromNow / 1000);
  if (minutes.value > 1) {
    return minutes.string;
  } else return humanizeSeconds(fromNow / 1000, 'seconds').string;
};

export const isUploadingFile = (upload: UploadProgress): boolean =>
  upload.uploadState === UploadStatus.INIT_STATE ||
  upload.uploadState === UploadStatus.UPLOAD_START;

export const isFailedFile = (upload: UploadProgress): boolean =>
  upload.uploadState === UploadStatus.UPLOAD_FAILED;

export const isCancelledFile = (upload: UploadProgress): boolean =>
  upload.uploadState === UploadStatus.UPLOAD_CANCELLED;

export const isCompletedFile = (upload: UploadProgress): boolean =>
  upload.uploadState === UploadStatus.UPLOAD_COMPLETE;

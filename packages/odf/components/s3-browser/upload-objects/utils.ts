import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizeMinutes,
  humanizeSeconds,
} from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { UploadProgress, UploadStatus } from './types';

export const getCompletedAndTotalUploadCount = (objects: UploadProgress) => {
  const totalObjects = Object.keys(objects).length;
  const totalUploaded = Object.values(objects).filter(
    (obj) => obj.uploadState === UploadStatus.UPLOAD_COMPLETE
  ).length;
  return [totalUploaded, totalObjects];
};

export const getCompletedTotalFailedCount = (
  uploadProgress: UploadProgress
) => {
  const progressItems = Object.values(uploadProgress);
  const [completedUploads, failedUploads] = progressItems.reduce(
    (acc, curr) => {
      const isCompleted = curr.uploadState === UploadStatus.UPLOAD_COMPLETE;
      if (isCompleted) {
        acc = [acc[0] + 1, acc[1]];
        return acc;
      }
      const isFailed = curr.uploadState === UploadStatus.UPLOAD_FAILED;
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

export const getFailedFiles = (objects: UploadProgress) =>
  Object.values(objects).filter(
    (obj) => obj.uploadState === UploadStatus.UPLOAD_FAILED
  ).length;

export const getUploadSpeed = (objects: UploadProgress): string => {
  if (_.isEmpty(objects)) return '';
  const files = Object.values(objects);
  const uploadingFiles = files.filter(
    (item) =>
      item.uploadState === UploadStatus.UPLOAD_START ||
      item.uploadState === UploadStatus.INIT_STATE
  );
  const totalTimes = uploadingFiles.map((file) => Date.now() - file?.startTime);
  const totalUploaded = uploadingFiles.map((file) => file.loaded ?? 0);
  const uploadSpeeds = totalUploaded.map((size, i) => size / totalTimes[i]);
  const speed = _.sum(uploadSpeeds) / uploadSpeeds.length;
  return humanizeDecimalBytesPerSec(speed * 1000).string;
};

export const getTotalRemainingFilesAndSize = (
  objects: UploadProgress
): string => {
  if (_.isEmpty(objects)) return '';
  const files = Object.values(objects);
  const uploadingFiles = files.filter(
    (item) =>
      item.uploadState === UploadStatus.UPLOAD_START ||
      item.uploadState === UploadStatus.INIT_STATE
  );
  const filesCount = uploadingFiles.length;
  const filesSize = uploadingFiles.reduce(
    (acc, curr) => (acc += curr.total - curr.loaded),
    0
  );
  return `${filesCount} files (${humanizeBinaryBytes(filesSize).string})`;
};

export const getTotalTimeRemaining = (objects: UploadProgress): string => {
  const files = Object.values(objects);
  const uploadingFiles = files.filter(
    (item) =>
      item.uploadState === UploadStatus.UPLOAD_START ||
      item.uploadState === UploadStatus.INIT_STATE
  );
  const totalTimes = uploadingFiles.map((file) => Date.now() - file?.startTime);
  const totalUploaded = uploadingFiles.map((file) => file.loaded ?? 0);
  const uploadSpeeds = totalUploaded.map((size, i) => size / totalTimes[i]);
  const speed = _.sum(uploadSpeeds) / uploadSpeeds.length;
  const totalRemainingBytes = uploadingFiles.reduce(
    (acc, curr) => (acc += curr.total - curr.loaded),
    0
  );
  const timeRemaining = totalRemainingBytes / speed;
  if (timeRemaining < 1000) {
    return humanizeSeconds(timeRemaining, 'ms').string;
  }
  return humanizeMinutes(timeRemaining / 1000).string;
};

export const getTotalTimeElapsed = (
  objects: UploadProgress,
  completionTime: number
): string => {
  const earliestTime = Object.values(objects).reduce((acc, curr) => {
    if (curr.startTime < acc) {
      return curr.startTime;
    } else return acc;
  }, Number.MAX_SAFE_INTEGER);
  const fromNow = completionTime - earliestTime;
  const minutes = humanizeMinutes(fromNow / 1000);
  if (minutes.value > 1) {
    return minutes.string;
  } else return humanizeSeconds(fromNow / 1000, 'seconds').string;
};

import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizeMinutes,
  humanizeSeconds,
} from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { UploadProgress, UploadStatus } from './types';

export const getCompletedAndTotalUploadObjects = (objects: UploadProgress) => {
  const totalObjects = Object.keys(objects).length;
  const totalUploaded = Object.keys(objects).reduce((acc, curr) => {
    if (objects[curr].total === objects[curr].loaded) {
      acc += 1;
      return acc;
    }
    return acc;
  }, 0);
  return [totalUploaded, totalObjects];
};

export const getUploadSpeed = (objects: UploadProgress): string => {
  if (_.isEmpty(objects)) return '';
  const files = Object.values(objects);
  const uploadingFile = files.filter(
    (item) => item.uploadState === UploadStatus.UPLOAD_START
  )?.[0];
  const totalTime = Date.now() - (uploadingFile?.startTime || Date.now());
  const totalUploaded = uploadingFile?.loaded ?? 0;
  const speed = humanizeDecimalBytesPerSec(totalUploaded / (totalTime / 1000));
  return speed.string;
};

export const getTotalRemainingFilesAndSize = (
  objects: UploadProgress
): string => {
  if (_.isEmpty(objects)) return '';
  const files = Object.values(objects);
  const uploadingFiles = files.filter(
    (item) => item.uploadState === UploadStatus.UPLOAD_START
  );
  const filesCount = uploadingFiles.length;
  const filesSize = uploadingFiles.reduce(
    (acc, curr) => (acc += curr.total - curr.loaded),
    0
  );
  return `${filesCount} files (${humanizeBinaryBytes(filesSize).string})`;
};

export const getTotalTimeReamining = (objects: UploadProgress): string => {
  if (_.isEmpty(objects)) return '';
  let files = Object.values(objects);
  const uploadingFile = files.filter(
    (item) => item.uploadState === UploadStatus.UPLOAD_START
  )?.[0];
  const totalTime = Date.now() - (uploadingFile?.startTime || Date.now());
  const totalUploaded = uploadingFile?.loaded ?? 0;

  if (_.isEmpty(objects)) return '';
  files = Object.values(objects);
  const uploadingFiles = files.filter(
    (item) => item.uploadState === UploadStatus.UPLOAD_START
  );
  const filesSize = uploadingFiles.reduce(
    (acc, curr) => (acc += curr.total - curr.loaded),
    0
  );
  return humanizeMinutes(filesSize / (totalUploaded / (totalTime / 1000)))
    .string;
};

export const getTotalTimeElasped = (objects: UploadProgress): string => {
  const earliestTime = Object.values(objects).reduce((acc, curr) => {
    if (curr.startTime < acc) {
      return curr.startTime;
    } else return acc;
  }, Number.MAX_SAFE_INTEGER);
  const fromNow = Date.now() - earliestTime;
  const minutes = humanizeMinutes(fromNow / 1000);
  if (minutes.value > 1) {
    return minutes.string;
  } else return humanizeSeconds(fromNow / 1000, 'seconds').string;
};

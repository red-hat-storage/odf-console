import { getPrefix } from '@odf/core/utils';
import { S3Commands } from '@odf/shared/s3';
import * as _ from 'lodash-es';
import { UploadStore } from '../store';
import { UploadProgress, UploadStatus } from '../types';

const performUploadPromise = (
  file: File,
  folderPath: string,
  bucketName: string,
  uploadStore: UploadStore,
  client: S3Commands
) => {
  const key = getPrefix(file.webkitRelativePath || file.name, folderPath);
  const uploader = client.getUploader(file as File, key, bucketName);
  uploadStore.setAborter(key, () => uploader.abort());
  uploader.on('httpUploadProgress', (progress) => {
    uploadStore.updateProgress(progress.Key, progress.loaded, progress.total);
  });
  return uploader.done().then(() => {
    uploadStore.uploadCompleted = key;
  });
};

export const uploadFile = async (
  files: File[],
  client: S3Commands,
  bucketName: string,
  folderPath: string,
  uploadStore: UploadStore
) => {
  const allUploadPromise = files
    .filter((file) => {
      const key = getPrefix(file.webkitRelativePath || file.name, folderPath);
      const item = uploadStore.getFile(key);
      return item.uploadState !== UploadStatus.UPLOAD_CANCELLED;
    })
    .map((file) =>
      performUploadPromise(file, folderPath, bucketName, uploadStore, client)
    );
  const settledPromises = await Promise.allSettled(allUploadPromise);
  settledPromises.forEach((promise, i) => {
    const hasFailed = promise.status === 'rejected';
    const key = getPrefix(
      files[i].webkitRelativePath || files[i].name,
      folderPath
    );
    const item = uploadStore.getFile(key);
    const status = item.uploadState;
    if (hasFailed && status !== UploadStatus.UPLOAD_COMPLETE) {
      uploadStore.uploadFailed = key;
    }
  });
  return Date.now();
};

export const convertFileToUploadProgress = (
  file: File,
  key: string
): UploadProgress => ({
  loaded: 0,
  uploadState: UploadStatus.INIT_STATE,
  abort: null,
  name: file.name,
  startTime: undefined,
  type: '',
  key,
  total: file.size,
});

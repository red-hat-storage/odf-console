import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizeMinutes,
  humanizeSeconds,
} from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { makeAutoObservable, toJS } from 'mobx';
import { ObjectID, UploadProgress, UploadStatus } from './types';
import {
  isCancelledFile,
  isCompletedFile,
  isFailedFile,
  isUploadingFile,
} from './utils';

export class UploadStore {
  uploads: Record<string, UploadProgress> = {};

  constructor() {
    makeAutoObservable(this);
  }

  setAborter(key: string, aborter: UploadProgress['abort']) {
    this.uploads[key]['abort'] = aborter;
  }

  // Add a file to the map
  addFile(obejct: UploadProgress, key: string) {
    this.uploads[key] = {
      ...obejct,
      uploadState: UploadStatus.INIT_STATE,
    };
  }

  private getSpeed(): ReturnType<typeof humanizeDecimalBytesPerSec> {
    const totalDataTranserred = Object.values(this.uploads).reduce(
      (acc, curr) => {
        return (acc += curr.loaded);
      },
      0
    );
    const getTotalTimeElapsed = Object.values(this.uploads).reduce(
      (acc, curr) => {
        if (curr.startTime < acc && curr.startTime !== undefined) {
          acc = curr.startTime;
        }
        return acc;
      },
      Number.MAX_SAFE_INTEGER
    );

    const speed =
      (totalDataTranserred * 1000) / (Date.now() - getTotalTimeElapsed);
    return humanizeDecimalBytesPerSec(speed);
  }

  get getUploadSpeed(): string {
    return this.getSpeed().string;
  }

  get getUploadingFilesCount(): number {
    return Object.values(this.uploads).filter(isUploadingFile).length;
  }

  get getFailedAndCancelledFilesCount(): number {
    return Object.values(this.uploads).filter(
      (obj) => isCancelledFile(obj) || isFailedFile(obj)
    ).length;
  }

  get getCompletedFilesCount(): number {
    return Object.values(this.uploads).filter(isCompletedFile).length;
  }

  get getTotalFilesCount(): number {
    return Object.values(this.uploads).length;
  }

  get getTotalRemainingFilesAndSize(): string {
    if (_.isEmpty(this.uploads)) return '';
    const files = Object.values(this.uploads);
    const uploadingFiles = files.filter(isUploadingFile);
    const filesCount = uploadingFiles.length;
    const remainingDataSize = uploadingFiles.reduce(
      (acc, curr) => (acc += curr.total - curr.loaded),
      0
    );
    return `${filesCount} files (${
      humanizeBinaryBytes(remainingDataSize).string
    })`;
  }

  get getTotalTimeRemaning(): string {
    const files = Object.values(this.uploads);
    const uploadingFiles = files.filter(isUploadingFile);
    const speed = this.getSpeed().value;
    const totalRemainingBytes = uploadingFiles.reduce(
      (acc, curr) => (acc += curr.total - curr.loaded),
      0
    );
    const timeRemaining = (totalRemainingBytes * 1000) / speed;
    if (timeRemaining < 1000) {
      return humanizeSeconds(timeRemaining, 'ms').string;
    }
    return humanizeMinutes(timeRemaining / 1000).string;
  }

  updateProgress(objectId: ObjectID, loaded: number, total: number) {
    if (objectId in this.uploads) {
      const existingData = this.uploads[objectId];
      const update = {
        loaded,
        total,
        startTime:
          existingData.startTime === undefined
            ? Date.now()
            : existingData.startTime,
      };
      if (loaded === existingData.total) {
        Object.assign(update, { uploadState: UploadStatus.UPLOAD_COMPLETE });
      } else if (existingData.uploadState === UploadStatus.INIT_STATE) {
        Object.assign(update, { uploadState: UploadStatus.UPLOAD_START });
      }
      this.uploads[objectId] = { ...existingData, ...update };
    }
  }

  set uploadCompleted(objectId: ObjectID) {
    const existingData = this.uploads[objectId];
    this.uploads[objectId] = {
      ...existingData,
      uploadState: UploadStatus.UPLOAD_COMPLETE,
    };
  }

  getFile(objectId: ObjectID) {
    return this.uploads[objectId];
  }

  set uploadFailed(objectId: ObjectID) {
    if (this.uploads[objectId]) {
      const existingData = this.uploads[objectId];
      const update = { uploadState: UploadStatus.UPLOAD_FAILED };
      this.uploads[objectId] = { ...existingData, ...update };
    }
  }

  performAbort(objectId: ObjectID) {
    if (objectId in this.uploads) {
      const existingData = this.uploads[objectId];
      if (existingData?.abort) {
        existingData.abort();
      }
      if (existingData.uploadState !== UploadStatus.UPLOAD_COMPLETE) {
        const update = { uploadState: UploadStatus.UPLOAD_CANCELLED };
        this.uploads[objectId] = { ...existingData, ...update };
      }
    }
  }

  clearAll() {
    this.uploads = {};
  }

  abortAll() {
    Object.values(this.uploads).forEach(({ key }) => this.performAbort(key));
  }

  get getAll() {
    return toJS(this.uploads);
  }
}

export const uploadStore = new UploadStore();

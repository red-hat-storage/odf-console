export enum UploadStatus {
  INIT_STATE,
  UPLOAD_COMPLETE,
  UPLOAD_START,
  UPLOAD_FAILED,
  UPLOAD_CANCELLED,
}

export type ObjectID = string; // A unique key made by joining path+"/"+fileName

export interface UploadProgress extends Partial<File> {
  total?: number;
  loaded?: number;
  name: string;
  abort?: () => void;
  uploadState: UploadStatus;
  startTime?: number;
  key: ObjectID;
}

export type UploadProgressBatch = Record<string, UploadProgress>;

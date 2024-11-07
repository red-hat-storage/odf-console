export enum UploadStatus {
  INIT_STATE,
  UPLOAD_COMPLETE,
  UPLOAD_START,
  UPLOAD_FAILED,
}

export type UploadProgress = {
  [name: string]: {
    total: number;
    loaded: number;
    name: string;
    abort?: () => void;
    uploadState?: UploadStatus;
    filePath?: string;
    startTime: number;
  };
};

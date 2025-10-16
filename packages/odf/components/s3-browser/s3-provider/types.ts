export enum S3ProviderType {
  NooBaa = 'noobaa',
  RGW = 'rgw',
}

export enum StorageType {
  Session = 'session',
  Local = 'local',
}

export type SecretRef = {
  name: string;
  namespace: string;
};

export type StoredCredentials = Partial<Record<S3ProviderType, SecretRef>>;

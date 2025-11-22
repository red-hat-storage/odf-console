import { S3ProviderType } from '@odf/core/types';

export enum StorageType {
  Session = 'session',
  Local = 'local',
}

export type SecretRef = {
  name: string;
  namespace: string;
};

export type SetSecretRefWithStorage = (
  value: SecretRef,
  targetStorageType: StorageType
) => void;

export type StoredCredentials = Partial<Record<S3ProviderType, SecretRef>>;

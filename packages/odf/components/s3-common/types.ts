import { S3ProviderType } from '@odf/core/types';

export enum StorageType {
  Session = 'session',
  Local = 'local',
}

export enum ClientType {
  S3 = 's3',
  IAM = 'iam',
  S3_VECTORS = 's3-vectors',
}

export type SecretRef = {
  name: string;
  namespace: string;
};

export type StoredCredentialData = SecretRef & {
  hasOBCOwnerRef?: boolean;
};

export type SetSecretRefWithStorage = (
  value: SecretRef,
  targetStorageType: StorageType,
  hasOBCOwnerRef?: boolean
) => void;

export type StoredCredentials = Partial<
  Record<S3ProviderType, StoredCredentialData>
>;

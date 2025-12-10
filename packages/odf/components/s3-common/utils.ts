import { NooBaaObjectBucketClaimModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';

export const hasOBCOwnerRef = (secret: SecretKind | null): boolean => {
  if (!secret?.metadata?.ownerReferences) {
    return false;
  }

  const obcApiVersion = `${NooBaaObjectBucketClaimModel.apiGroup}/${NooBaaObjectBucketClaimModel.apiVersion}`;

  return secret.metadata.ownerReferences.some(
    (ref) =>
      ref.kind === NooBaaObjectBucketClaimModel.kind &&
      ref.apiVersion === obcApiVersion
  );
};

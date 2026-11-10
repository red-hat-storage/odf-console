import { S3ConfigurationModel, SecretKind, SecretModel } from '@odf/shared';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { k8sCreate, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { Base64 } from 'js-base64';
import * as _ from 'lodash-es';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  NOOBAA_STORAGE_CLASS_SUFFIX,
  ODFMCO_OPERATOR_NAMESPACE,
  S3ConfigurationPhase,
  S3_BUCKET_NAME,
  S3_COMPATIBLE_ENDPOINT,
  S3_REGION,
} from '../constants';
import { S3ConfigurationKind, type S3Details } from '../types';

/** Also becomes the Ramen s3ProfileName, its secret name and DRCluster.spec.s3ProfileName. */
export const getS3ConfigurationName = (clusterNames: string[]): string =>
  `s3-${[...clusterNames].sort().join('-')}`;

/** Not the CR name: MCO writes its own two-key Ramen secret under that name and would clobber this one. */
export const getExternalS3SecretName = (s3ConfigurationName: string): string =>
  `${s3ConfigurationName}-credentials`;

export const findS3Configuration = (
  s3Configurations: S3ConfigurationKind[],
  clusterNames: string[]
): S3ConfigurationKind | undefined =>
  s3Configurations?.find((config) =>
    _.isEqual(
      [...(config.spec?.managedClusters ?? [])].sort(),
      [...clusterNames].sort()
    )
  );

/** MCO allows a cluster in only one S3Configuration, but reports conflicts only as phase: Failed. */
export const findS3ConfigurationForCluster = (
  s3Configurations: S3ConfigurationKind[],
  clusterName: string
): S3ConfigurationKind | undefined =>
  s3Configurations?.find((config) =>
    config.spec?.managedClusters?.includes(clusterName)
  );

export const isS3ConfigurationReady = (config: S3ConfigurationKind): boolean =>
  config?.status?.phase === S3ConfigurationPhase.Ready;

export const isS3ConfigurationFailed = (config: S3ConfigurationKind): boolean =>
  config?.status?.phase === S3ConfigurationPhase.Failed;

/** MCO validates all five keys before it will configure anything. */
export const createExternalS3Secret = (
  name: string,
  details: S3Details,
  namespace: string = ODFMCO_OPERATOR_NAMESPACE
): Promise<SecretKind> =>
  k8sCreate<SecretKind>({
    model: SecretModel,
    data: {
      apiVersion: getAPIVersionForModel(SecretModel),
      kind: SecretModel.kind,
      metadata: { name, namespace },
      type: 'Opaque',
      data: {
        [AWS_ACCESS_KEY_ID]: Base64.encode(details.accessKeyId),
        [AWS_SECRET_ACCESS_KEY]: Base64.encode(details.secretKey),
        [S3_BUCKET_NAME]: Base64.encode(details.bucketName),
        [S3_COMPATIBLE_ENDPOINT]: Base64.encode(details.endpoint),
        [S3_REGION]: Base64.encode(details.region),
      },
    },
  });

/** Spec is immutable (CEL), so there is deliberately no update path. */
const createS3Configuration = (
  name: string,
  managedClusters: string[],
  spec: Pick<S3ConfigurationKind['spec'], 'internalS3' | 'externalS3'>
): Promise<S3ConfigurationKind> =>
  k8sCreate<S3ConfigurationKind>({
    model: S3ConfigurationModel,
    data: {
      apiVersion: getAPIVersionForModel(S3ConfigurationModel),
      kind: S3ConfigurationModel.kind,
      metadata: { name },
      spec: { ...spec, managedClusters },
    },
  });

/** OBC is provisioned on providerCluster only; obcName is left to MCO's default. */
export const createInternalS3Configuration = (
  name: string,
  managedClusters: string[],
  providerCluster: string,
  storageClusterNamespace: string
): Promise<S3ConfigurationKind> =>
  createS3Configuration(name, managedClusters, {
    internalS3: {
      providerCluster,
      storageClassName: `${storageClusterNamespace}${NOOBAA_STORAGE_CLASS_SUFFIX}`,
      namespace: storageClusterNamespace,
    },
  });

export const createExternalS3Configuration = (
  name: string,
  managedClusters: string[],
  secretName: string,
  secretNamespace: string = ODFMCO_OPERATOR_NAMESPACE
): Promise<S3ConfigurationKind> =>
  createS3Configuration(name, managedClusters, {
    externalS3: { secretRef: { name: secretName, namespace: secretNamespace } },
  });

export const deleteS3ConfigurationByName = (name: string): Promise<unknown> =>
  k8sDelete({ model: S3ConfigurationModel, resource: { metadata: { name } } });

export const deleteSecretByName = (
  name: string,
  namespace: string = ODFMCO_OPERATOR_NAMESPACE
): Promise<unknown> =>
  k8sDelete({
    model: SecretModel,
    resource: { metadata: { name, namespace } },
  });

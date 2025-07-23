import {
  ConfigMapModel,
  DRClusterModel,
  SecretKind,
  SecretModel,
} from '@odf/shared';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { createOrUpdate } from '@odf/shared/utils/k8s';
import {
  k8sGet,
  K8sModel,
  K8sResourceKind,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
import yaml from 'js-yaml';
import { S3Details } from '../components/create-dr-policy/add-s3-bucket-details/s3-bucket-details-form';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  ODFMCO_OPERATOR_NAMESPACE,
  RAMEN_CONFIG_KEY,
  RAMEN_HUB_OPERATOR_CONFIG_NAME,
} from '../constants';
import { DRClusterKind, RamenConfig, S3StoreProfile } from '../types';

export function fnv1a32(str: string): string {
  /* eslint-disable no-bitwise */
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  /* eslint-enable no-bitwise */
  return h.toString(16).padStart(8, '0');
}

export function createDeterministicSecretNameFromS3(
  s3: Pick<
    S3Details,
    'clusterName' | 'bucketName' | 'endpoint' | 'region' | 's3ProfileName'
  >,
  prefix = 's3'
): string {
  const key = [
    s3.clusterName,
    s3.bucketName,
    s3.endpoint,
    s3.region,
    s3.s3ProfileName,
  ].join('|');
  const hash = fnv1a32(key);
  return `${prefix}-${hash}`.slice(0, 39);
}

const areS3ProfileFieldsEqual = (
  a: S3StoreProfile,
  b: S3StoreProfile
): boolean => {
  return (
    a.S3Bucket === b.S3Bucket &&
    a.S3Region === b.S3Region &&
    a.S3CompatibleEndpoint === b.S3CompatibleEndpoint &&
    a.S3SecretRef.Name === b.S3SecretRef.Name &&
    (a.S3SecretRef.Namespace || '') === (b.S3SecretRef.Namespace || '')
  );
};

const updateS3ProfileFields = (src: S3StoreProfile, dest: S3StoreProfile) => {
  dest.S3Bucket = src.S3Bucket;
  dest.S3Region = src.S3Region;
  dest.S3CompatibleEndpoint = src.S3CompatibleEndpoint;
  dest.S3SecretRef.Name = src.S3SecretRef.Name;
  dest.S3SecretRef.Namespace = src.S3SecretRef.Namespace;
};

type UpdateRamenHubConfigArgs = {
  namespace?: string;
  profile: S3StoreProfile;
};

export async function updateRamenHubOperatorConfig({
  namespace = ODFMCO_OPERATOR_NAMESPACE,
  profile,
}: UpdateRamenHubConfigArgs): Promise<K8sResourceKind> {
  const cm = (await k8sGet({
    model: ConfigMapModel as K8sModel,
    name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
    ns: namespace,
  })) as K8sResourceKind & { data?: Record<string, string> };

  const raw = cm.data?.[RAMEN_CONFIG_KEY];
  if (!raw) {
    throw new Error(
      `Missing key "${RAMEN_CONFIG_KEY}" in ConfigMap ${RAMEN_HUB_OPERATOR_CONFIG_NAME}/${namespace}`
    );
  }

  const ramenConfig = (yaml.load(raw) || {}) as RamenConfig;
  ramenConfig.S3StoreProfiles = ramenConfig.S3StoreProfiles || [];

  const idx = ramenConfig.S3StoreProfiles.findIndex(
    (p) => p.S3ProfileName === profile.S3ProfileName
  );
  if (idx === -1) {
    ramenConfig.S3StoreProfiles.push(profile);
  } else if (
    !areS3ProfileFieldsEqual(profile, ramenConfig.S3StoreProfiles[idx])
  ) {
    updateS3ProfileFields(profile, ramenConfig.S3StoreProfiles[idx]);
  } else {
    return cm;
  }

  const updatedYaml = yaml.dump(ramenConfig);
  const updated = {
    ...cm,
    data: {
      ...(cm.data || {}),
      [RAMEN_CONFIG_KEY]: updatedYaml,
    },
  };

  return k8sUpdate({ model: ConfigMapModel as K8sModel, data: updated });
}

export function createOrUpdateDRCluster(params: {
  name: string;
  s3ProfileName: string;
}): Promise<DRClusterKind> {
  const { name, s3ProfileName } = params;

  return createOrUpdate<DRClusterKind>({
    model: DRClusterModel,
    name,
    mutate: (current) => {
      const drCluster: DRClusterKind = current ?? {
        apiVersion: getAPIVersionForModel(DRClusterModel),
        kind: DRClusterModel.kind,
        metadata: { name },
        spec: { S3ProfileName: s3ProfileName },
      };

      return {
        ...drCluster,
        spec: {
          ...drCluster.spec,
          S3ProfileName: s3ProfileName,
        },
      };
    },
  });
}

type CreateRamenS3SecretArgs = {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  namespace?: string;
};

export const createOrUpdateRamenS3Secret = ({
  name,
  accessKeyId,
  secretAccessKey,
  namespace = ODFMCO_OPERATOR_NAMESPACE,
}: CreateRamenS3SecretArgs) =>
  createOrUpdate<SecretKind>({
    model: SecretModel,
    name,
    namespace,
    mutate: (current) => {
      const base: SecretKind = current ?? {
        apiVersion: getAPIVersionForModel(SecretModel),
        kind: SecretModel.kind,
        metadata: { name, namespace },
        type: 'Opaque',
      };

      return {
        ...base,
        type: 'Opaque',
        data: {
          [AWS_ACCESS_KEY_ID]: accessKeyId,
          [AWS_SECRET_ACCESS_KEY]: secretAccessKey,
        },
      };
    },
  });

import {
  ConfigMapModel,
  DRClusterModel,
  SecretKind,
  SecretModel,
} from '@odf/shared';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { createOrUpdate } from '@odf/shared/utils/k8s';
import {
  k8sDelete,
  k8sGet,
  K8sModel,
  K8sResourceCommon,
  K8sResourceKind,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
import { t } from 'i18next';
import { Base64 } from 'js-base64';
import yaml from 'js-yaml';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
import { S3Details } from '../components/create-dr-policy/add-s3-bucket-details/s3-bucket-details-form';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  ODFMCO_OPERATOR_NAMESPACE,
  RAMEN_CONFIG_KEY,
  RAMEN_HUB_OPERATOR_CONFIG_NAME,
} from '../constants';
import { DRClusterKind, RamenConfig, S3StoreProfile } from '../types';

export function murmur32Hex(str: string, seed = 0): string {
  const h = murmur3(str, seed);
  return h.toString(16).padStart(8, '0');
}

export async function fetchRamenS3Profiles(
  namespace: string = ODFMCO_OPERATOR_NAMESPACE
): Promise<S3StoreProfile[]> {
  let cm: K8sResourceCommon & { data?: Record<string, string> };

  try {
    cm = (await k8sGet({
      model: ConfigMapModel as K8sModel,
      name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
      ns: namespace,
    })) as K8sResourceCommon & { data?: Record<string, string> };
  } catch (err: any) {
    throw new Error(
      `Failed to fetch ConfigMap ${RAMEN_HUB_OPERATOR_CONFIG_NAME} in namespace ${namespace}: ${
        err?.message || JSON.stringify(err)
      }`
    );
  }

  const raw = cm.data?.[RAMEN_CONFIG_KEY];
  if (!raw) {
    throw new Error(
      `Missing key ${RAMEN_CONFIG_KEY} in ConfigMap ${RAMEN_HUB_OPERATOR_CONFIG_NAME}/${namespace}`
    );
  }

  let ramenConfig: RamenConfig;
  try {
    ramenConfig = (yaml.load(raw) || {}) as RamenConfig;
  } catch (err: any) {
    throw new Error(
      `Failed to parse YAML from ConfigMap ${RAMEN_HUB_OPERATOR_CONFIG_NAME}: ${
        err?.message || JSON.stringify(err)
      }`
    );
  }

  return ramenConfig.s3StoreProfiles || [];
}

export function createSecretNameFromS3(
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
  const hash = murmur32Hex(key);
  return `${prefix}-${hash}`.slice(0, 39);
}

const areS3ProfileFieldsEqual = (
  a: S3StoreProfile,
  b: S3StoreProfile
): boolean => _.isEqual(a, b);

const updateS3ProfileFields = (src: S3StoreProfile, dest: S3StoreProfile) => {
  const copy = _.cloneDeep(src);
  Object.assign(dest, copy);
};

type UpdateRamenHubConfigArgs = {
  namespace?: string;
  profile: S3StoreProfile;
};

export async function updateRamenHubOperatorConfig({
  namespace = ODFMCO_OPERATOR_NAMESPACE,
  profile,
}: UpdateRamenHubConfigArgs): Promise<K8sResourceCommon> {
  let cm;
  try {
    cm = (await k8sGet({
      model: ConfigMapModel as K8sModel,
      name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
      ns: namespace,
    })) as K8sResourceCommon & { data?: Record<string, string> };
  } catch (err: any) {
    throw new Error(
      t(
        'Failed to fetch ConfigMap {{name}} in namespace {{namespace}}: {{error}}',
        {
          name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
          namespace,
          error: err?.message || err,
        }
      )
    );
  }

  const raw = cm.data?.[RAMEN_CONFIG_KEY];
  if (!raw) {
    throw new Error(
      t('Missing key {{key}} in ConfigMap {{name}}/{{namespace}}', {
        key: RAMEN_CONFIG_KEY,
        name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
        namespace,
      })
    );
  }

  let ramenConfig: RamenConfig;
  try {
    ramenConfig = (yaml.load(raw) || {}) as RamenConfig;
  } catch (err: any) {
    throw new Error(
      t('Failed to parse YAML from ConfigMap {{name}}: {{error}}', {
        name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
        error: err?.message || err,
      })
    );
  }
  ramenConfig.s3StoreProfiles = ramenConfig.s3StoreProfiles || [];

  const idx = ramenConfig.s3StoreProfiles.findIndex(
    (p) => p.s3ProfileName === profile.s3ProfileName
  );
  if (idx === -1) {
    ramenConfig.s3StoreProfiles.push(profile);
  } else if (
    !areS3ProfileFieldsEqual(profile, ramenConfig.s3StoreProfiles[idx])
  ) {
    updateS3ProfileFields(profile, ramenConfig.s3StoreProfiles[idx]);
  } else {
    return cm;
  }

  const updatedYaml = yaml.dump(ramenConfig);
  const updatedCm = {
    ...cm,
    metadata: {
      ...cm.metadata,
      resourceVersion: cm.metadata.resourceVersion,
    },
    data: {
      ...(cm.data || {}),
      [RAMEN_CONFIG_KEY]: updatedYaml,
    },
  };

  try {
    return (await k8sUpdate({
      model: ConfigMapModel as K8sModel,
      data: updatedCm,
    })) as K8sResourceCommon;
  } catch (err: any) {
    throw new Error(
      t(
        'Failed to update ConfigMap {{name}} in namespace {{namespace}}: {{error}}',
        {
          name: RAMEN_HUB_OPERATOR_CONFIG_NAME,
          namespace,
          error: err?.message || err,
        }
      )
    );
  }
}

export function deleteDRCluster(name: string): Promise<K8sResourceKind> {
  const drCluster: DRClusterKind = {
    apiVersion: getAPIVersionForModel(DRClusterModel),
    kind: DRClusterModel.kind,
    metadata: { name },
    spec: { s3ProfileName: '' },
  };
  return k8sDelete({
    model: DRClusterModel,
    resource: drCluster,
  }) as Promise<K8sResourceKind>;
}

export function createDRCluster(params: {
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
        spec: { s3ProfileName: s3ProfileName },
      };

      return {
        ...drCluster,
        spec: {
          ...drCluster.spec,
          s3ProfileName: s3ProfileName,
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
          [AWS_ACCESS_KEY_ID]: Base64.encode(accessKeyId),
          [AWS_SECRET_ACCESS_KEY]: Base64.encode(secretAccessKey),
        },
      };
    },
  });

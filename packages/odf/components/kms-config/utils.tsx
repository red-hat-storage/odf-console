import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { ConfigMapModel, SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind, ConfigMapKind, SecretKind } from '@odf/shared/types';
import { getRandomChars } from '@odf/shared/utils';
import { k8sCreate, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import {
  KMSConfigMapName,
  KMSVaultTokenSecretName,
  KMSConfigMapCSIName,
  KMSVaultCSISecretName,
} from '../../constants';
import {
  KMSConfigMap,
  KMSConfiguration,
  VaultConfigMap,
  HpcsConfigMap,
  ThalesConfigMap,
  ProviderNames,
  KmsImplementations,
  VaultConfig,
  HpcsConfig,
  ThalesConfig,
  VaultAuthMethods,
  KmsCsiConfigKeysMapping,
  VaultAuthMethodMapping,
  KmsEncryptionLevel,
} from '../../types';

export const parseURL = (url: string) => {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
};

export const isLengthUnity = (items) => items.length === 1;

export const generateCASecret = (caCertificate: string) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `ocs-kms-ca-secret-${getRandomChars()}`,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  stringData: {
    cert: caCertificate,
  },
});

export const generateClientSecret = (clientCertificate: string) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `ocs-kms-client-cert-${getRandomChars()}`,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  stringData: {
    cert: clientCertificate,
  },
});

export const generateClientKeySecret = (clientKey: string) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `ocs-kms-client-key-${getRandomChars()}`,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  stringData: {
    key: clientKey,
  },
});

const getKmsEndpoint = (address: string, port: string) => {
  const parsedAddress = parseURL(address);
  return `${parsedAddress.protocol}//${parsedAddress.hostname}:${port}`;
};

const convertCsiKeysToCamelCase = (csiConfigData: KMSConfigMap) => {
  // ceph-csi uses only camelcase in configMap keys.
  const res = Object.keys(csiConfigData).reduce(
    (obj, key) =>
      Object.assign(obj, {
        [KmsCsiConfigKeysMapping[key]]: csiConfigData[key],
      }),
    {}
  );
  return res;
};

const generateCsiKmsConfigMap = (
  name: string,
  csiConfigData: KMSConfigMap,
  convertToCamelCase = true
) => {
  return {
    apiVersion: ConfigMapModel.apiVersion,
    kind: ConfigMapModel.kind,
    data: {
      [`${name}`]: JSON.stringify(
        convertToCamelCase
          ? convertCsiKeysToCamelCase(csiConfigData)
          : csiConfigData
      ),
    },
    metadata: {
      name: KMSConfigMapCSIName,
      namespace: CEPH_STORAGE_NAMESPACE,
    },
  };
};

const generateOcsKmsConfigMap = (configData: KMSConfigMap) => ({
  apiVersion: ConfigMapModel.apiVersion,
  kind: ConfigMapModel.kind,
  data: {
    ...configData,
  },
  metadata: {
    name: KMSConfigMapName,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
});

const generateConfigMapPatch = (
  name: string,
  csiConfigData: KMSConfigMap,
  convertToCamelCase = true
) => {
  return {
    op: 'replace',
    path: `/data/${name}`,
    value: JSON.stringify(
      convertToCamelCase
        ? convertCsiKeysToCamelCase(csiConfigData)
        : csiConfigData
    ),
  };
};

const generateThalesSecret = (kms: ThalesConfig) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `thales-kmip-kms-${getRandomChars()}`,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  stringData: {
    CA_CERT: kms.caCert.value,
    CLIENT_CERT: kms.clientCert.value,
    CLIENT_KEY: kms.clientKey.value,
    UNIQUE_IDENTIFIER: kms.uniqueId.value,
  },
});

const generateHpcsSecret = (kms: HpcsConfig) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `ibm-kp-kms-${getRandomChars()}`,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  stringData: {
    IBM_KP_SERVICE_API_KEY: kms.apiKey.value,
    IBM_KP_CUSTOMER_ROOT_KEY: kms.rootKey.value,
  },
});

const getKmsVaultSecret = (token: string, secretName: string): SecretKind => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: secretName,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  stringData: {
    token,
  },
});

const createAdvancedVaultResources = (kms: VaultConfig) => {
  const advancedKmsResources: Promise<K8sResourceKind>[] = [];
  if (kms.caCert)
    advancedKmsResources.push(
      k8sCreate({ model: SecretModel, data: kms.caCert })
    );
  if (kms.clientCert)
    advancedKmsResources.push(
      k8sCreate({ model: SecretModel, data: kms.clientCert })
    );
  if (kms.clientKey)
    advancedKmsResources.push(
      k8sCreate({ model: SecretModel, data: kms.clientKey })
    );

  return advancedKmsResources;
};

const getCsiVaultResources = (
  kms: VaultConfig,
  update: boolean,
  createAdvancedVaultResource: boolean = true
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];

  let csiConfigData: VaultConfigMap = {
    KMS_PROVIDER: KmsImplementations.VAULT_TOKENS,
    KMS_SERVICE_NAME: kms.name.value,
    VAULT_ADDR: getKmsEndpoint(kms.address.value, kms.port.value),
    VAULT_BACKEND_PATH: kms.backend,
    VAULT_CACERT: kms.caCert?.metadata.name,
    VAULT_TLS_SERVER_NAME: kms.tls,
    VAULT_CLIENT_CERT: kms.clientCert?.metadata.name,
    VAULT_CLIENT_KEY: kms.clientKey?.metadata.name,
    VAULT_CACERT_FILE: kms.caCertFile,
    VAULT_CLIENT_CERT_FILE: kms.clientCertFile,
    VAULT_CLIENT_KEY_FILE: kms.clientKeyFile,
    VAULT_AUTH_METHOD: kms.authMethod,
  };

  switch (kms.authMethod) {
    case VaultAuthMethods.TOKEN:
      csiConfigData = {
        ...csiConfigData,
        VAULT_TOKEN_NAME: KMSVaultCSISecretName,
        VAULT_NAMESPACE: kms.providerNamespace,
      };
      // token creation on ceph-csi deployment namespace from installation flow
      if (kms.authValue.value) {
        const tokenSecret: SecretKind = getKmsVaultSecret(
          kms.authValue.value,
          KMSVaultCSISecretName
        );
        csiKmsResources.push(
          k8sCreate({ model: SecretModel, data: tokenSecret })
        );
      }
      break;
    case VaultAuthMethods.KUBERNETES:
      // encryption using tenant serviceAccount
      csiConfigData.KMS_PROVIDER = KmsImplementations.VAULT_TENANT_SA;
      csiConfigData = {
        ...csiConfigData,
        VAULT_AUTH_PATH: kms.providerAuthPath,
        VAULT_AUTH_NAMESPACE: kms.providerAuthNamespace,
      };
      break;
    default:
  }

  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kms.name.value,
    csiConfigData
  );

  // skip if cluster-wide already taken care
  if (createAdvancedVaultResource) {
    csiKmsResources.push(...createAdvancedVaultResources(kms));
  }
  if (update) {
    const cmPatch = [generateConfigMapPatch(kms.name.value, csiConfigData)];
    csiKmsResources.push(
      k8sPatch({ model: ConfigMapModel, resource: csiConfigObj, data: cmPatch })
    );
  } else {
    csiKmsResources.push(
      k8sCreate({ model: ConfigMapModel, data: csiConfigObj })
    );
  }

  return csiKmsResources;
};

const getCsiHpcsResources = (
  kms: HpcsConfig,
  update: boolean,
  secretName = ''
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];

  let keySecret: SecretKind;
  if (!secretName) {
    // not required, while setting up storage cluster.
    // required, while creating new storage class.
    keySecret = generateHpcsSecret(kms);
    csiKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  }

  const csiConfigData: HpcsConfigMap = {
    KMS_PROVIDER: KmsImplementations.IBM_KEY_PROTECT,
    KMS_SERVICE_NAME: kms.name.value,
    IBM_KP_SERVICE_INSTANCE_ID: kms.instanceId.value,
    IBM_KP_SECRET_NAME: secretName || getName(keySecret),
    IBM_KP_BASE_URL: kms.baseUrl.value,
    IBM_KP_TOKEN_URL: kms.tokenUrl,
  };
  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kms.name.value,
    csiConfigData,
    false
  );
  if (update) {
    const cmPatch = [
      generateConfigMapPatch(kms.name.value, csiConfigData, false),
    ];
    csiKmsResources.push(
      k8sPatch({ model: ConfigMapModel, resource: csiConfigObj, data: cmPatch })
    );
  } else {
    csiKmsResources.push(
      k8sCreate({ model: ConfigMapModel, data: csiConfigObj })
    );
  }

  return csiKmsResources;
};

const getCsiThalesResources = (
  kms: ThalesConfig,
  update: boolean,
  secretName = ''
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];

  let keySecret: SecretKind;
  if (!secretName) {
    // not required, while setting up storage cluster.
    // required, while creating new storage class.
    keySecret = generateThalesSecret(kms);
    csiKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  }

  const csiConfigData: ThalesConfigMap = {
    KMS_PROVIDER: KmsImplementations.KMIP,
    KMS_SERVICE_NAME: kms.name.value,
    KMIP_ENDPOINT: getKmsEndpoint(kms.address.value, kms.port.value),
    KMIP_SECRET_NAME: secretName || getName(keySecret),
    TLS_SERVER_NAME: kms.tls,
  };
  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kms.name.value,
    csiConfigData,
    false
  );
  if (update) {
    const cmPatch = [
      generateConfigMapPatch(kms.name.value, csiConfigData, false),
    ];
    csiKmsResources.push(
      k8sPatch({ model: ConfigMapModel, resource: csiConfigObj, data: cmPatch })
    );
  } else {
    csiKmsResources.push(
      k8sCreate({ model: ConfigMapModel, data: csiConfigObj })
    );
  }

  return csiKmsResources;
};

const getClusterVaultResources = (kms: VaultConfig) => {
  const clusterKmsResources: Promise<K8sResourceKind>[] = [];

  let vaultConfigData: VaultConfigMap = {
    KMS_PROVIDER: KmsImplementations.VAULT,
    KMS_SERVICE_NAME: kms.name.value,
    VAULT_ADDR: getKmsEndpoint(kms.address.value, kms.port.value),
    VAULT_BACKEND_PATH: kms.backend,
    VAULT_CACERT: kms.caCert?.metadata.name,
    VAULT_TLS_SERVER_NAME: kms.tls,
    VAULT_CLIENT_CERT: kms.clientCert?.metadata.name,
    VAULT_CLIENT_KEY: kms.clientKey?.metadata.name,
    VAULT_AUTH_METHOD: kms.authMethod,
  };

  switch (kms.authMethod) {
    case VaultAuthMethods.TOKEN:
      vaultConfigData = {
        ...vaultConfigData,
        VAULT_NAMESPACE: kms.providerNamespace,
      };
      clusterKmsResources.push(
        k8sCreate({
          model: SecretModel,
          data: getKmsVaultSecret(kms.authValue.value, KMSVaultTokenSecretName),
        })
      );
      break;
    case VaultAuthMethods.KUBERNETES:
      vaultConfigData = {
        ...vaultConfigData,
        VAULT_AUTH_KUBERNETES_ROLE: kms.authValue.value,
        VAULT_AUTH_MOUNT_PATH: kms.providerAuthPath,
      };
      break;
    default:
  }
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(vaultConfigData);
  clusterKmsResources.push(...createAdvancedVaultResources(kms));
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return clusterKmsResources;
};

const getClusterHpcsResources = (
  kms: HpcsConfig
): [string, Promise<K8sResourceKind>[]] => {
  const clusterKmsResources: Promise<K8sResourceKind>[] = [];

  const keySecret: SecretKind = generateHpcsSecret(kms);
  const secretName: string = getName(keySecret);

  const configData: HpcsConfigMap = {
    KMS_PROVIDER: KmsImplementations.IBM_KEY_PROTECT,
    KMS_SERVICE_NAME: kms.name.value,
    IBM_KP_SERVICE_INSTANCE_ID: kms.instanceId.value,
    IBM_KP_SECRET_NAME: secretName,
    IBM_KP_BASE_URL: kms.baseUrl.value,
    IBM_KP_TOKEN_URL: kms.tokenUrl,
  };
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(configData);

  clusterKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return [secretName, clusterKmsResources];
};

const getClusterThalesResources = (
  kms: ThalesConfig
): [string, Promise<K8sResourceKind>[]] => {
  const clusterKmsResources: Promise<K8sResourceKind>[] = [];

  const keySecret: SecretKind = generateThalesSecret(kms);
  const secretName: string = getName(keySecret);

  const configData: ThalesConfigMap = {
    KMS_PROVIDER: KmsImplementations.KMIP,
    KMS_SERVICE_NAME: kms.name.value,
    KMIP_ENDPOINT: getKmsEndpoint(kms.address.value, kms.port.value),
    KMIP_SECRET_NAME: secretName,
    TLS_SERVER_NAME: kms.tls,
  };
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(configData);

  clusterKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return [secretName, clusterKmsResources];
};

export const getPort = (url: URL) => {
  if (url.port === '') {
    return url.protocol === 'http:' ? '80' : '443';
  }
  return url.port;
};

export const createCsiKmsResources = (
  kms: KMSConfiguration,
  update: boolean,
  provider = ProviderNames.VAULT
): Promise<K8sResourceKind>[] => {
  switch (provider) {
    case ProviderNames.VAULT: {
      return getCsiVaultResources(kms as VaultConfig, update);
    }
    case ProviderNames.HPCS: {
      return getCsiHpcsResources(kms as HpcsConfig, update);
    }
    case ProviderNames.THALES: {
      return getCsiThalesResources(kms as ThalesConfig, update);
    }
  }
};

export const createClusterKmsResources = (
  kms: KMSConfiguration,
  provider = ProviderNames.VAULT
): Promise<K8sResourceKind>[] => {
  switch (provider) {
    case ProviderNames.VAULT: {
      const vaultConfig = kms as VaultConfig;
      const clusterWideSupported: boolean = VaultAuthMethodMapping[
        vaultConfig.authMethod
      ].supportedEncryptionType.includes(KmsEncryptionLevel.CLUSTER_WIDE);
      const storageClassSupported: boolean = VaultAuthMethodMapping[
        vaultConfig.authMethod
      ].supportedEncryptionType.includes(KmsEncryptionLevel.STORAGE_CLASS);

      const clusterKmsResources = clusterWideSupported
        ? getClusterVaultResources(kms as VaultConfig)
        : [];
      const csiKmsResources = storageClassSupported
        ? getCsiVaultResources(kms as VaultConfig, false, !clusterWideSupported)
        : [];

      return [...clusterKmsResources, ...csiKmsResources];
    }
    case ProviderNames.HPCS: {
      const [secretName, clusterKmsResources] = getClusterHpcsResources(
        kms as HpcsConfig
      );
      const csiKmsResources = getCsiHpcsResources(
        kms as HpcsConfig,
        false,
        secretName
      );

      return [...clusterKmsResources, ...csiKmsResources];
    }
    case ProviderNames.THALES: {
      const [secretName, clusterKmsResources] = getClusterThalesResources(
        kms as ThalesConfig
      );
      const csiKmsResources = getCsiThalesResources(
        kms as ThalesConfig,
        false,
        secretName
      );

      return [...clusterKmsResources, ...csiKmsResources];
    }
  }
};

export const kmsConfigValidation = (
  kms: KMSConfiguration,
  provider = ProviderNames.VAULT
): boolean => {
  switch (provider) {
    case ProviderNames.VAULT: {
      const kmsObj = kms as VaultConfig;
      return (
        kmsObj.name.valid &&
        kmsObj.address.valid &&
        kmsObj.port.valid &&
        kmsObj.name.value !== '' &&
        kmsObj.address.value !== '' &&
        kmsObj.port.value !== ''
      );
    }
    case ProviderNames.HPCS: {
      const kmsObj = kms as HpcsConfig;
      return (
        kmsObj.name.valid &&
        kmsObj.instanceId.valid &&
        kmsObj.apiKey.valid &&
        kmsObj.rootKey.valid &&
        kmsObj.baseUrl.valid &&
        kmsObj.name.value !== '' &&
        kmsObj.instanceId.value !== '' &&
        kmsObj.apiKey.value !== '' &&
        kmsObj.rootKey.value !== '' &&
        kmsObj.baseUrl.value !== ''
      );
    }
    case ProviderNames.THALES: {
      const kmsObj = kms as ThalesConfig;
      return (
        kmsObj.name.valid &&
        kmsObj.address.valid &&
        kmsObj.port.valid &&
        !kmsObj.clientCert.error &&
        !kmsObj.caCert.error &&
        !kmsObj.clientKey.error &&
        kmsObj.name.value !== '' &&
        kmsObj.address.value !== '' &&
        kmsObj.port.value !== '' &&
        kmsObj.clientCert.value !== '' &&
        kmsObj.caCert.value !== '' &&
        kmsObj.clientKey.value !== ''
      );
    }
    default:
      return false;
  }
};

import { ConfigMapModel, SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind, ConfigMapKind, SecretKind } from '@odf/shared/types';
import { getRandomChars, isValidIP } from '@odf/shared/utils';
import { k8sCreate, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
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
  AzureConfig,
  AzureConfigMap,
} from '../../types';

// will accept protocol in URL as well
// do not accept IP address
export const parseURL = (url: string) => {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
};

// will treat protocol as an optional
// will accept IP address directly as well
export const isValidEndpoint = (url: string) => {
  const validURL =
    // eslint-disable-next-line no-useless-escape
    /^(http(s?):\/\/)?(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
      url
    );
  const validIP = isValidIP(url);
  return validURL || validIP;
};

export const isValidName = (name: string) =>
  !!name && /^[a-zA-Z0-9_.-]*$/.test(name);

export const isLengthUnity = (items) => items.length === 1;

const getCASecretName = (isCSISecret = false) =>
  `${isCSISecret ? 'csi' : 'ocs'}-kms-ca-secret-${getRandomChars()}`;
const getClientSecretName = (isCSISecret = false) =>
  `${isCSISecret ? 'csi' : 'ocs'}-kms-client-cert-${getRandomChars()}`;
const getClientKeySecretName = (isCSISecret = false) =>
  `${isCSISecret ? 'csi' : 'ocs'}-kms-client-key-${getRandomChars()}`;

export const generateCASecret = (caCertificate: string, ns: string) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: getCASecretName(),
    namespace: ns,
  },
  stringData: {
    cert: caCertificate,
  },
});

export const generateClientSecret = (
  clientCertificate: string,
  ns: string
) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: getClientSecretName(),
    namespace: ns,
  },
  stringData: {
    cert: clientCertificate,
  },
});

export const generateClientKeySecret = (clientKey: string, ns: string) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: getClientKeySecretName(),
    namespace: ns,
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
  ns: string,
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
      namespace: ns,
    },
  };
};

const generateOcsKmsConfigMap = (configData: KMSConfigMap, ns: string) => ({
  apiVersion: ConfigMapModel.apiVersion,
  kind: ConfigMapModel.kind,
  data: {
    ...configData,
  },
  metadata: {
    name: KMSConfigMapName,
    namespace: ns,
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

const generateThalesSecret = (
  kms: ThalesConfig,
  isCSISecret: boolean,
  ns: string
) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `thales-kmip-${isCSISecret ? 'csi' : 'ocs'}-${getRandomChars()}`,
    namespace: ns,
  },
  stringData: {
    CA_CERT: kms.caCert.value,
    CLIENT_CERT: kms.clientCert.value,
    CLIENT_KEY: kms.clientKey.value,
    ...(isCSISecret && { UNIQUE_IDENTIFIER: kms.uniqueId.value }),
  },
});

const generateHpcsSecret = (kms: HpcsConfig, ns: string) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `ibm-kp-kms-${getRandomChars()}`,
    namespace: ns,
  },
  stringData: {
    IBM_KP_SERVICE_API_KEY: kms.apiKey.value,
    IBM_KP_CUSTOMER_ROOT_KEY: kms.rootKey.value,
  },
});

const getKmsVaultSecret = (
  token: string,
  secretName: string,
  ns: string
): SecretKind => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: secretName,
    namespace: ns,
  },
  stringData: {
    token,
  },
});

const generateAzureSecret = (
  kms: AzureConfig,
  isCSISecret: boolean,
  ns: string
) => ({
  apiVersion: SecretModel.apiVersion,
  kind: SecretModel.kind,
  metadata: {
    name: `azure-${isCSISecret ? 'csi' : 'ocs'}-${getRandomChars()}`,
    namespace: ns,
  },
  stringData: {
    CLIENT_CERT: kms.clientCert.value,
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
  ns: string,
  updateNameAndNamespace: boolean = false,
  createAdvancedVaultResource: boolean = true
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];

  const kmsObj = _.cloneDeep(kms);
  // needed during initial deployment, to make sure CSI and OCS resources are decoupled
  if (updateNameAndNamespace) {
    if (kmsObj.caCert) {
      kmsObj.caCert.metadata.name = getCASecretName(true);
      kmsObj.caCert.metadata.namespace = ns;
    }
    if (kmsObj.clientCert) {
      kmsObj.clientCert.metadata.name = getClientSecretName(true);
      kmsObj.clientCert.metadata.namespace = ns;
    }
    if (kmsObj.clientKey) {
      kmsObj.clientKey.metadata.name = getClientKeySecretName(true);
      kmsObj.clientKey.metadata.namespace = ns;
    }
  }

  let csiConfigData: VaultConfigMap = {
    KMS_PROVIDER: KmsImplementations.VAULT_TOKENS,
    KMS_SERVICE_NAME: kmsObj.name.value,
    VAULT_ADDR: getKmsEndpoint(kmsObj.address.value, kmsObj.port.value),
    VAULT_BACKEND_PATH: kmsObj.backend,
    VAULT_CACERT: kmsObj.caCert?.metadata.name,
    VAULT_TLS_SERVER_NAME: kmsObj.tls,
    VAULT_CLIENT_CERT: kmsObj.clientCert?.metadata.name,
    VAULT_CLIENT_KEY: kmsObj.clientKey?.metadata.name,
    VAULT_CACERT_FILE: kmsObj.caCertFile,
    VAULT_CLIENT_CERT_FILE: kmsObj.clientCertFile,
    VAULT_CLIENT_KEY_FILE: kmsObj.clientKeyFile,
    VAULT_AUTH_METHOD: kmsObj.authMethod,
  };

  switch (kmsObj.authMethod) {
    case VaultAuthMethods.TOKEN:
      csiConfigData = {
        ...csiConfigData,
        VAULT_TOKEN_NAME: KMSVaultCSISecretName,
        VAULT_NAMESPACE: kmsObj.providerNamespace,
      };
      // token creation on ceph-csi deployment namespace from installation flow
      if (kmsObj.authValue.value) {
        const tokenSecret: SecretKind = getKmsVaultSecret(
          kmsObj.authValue.value,
          KMSVaultCSISecretName,
          ns
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
        VAULT_AUTH_PATH: kmsObj.providerAuthPath,
        VAULT_AUTH_NAMESPACE: kmsObj.providerAuthNamespace,
        VAULT_NAMESPACE: kmsObj.providerNamespace,
      };
      break;
    default:
  }

  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kmsObj.name.value,
    csiConfigData,
    ns
  );

  if (createAdvancedVaultResource) {
    csiKmsResources.push(...createAdvancedVaultResources(kmsObj));
  }
  if (update) {
    const cmPatch = [generateConfigMapPatch(kmsObj.name.value, csiConfigData)];
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
  ns: string,
  secretName = ''
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];

  const kmsName = kms.name.value;
  let keySecret: SecretKind;
  if (!secretName) {
    keySecret = generateHpcsSecret(kms, ns);
    csiKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  }

  const csiConfigData: HpcsConfigMap = {
    KMS_PROVIDER: KmsImplementations.IBM_KEY_PROTECT,
    KMS_SERVICE_NAME: kmsName,
    IBM_KP_SERVICE_INSTANCE_ID: kms.instanceId.value,
    IBM_KP_SECRET_NAME: secretName || getName(keySecret),
    IBM_KP_BASE_URL: kms.baseUrl.value,
    IBM_KP_TOKEN_URL: kms.tokenUrl,
  };
  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kmsName,
    csiConfigData,
    ns,
    false
  );
  if (update) {
    const cmPatch = [generateConfigMapPatch(kmsName, csiConfigData, false)];
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
  ns: string
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];
  const kmsName = kms.name.value;
  const keySecret = generateThalesSecret(kms, true, ns);
  csiKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));

  const csiConfigData: ThalesConfigMap = {
    KMS_PROVIDER: KmsImplementations.KMIP,
    KMS_SERVICE_NAME: kmsName,
    KMIP_ENDPOINT: `${kms.address.value}:${kms.port.value}`,
    KMIP_SECRET_NAME: getName(keySecret),
    TLS_SERVER_NAME: kms.tls,
  };
  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kmsName,
    csiConfigData,
    ns,
    false
  );
  if (update) {
    const cmPatch = [generateConfigMapPatch(kmsName, csiConfigData, false)];
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

const generateAzureConfigMapData = (
  kmsConfig: AzureConfig,
  secretName: string
): AzureConfigMap => {
  return {
    KMS_PROVIDER: KmsImplementations.AZURE,
    KMS_SERVICE_NAME: kmsConfig.name.value,
    AZURE_CLIENT_ID: kmsConfig.clientID.value,
    AZURE_VAULT_URL: kmsConfig.azureVaultURL.value,
    AZURE_TENANT_ID: kmsConfig.tenantID.value,
    AZURE_CERT_SECRET_NAME: secretName,
  };
};

const getCsiAzureResources = (
  kmsConfig: AzureConfig,
  isUpdate: boolean,
  namespace: string
) => {
  const csiKmsResources: Promise<K8sResourceKind>[] = [];

  const keySecret = generateAzureSecret(kmsConfig, true, namespace);
  csiKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  const csiConfigData: AzureConfigMap = generateAzureConfigMapData(
    kmsConfig,
    getName(keySecret)
  );
  const csiConfigObj: ConfigMapKind = generateCsiKmsConfigMap(
    kmsConfig.name.value,
    csiConfigData,
    namespace,
    false
  );
  if (isUpdate) {
    const configMapPatch = [
      generateConfigMapPatch(kmsConfig.name.value, csiConfigData, false),
    ];
    csiKmsResources.push(
      k8sPatch({
        model: ConfigMapModel,
        resource: csiConfigObj,
        data: configMapPatch,
      })
    );
  } else {
    csiKmsResources.push(
      k8sCreate({ model: ConfigMapModel, data: csiConfigObj })
    );
  }

  return csiKmsResources;
};

const getClusterAzureResources = (
  kmsConfig: AzureConfig,
  namespace: string
): Promise<K8sResourceKind>[] => {
  const clusterKmsResources: Promise<K8sResourceKind>[] = [];

  const keySecret = generateAzureSecret(kmsConfig, false, namespace);
  clusterKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));

  const configData: AzureConfigMap = generateAzureConfigMapData(
    kmsConfig,
    getName(keySecret)
  );
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(
    configData,
    namespace
  );
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return clusterKmsResources;
};

const getClusterVaultResources = (kms: VaultConfig, ns: string) => {
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
          data: getKmsVaultSecret(
            kms.authValue.value,
            KMSVaultTokenSecretName,
            ns
          ),
        })
      );
      break;
    case VaultAuthMethods.KUBERNETES:
      vaultConfigData = {
        ...vaultConfigData,
        VAULT_NAMESPACE: kms.providerNamespace,
        VAULT_AUTH_KUBERNETES_ROLE: kms.authValue.value,
        VAULT_AUTH_MOUNT_PATH: kms.providerAuthPath,
      };
      break;
    default:
  }
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(
    vaultConfigData,
    ns
  );
  clusterKmsResources.push(...createAdvancedVaultResources(kms));
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return clusterKmsResources;
};

const getClusterHpcsResources = (
  kms: HpcsConfig,
  ns: string
): Promise<K8sResourceKind>[] => {
  const clusterKmsResources: Promise<K8sResourceKind>[] = [];

  const keySecret: SecretKind = generateHpcsSecret(kms, ns);
  const secretName: string = getName(keySecret);

  const configData: HpcsConfigMap = {
    KMS_PROVIDER: KmsImplementations.IBM_KEY_PROTECT,
    KMS_SERVICE_NAME: kms.name.value,
    IBM_KP_SERVICE_INSTANCE_ID: kms.instanceId.value,
    IBM_KP_SECRET_NAME: secretName,
    IBM_KP_BASE_URL: kms.baseUrl.value,
    IBM_KP_TOKEN_URL: kms.tokenUrl,
  };
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(configData, ns);

  clusterKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return clusterKmsResources;
};

const getClusterThalesResources = (
  kms: ThalesConfig,
  ns: string
): Promise<K8sResourceKind>[] => {
  const clusterKmsResources: Promise<K8sResourceKind>[] = [];

  const keySecret: SecretKind = generateThalesSecret(kms, false, ns);
  clusterKmsResources.push(k8sCreate({ model: SecretModel, data: keySecret }));

  const configData: ThalesConfigMap = {
    KMS_PROVIDER: KmsImplementations.KMIP,
    KMS_SERVICE_NAME: kms.name.value,
    KMIP_ENDPOINT: `${kms.address.value}:${kms.port.value}`,
    KMIP_SECRET_NAME: getName(keySecret),
    TLS_SERVER_NAME: kms.tls,
  };
  const configMapObj: ConfigMapKind = generateOcsKmsConfigMap(configData, ns);
  clusterKmsResources.push(
    k8sCreate({ model: ConfigMapModel, data: configMapObj })
  );

  return clusterKmsResources;
};

export const getPort = (url: URL) => {
  if (url.port === '') {
    return url.protocol === 'http:' ? '80' : '443';
  }
  return url.port;
};

// CSI KMS ConfigMap and Secrets always needs to be created in ODF install namespace (that is, where Rook is deployed)
export const createCsiKmsResources = (
  kms: KMSConfiguration,
  update: boolean,
  odfNamespace: string,
  provider = ProviderNames.VAULT
): Promise<K8sResourceKind>[] => {
  switch (provider) {
    case ProviderNames.VAULT: {
      return getCsiVaultResources(kms as VaultConfig, update, odfNamespace);
    }
    case ProviderNames.HPCS: {
      return getCsiHpcsResources(kms as HpcsConfig, update, odfNamespace);
    }
    case ProviderNames.THALES: {
      return getCsiThalesResources(kms as ThalesConfig, update, odfNamespace);
    }
    case ProviderNames.AZURE: {
      return getCsiAzureResources(kms as AzureConfig, update, odfNamespace);
    }
  }
};

// CSI KMS ConfigMap and Secrets always needs to be created in ODF install namespace (that is, where Rook is deployed)
// OCS KMS ConfigMap and Secrets needs to be created in the namespace where Ceph is being deployed (StorageSystem namespace)
export const createClusterKmsResources = (
  kms: KMSConfiguration,
  storageClusterNs: string,
  odfNamespace: string,
  provider = ProviderNames.VAULT,
  isMCGStandalone = false
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
        ? getClusterVaultResources(kms as VaultConfig, storageClusterNs)
        : [];
      const csiKmsResources =
        !isMCGStandalone && storageClassSupported
          ? getCsiVaultResources(kms as VaultConfig, false, odfNamespace, true)
          : [];

      return [...clusterKmsResources, ...csiKmsResources];
    }
    case ProviderNames.HPCS: {
      const clusterKmsResources = getClusterHpcsResources(
        kms as HpcsConfig,
        storageClusterNs
      );
      const csiKmsResources = !isMCGStandalone
        ? getCsiHpcsResources(kms as HpcsConfig, false, odfNamespace)
        : [];

      return [...clusterKmsResources, ...csiKmsResources];
    }
    case ProviderNames.THALES: {
      const clusterKmsResources = getClusterThalesResources(
        kms as ThalesConfig,
        storageClusterNs
      );
      const csiKmsResources = !isMCGStandalone
        ? getCsiThalesResources(kms as ThalesConfig, false, odfNamespace)
        : [];
      return [...clusterKmsResources, ...csiKmsResources];
    }
    case ProviderNames.AZURE: {
      const clusterKmsResources = getClusterAzureResources(
        kms as AzureConfig,
        storageClusterNs
      );
      const csiKmsResources = !isMCGStandalone
        ? getCsiAzureResources(kms as AzureConfig, false, odfNamespace)
        : [];
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
    case ProviderNames.AZURE: {
      const kmsObj = kms as AzureConfig;
      return (
        kmsObj.name.valid &&
        kmsObj.azureVaultURL.valid &&
        kmsObj.clientID.valid &&
        kmsObj.tenantID.valid &&
        !kmsObj.clientCert.error &&
        kmsObj.name.value !== '' &&
        kmsObj.azureVaultURL.value !== '' &&
        kmsObj.clientID.value !== '' &&
        kmsObj.tenantID.value !== '' &&
        kmsObj.clientCert.value !== ''
      );
    }
    default:
      return false;
  }
};

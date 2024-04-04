import {
  getOCSRequestData,
  capacityAndNodesValidate,
} from '@odf/core/components/utils';
import {
  DeploymentType,
  BackingStorageType,
  ValidationType,
} from '@odf/core/types';
import { Payload } from '@odf/odf-plugin-sdk/extensions';
import { SecretModel, getAPIVersion } from '@odf/shared';
import {
  NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
  NOOBA_EXTERNAL_PG_SECRET_NAME,
} from '@odf/shared/constants';
import {
  OCSStorageClusterModel,
  ODFStorageSystem,
  NodeModel,
  NamespaceModel,
} from '@odf/shared/models';
import { Patch, StorageSystemKind } from '@odf/shared/types';
import { getAPIVersionForModel, k8sPatchByName } from '@odf/shared/utils';
import {
  K8sResourceKind,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  ocsTaint,
  defaultRequestSize,
  NO_PROVISIONER,
  cephStorageLabel,
} from '../../constants';
import { WizardNodeState, WizardState } from './reducer';

export const createStorageSystem = async (
  subSystemName: string,
  subSystemKind: string,
  systemNamespace: string
) => {
  const payload: StorageSystemKind = {
    apiVersion: getAPIVersionForModel(ODFStorageSystem),
    kind: ODFStorageSystem.kind,
    metadata: {
      name: `${subSystemName}-storagesystem`,
      namespace: systemNamespace,
    },
    spec: {
      name: subSystemName,
      kind: subSystemKind,
      namespace: systemNamespace,
    },
  };
  return k8sCreate({ model: ODFStorageSystem, data: payload });
};

export const createSecretPayload = (
  name: string,
  namespace: string,
  type: string,
  data?: { [key: string]: string },
  stringData?: { [key: string]: string }
): K8sResourceKind => {
  const secretPayload = {
    apiVersion: getAPIVersion(SecretModel),
    kind: SecretModel.kind,
    metadata: {
      name: name,
      namespace: namespace,
    },
    type: type,
    data: data,
    stringData: stringData,
  };

  return secretPayload;
};

export const createNoobaaExternalPostgresResources = (
  namespace: string,
  externalPostgresDetails: {
    username: string;
    password: string;
    serverName: string;
    port: string;
    databaseName: string;
    tls: {
      allowSelfSignedCerts: boolean;
      enableClientSideCerts: boolean;
    };
  },
  keys?: { private: string; public: string }
): Promise<K8sResourceKind>[] => {
  let secretResources: Promise<K8sResourceKind>[] = [];
  const stringData = {
    db_url: `postgresql://${externalPostgresDetails.username}:${externalPostgresDetails.password}@${externalPostgresDetails.serverName}:${externalPostgresDetails.port}/${externalPostgresDetails.databaseName}`,
  };
  const noobaaExternalPostgresSecretPayload = createSecretPayload(
    NOOBA_EXTERNAL_PG_SECRET_NAME,
    namespace,
    'Opaque',
    null,
    stringData
  );

  secretResources.push(
    k8sCreate({
      model: SecretModel,
      data: noobaaExternalPostgresSecretPayload,
    })
  );

  if (externalPostgresDetails.tls.enableClientSideCerts) {
    const privateKeyData = keys.private;
    const publicKeyData = keys.public;
    let data = {};
    if (privateKeyData) {
      data = { ...data, 'tls.key': btoa(privateKeyData) };
    }
    if (publicKeyData) {
      data = { ...data, 'tls.crt': btoa(publicKeyData) };
    }

    const noobaaExternalPostgresTLSSecretPayload = createSecretPayload(
      NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
      namespace,
      'kubernetes.io/tls',
      data
    );

    secretResources.push(
      k8sCreate({
        model: SecretModel,
        data: noobaaExternalPostgresTLSSecretPayload,
      })
    );
  }

  return secretResources;
};

export const setCephRBDAsDefault = (
  isRBDStorageClassDefault: boolean | null,
  deployment: DeploymentType
): boolean => !!isRBDStorageClassDefault && deployment === DeploymentType.FULL;

export const createStorageCluster = async (
  state: WizardState,
  storageClusterNamespace: string,
  storageClusterName: string
) => {
  const {
    storageClass,
    capacityAndNodes,
    securityAndNetwork,
    nodes,
    backingStorage,
    dataProtection,
  } = state;
  const { capacity, enableArbiter, arbiterLocation, pvCount } =
    capacityAndNodes;
  const { encryption, publicNetwork, clusterNetwork, kms } = securityAndNetwork;
  const {
    type,
    enableNFS,
    deployment,
    isRBDStorageClassDefault,
    useExternalPostgres,
    externalPostgres,
  } = backingStorage;
  const { enableRDRPreparation } = dataProtection;

  const isNoProvisioner = storageClass?.provisioner === NO_PROVISIONER;

  const storage = (
    isNoProvisioner ? defaultRequestSize.BAREMETAL : capacity
  ) as string;

  const validations = capacityAndNodesValidate(
    nodes,
    enableArbiter,
    isNoProvisioner,
    capacityAndNodes.resourceProfile
  );

  const isFlexibleScaling = validations.includes(
    ValidationType.ATTACHED_DEVICES_FLEXIBLE_SCALING
  );

  const isMCG = deployment === DeploymentType.MCG;
  const isNFSEnabled =
    enableNFS &&
    deployment === DeploymentType.FULL &&
    type !== BackingStorageType.EXTERNAL;
  const isProviderMode = deployment === DeploymentType.PROVIDER_MODE;

  const shouldSetCephRBDAsDefault = setCephRBDAsDefault(
    isRBDStorageClassDefault,
    deployment
  );

  const payload = getOCSRequestData({
    storageClass,
    storage,
    encryption,
    resourceProfile: capacityAndNodes.resourceProfile,
    nodes,
    flexibleScaling: isFlexibleScaling,
    publicNetwork,
    clusterNetwork,
    kmsEnable: kms.providerState.hasHandled && encryption.advanced,
    selectedArbiterZone: arbiterLocation,
    stretchClusterChecked: enableArbiter,
    availablePvsCount: pvCount,
    isMCG,
    isNFSEnabled,
    isProviderMode,
    shouldSetCephRBDAsDefault,
    enableRDRPreparation,
    storageClusterNamespace,
    enableNoobaaClientSideCerts: externalPostgres.tls.enableClientSideCerts,
    useExternalPostgres: useExternalPostgres,
    enablePostgresqlTls: externalPostgres.tls.enabled,
    allowNoobaaPostgresSelfSignedCerts:
      externalPostgres.tls.allowSelfSignedCerts,
    storageClusterName,
  });

  return k8sCreate({ model: OCSStorageClusterModel, data: payload });
};

export const labelNodes = async (
  nodes: WizardNodeState[],
  namespace: string
) => {
  const labelPath = `/metadata/labels/cluster.ocs.openshift.io~1${namespace}`;
  const storageLabel = cephStorageLabel(namespace);
  const patch: Patch[] = [
    {
      op: 'add',
      path: labelPath,
      value: '',
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    if (!node.labels?.[storageLabel])
      requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
  });
  try {
    await Promise.all(requests);
  } catch (err) {
    throw err;
  }
};

export const taintNodes = async (nodes: WizardNodeState[]) => {
  const patch: Patch[] = [
    {
      op: 'add',
      path: '/spec/taints',
      value: [ocsTaint],
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    const isAlreadyTainted = node.taints?.some((taint) =>
      _.isEqual(taint, ocsTaint)
    );
    if (!isAlreadyTainted) {
      requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
    }
  });
  await Promise.all(requests);
};

export const createExternalSubSystem = async (subSystemPayloads: Payload[]) => {
  try {
    await Promise.all(
      subSystemPayloads.map(async (payload) =>
        k8sCreate({ model: payload.model as K8sKind, data: payload.payload })
      )
    );
  } catch (err) {
    throw err;
  }
};

export const createOCSNamespace = async (systemNamespace: string) =>
  k8sCreate({
    model: NamespaceModel,
    data: {
      metadata: {
        name: systemNamespace,
        labels: { 'openshift.io/cluster-monitoring': 'true' },
      },
    },
  });

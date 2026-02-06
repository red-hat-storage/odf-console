import { getOCSRequestData, OCSRequestData } from '@odf/core/components/utils';
import { DeploymentType, BackingStorageType } from '@odf/core/types';
import { isFlexibleScaling } from '@odf/core/utils';
import { Payload } from '@odf/odf-plugin-sdk/extensions';
import {
  DEFAULT_DEVICECLASS,
  SecretModel,
  StorageAutoScalerKind,
  StorageClusterKind,
  getAPIVersion,
  getName,
  getNamespace,
} from '@odf/shared';
import {
  NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
  NOOBA_EXTERNAL_PG_SECRET_NAME,
} from '@odf/shared/constants';
import { DEFAULT_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  StorageClusterModel,
  NodeModel,
  NamespaceModel,
  StorageAutoScalerModel,
} from '@odf/shared/models';
import { Patch } from '@odf/shared/types';
import { getStorageAutoScalerName, k8sPatchByName } from '@odf/shared/utils';
import {
  K8sResourceKind,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  ocsTaint,
  DefaultRequestSize,
  NO_PROVISIONER,
  cephStorageLabel,
} from '../../constants';
import { WizardNodeState, WizardState } from './reducer';

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
    advancedSettings,
  } = state;
  const { capacity, enableArbiter, arbiterLocation, pvCount } =
    capacityAndNodes;
  const { encryption, kms } = securityAndNetwork;
  const { type, deployment } = backingStorage;
  const {
    enableNFS,
    isRBDStorageClassDefault,
    isVirtualizeStorageClassDefault,
    useExternalPostgres,
    externalPostgres,
    isDbBackup,
    dbBackup,
  } = advancedSettings;

  const isNoProvisioner = storageClass?.provisioner === NO_PROVISIONER;

  const storage = (
    isNoProvisioner ? DefaultRequestSize.BAREMETAL : capacity
  ) as string;

  const flexibleScaling = isFlexibleScaling(
    nodes,
    isNoProvisioner,
    enableArbiter
  );

  const isMCG = deployment === DeploymentType.MCG;
  const isNFSEnabled =
    enableNFS &&
    deployment === DeploymentType.FULL &&
    type !== BackingStorageType.EXTERNAL;

  const shouldSetCephRBDAsDefault = setCephRBDAsDefault(
    isRBDStorageClassDefault,
    deployment
  );

  const shouldSetVirtualizeSCAsDefault =
    deployment === DeploymentType.FULL && isVirtualizeStorageClassDefault;

  const networkConfiguration: OCSRequestData['networkConfiguration'] = _.omit(
    securityAndNetwork,
    ['kms', 'encryption']
  );

  const payload = getOCSRequestData({
    storageClass,
    storage,
    encryption,
    resourceProfile: capacityAndNodes.resourceProfile,
    nodes,
    flexibleScaling,
    networkConfiguration,
    kmsEnable: kms.providerState.hasHandled && encryption.advanced,
    selectedArbiterZone: arbiterLocation,
    stretchClusterChecked: enableArbiter,
    availablePvsCount: pvCount,
    isMCG,
    isNFSEnabled,
    shouldSetCephRBDAsDefault,
    shouldSetVirtualizeSCAsDefault,
    storageClusterNamespace,
    enableNoobaaClientSideCerts: externalPostgres.tls.enableClientSideCerts,
    useExternalPostgres: useExternalPostgres,
    enablePostgresqlTls: externalPostgres.tls.enabled,
    allowNoobaaPostgresSelfSignedCerts:
      externalPostgres.tls.allowSelfSignedCerts,
    storageClusterName,
    isDbBackup,
    dbBackup,
  });

  return k8sCreate({ model: StorageClusterModel, data: payload });
};

export const createStorageAutoScaler = (
  capacityLimit: string,
  storageCluster: StorageClusterKind
) => {
  const data: StorageAutoScalerKind = {
    apiVersion: 'ocs.openshift.io/v1',
    kind: 'StorageAutoScaler',
    metadata: {
      name: getStorageAutoScalerName(storageCluster),
      namespace: getNamespace(storageCluster),
    },
    spec: {
      deviceClass: DEFAULT_DEVICECLASS,
      storageCapacityLimit: capacityLimit,
      storageCluster: {
        name: getName(storageCluster),
      },
    },
  };

  return k8sCreate({ model: StorageAutoScalerModel, data });
};

export const labelNodes = async (
  nodes: WizardNodeState[],
  namespace: string
) => {
  // ToDo (epic 4422): Use StorageSystem namespace once we support multiple internal clusters
  const labelPath = `/metadata/labels/cluster.ocs.openshift.io~1${DEFAULT_STORAGE_NAMESPACE}`;
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

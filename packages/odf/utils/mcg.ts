import {
  NooBaaBucketClassModel,
  NooBaaObjectBucketClaimModel,
} from '@odf/shared';
import { SecretModel } from '@odf/shared/models';
import { getAPIVersion } from '@odf/shared/selectors';
import {
  DeploymentKind,
  K8sResourceKind,
  StorageClassResourceKind,
} from '@odf/shared/types';
import {
  getAPIVersionForModel,
  RowFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  AWS_REGIONS,
  StoreProviders,
  BUCKET_LABEL_NOOBAA_MAP,
  NamespacePolicyType,
  NS_PROVIDERS_NOOBAA_MAP,
  PROVIDERS_NOOBAA_MAP,
  StoreType,
  TimeUnits,
} from '../constants';
import {
  BackingStoreKind,
  BucketClassKind,
  NamespaceStoreKind,
  PlacementPolicy,
} from '../types';

export const getAttachOBCPatch = (
  obcName: string,
  deployment: DeploymentKind
) => {
  const configMapRef = {
    configMapRef: {
      name: obcName,
    },
  };
  const secretMapRef = {
    secretRef: {
      name: obcName,
    },
  };

  const containers = deployment?.spec?.template?.spec?.containers ?? [];
  const patches = containers.reduce((patch, container, i) => {
    if (_.isEmpty(container.envFrom)) {
      patch.push({
        op: 'add',
        path: `/spec/template/spec/containers/${i}/envFrom`,
        value: [configMapRef],
      });
      patch.push({
        op: 'add',
        path: `/spec/template/spec/containers/${i}/envFrom/-`,
        value: secretMapRef,
      });
    } else {
      patch.push({
        op: 'add',
        path: `/spec/template/spec/containers/${i}/envFrom/-`,
        value: configMapRef,
      });
      patch.push({
        op: 'add',
        path: `/spec/template/spec/containers/${i}/envFrom/-`,
        value: secretMapRef,
      });
    }
    return patch;
  }, []);
  return patches;
};

export const getPhase = (obj: K8sResourceKind): string => {
  return _.get(obj, 'status.phase', 'Lost');
};

export const isBound = (obj: K8sResourceKind): boolean =>
  getPhase(obj) === 'Bound';

const allPhases = ['Pending', 'Bound', 'Lost'];

export const obcStatusFilter = (t): RowFilter<K8sResourceKind> => ({
  type: 'obc-status',
  filterGroupName: t('Status'),
  reducer: getPhase,
  items: _.map(allPhases, (phase) => ({
    id: phase,
    title: phase,
  })),
  filter: (phases, obc) => {
    if (!phases || !phases.selected) {
      return true;
    }
    const phase = getPhase(obc);
    return (
      phases.selected.includes(phase) ||
      !_.includes(phases.all, phase) ||
      _.isEmpty(phases.selected)
    );
  },
});

export const obStatusFilter = (t): RowFilter<K8sResourceKind> => ({
  type: 'ob-status',
  filterGroupName: t('Status'),
  reducer: getPhase,
  items: _.map(allPhases, (phase) => ({
    id: phase,
    title: phase,
  })),
  filter: (phases, ob) => {
    if (!phases || !phases.selected) {
      return true;
    }
    const phase = getPhase(ob);
    return (
      phases.selected.includes(phase) ||
      !_.includes(phases.all, phase) ||
      _.isEmpty(phases.selected)
    );
  },
});

export const getExternalProviders = (type: StoreType) => {
  return type === StoreType.NS
    ? [
        StoreProviders.AWS,
        StoreProviders.AZURE,
        StoreProviders.S3,
        StoreProviders.IBM,
      ]
    : [
        StoreProviders.AWS,
        StoreProviders.AZURE,
        StoreProviders.S3,
        StoreProviders.GCP,
        StoreProviders.IBM,
      ];
};

export const getProviders = (type: StoreType) => {
  const values =
    type === StoreType.BS
      ? // BackingStore does not support filesystem, NamespaceStore does not support PVC and GCP
        Object.values(StoreProviders).filter(
          (provider) => provider !== StoreProviders.FILESYSTEM
        )
      : Object.values(StoreProviders).filter(
          (provider) =>
            provider !== StoreProviders.GCP && provider !== StoreProviders.PVC
        );
  return _.zipObject(values, values);
};

export const secretPayloadCreator = (
  provider: string,
  namespace: string,
  secretName: string,
  field1: string,
  field2 = ''
) => {
  const payload = {
    apiVersion: getAPIVersion(SecretModel),
    kind: SecretModel.kind,
    stringData: {},
    metadata: {
      name: secretName,
      namespace,
    },
    type: 'Opaque',
  };

  switch (provider) {
    case StoreProviders.AZURE:
      payload.stringData = {
        AccountName: field1,
        AccountKey: field2,
      };
      break;
    case StoreProviders.IBM:
      payload.stringData = {
        IBM_COS_ACCESS_KEY_ID: field1,
        IBM_COS_SECRET_ACCESS_KEY: field2,
      };
      break;
    default:
      payload.stringData = {
        AWS_ACCESS_KEY_ID: field1,
        AWS_SECRET_ACCESS_KEY: field2,
      };
      break;
  }
  return payload;
};

const objectStorageProvisioners = (ns: string) => [
  `${ns}.noobaa.io/obc`,
  `${ns}.ceph.rook.io/bucket`,
];

export const isObjectSC = (sc: StorageClassResourceKind, ns: string) =>
  objectStorageProvisioners(ns).includes(sc?.provisioner);

export const awsRegionItems = _.zipObject(AWS_REGIONS, AWS_REGIONS);

export const endpointsSupported = [StoreProviders.S3, StoreProviders.IBM];

export const getNamespaceStoreType = (
  ns: NamespaceStoreKind
): StoreProviders => {
  let type: StoreProviders = null;
  Object.entries(NS_PROVIDERS_NOOBAA_MAP).forEach(([k, v]) => {
    if (ns?.spec?.[v as string]) {
      type = k as StoreProviders;
    }
  });
  return type;
};

export const getNSRegion = (ns: NamespaceStoreKind): string => {
  const type = getNamespaceStoreType(ns);
  return ns.spec?.[NS_PROVIDERS_NOOBAA_MAP[type]]?.region;
};

export const convertTime = (unit: TimeUnits, value: number): number =>
  unit === TimeUnits.HOUR ? value / 3600000 : value / 60000;

export const getTimeUnitString = (unit: TimeUnits, t: TFunction): string => {
  return unit === TimeUnits.HOUR ? t('hr') : t('min');
};

export const validateDuration = (ms: number): boolean =>
  ms >= 0 && ms <= 86400000;

const bucketClassNameRegex: RegExp = /^[a-z0-9]+[a-z0-9-.]+[a-z0-9]+$/;
const consecutivePeriodsAndHyphensRegex: RegExp = /(\.\.)|(--)/g;

export const validateBucketClassName = (name: string): boolean =>
  name.length >= 3 &&
  name.length <= 63 &&
  bucketClassNameRegex.test(name) &&
  !consecutivePeriodsAndHyphensRegex.test(name);

export const getMCGStoreType = (
  bs: BackingStoreKind | NamespaceStoreKind
): StoreProviders => {
  let type: StoreProviders = null;
  _.forEach(PROVIDERS_NOOBAA_MAP, (v, k) => {
    if (bs?.spec?.[v]) {
      type = k as StoreProviders;
    }
  });
  return type;
};

export const getBucketName = (bs: BackingStoreKind): string => {
  const type = getMCGStoreType(bs);
  return bs.spec?.[PROVIDERS_NOOBAA_MAP[type]]?.[BUCKET_LABEL_NOOBAA_MAP[type]];
};

export const getRegion = (
  bs: BackingStoreKind | NamespaceStoreKind
): string => {
  const type = getMCGStoreType(bs);
  return bs.spec?.[PROVIDERS_NOOBAA_MAP[type]]?.region;
};

export const getBSLabel = (policy: PlacementPolicy, t: TFunction) =>
  policy === PlacementPolicy.Mirror
    ? t('Select at least 2 Backing Store resources')
    : t('Select at least 1 Backing Store resource');

export const getBackingStoreNames = (
  bc: BucketClassKind,
  tier: 0 | 1
): string[] => bc.spec.placementPolicy?.tiers?.[tier]?.backingStores ?? [];

export const getBackingStorePolicy = (
  bc: BucketClassKind,
  tier: 0 | 1
): PlacementPolicy => bc.spec.placementPolicy?.tiers?.[tier]?.placement;

export const convertToMS = ({ unit, value }) =>
  unit === TimeUnits.HOUR
    ? parseInt(value, 10) * 3600000
    : parseInt(value, 10) * 60000;

export const generateGenericName = (name: string, prefix: string): string => {
  return `${prefix}-${name}`.toLowerCase();
};

export const createNewSingleNamespaceBucketClass = (
  name: string,
  namespace: string,
  namespaceStoreName: string
): K8sResourceKind => {
  return {
    apiVersion: getAPIVersionForModel(NooBaaBucketClassModel),
    kind: NooBaaBucketClassModel.kind,
    metadata: {
      name,
      namespace,
    },
    spec: {
      namespacePolicy: {
        type: NamespacePolicyType.SINGLE,
        single: {
          resource: namespaceStoreName,
        },
      },
    },
  };
};

export const createNewObjectBucketClaim = (
  name: string,
  namespace: string,
  bucketClassName: string,
  storageClassName: string
): K8sResourceKind => {
  return {
    apiVersion: getAPIVersionForModel(NooBaaObjectBucketClaimModel),
    kind: NooBaaObjectBucketClaimModel.kind,
    metadata: {
      name,
      namespace,
    },
    spec: {
      storageClassName,
      generateBucketName: name,
      additionalConfig: {
        bucketClass: bucketClassName,
      },
    },
  };
};

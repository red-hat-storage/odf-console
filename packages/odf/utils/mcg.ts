import { SecretModel } from '@odf/shared/models';
import { getAPIVersion } from '@odf/shared/selectors';
import {
  DeploymentKind,
  K8sResourceKind,
  StorageClass,
} from '@odf/shared/types';
import { RowFilter } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import {
  AWS_REGIONS,
  BC_PROVIDERS,
  BUCKET_LABEL_NOOBAA_MAP,
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
    ? [BC_PROVIDERS.AWS, BC_PROVIDERS.AZURE, BC_PROVIDERS.S3, BC_PROVIDERS.IBM]
    : [
        BC_PROVIDERS.AWS,
        BC_PROVIDERS.AZURE,
        BC_PROVIDERS.S3,
        BC_PROVIDERS.GCP,
        BC_PROVIDERS.IBM,
      ];
};

export const getProviders = (type: StoreType) => {
  const values =
    type === StoreType.BS
      ? // BackingStore does not support filesystem, NamespaceStore does not support PVC and GCP
        Object.values(BC_PROVIDERS).filter(
          (provider) => provider !== BC_PROVIDERS.FILESYSTEM
        )
      : Object.values(BC_PROVIDERS).filter(
          (provider) =>
            provider !== BC_PROVIDERS.GCP && provider !== BC_PROVIDERS.PVC
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
    case BC_PROVIDERS.AZURE:
      payload.stringData = {
        AccountName: field1,
        AccountKey: field2,
      };
      break;
    case BC_PROVIDERS.IBM:
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

const objectStorageProvisioners = [
  'openshift-storage.noobaa.io/obc',
  'openshift-storage.ceph.rook.io/bucket',
];

export const isObjectSC = (sc: StorageClass) =>
  objectStorageProvisioners.includes(sc.provisioner);

export const awsRegionItems = _.zipObject(AWS_REGIONS, AWS_REGIONS);

export const endpointsSupported = [BC_PROVIDERS.S3, BC_PROVIDERS.IBM];

export const getNamespaceStoreType = (ns: NamespaceStoreKind): BC_PROVIDERS => {
  let type: BC_PROVIDERS = null;
  Object.entries(NS_PROVIDERS_NOOBAA_MAP).forEach(([k, v]) => {
    if (ns?.spec?.[v]) {
      type = k as BC_PROVIDERS;
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

export const getBackingStoreType = (bs: BackingStoreKind): BC_PROVIDERS => {
  let type: BC_PROVIDERS = null;
  _.forEach(PROVIDERS_NOOBAA_MAP, (v, k) => {
    if (bs?.spec?.[v]) {
      type = k as BC_PROVIDERS;
    }
  });
  return type;
};

export const getBucketName = (bs: BackingStoreKind): string => {
  const type = getBackingStoreType(bs);
  return bs.spec?.[PROVIDERS_NOOBAA_MAP[type]]?.[BUCKET_LABEL_NOOBAA_MAP[type]];
};

export const getRegion = (bs: BackingStoreKind): string => {
  const type = getBackingStoreType(bs);
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

import { getNamespace } from '@odf/shared/selectors';
import { ClusterServiceVersionKind } from '@odf/shared/types';
import { K8sResourceKind } from '@odf/shared/types';
import {
  StorageClassResourceKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { isDefaultClass } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { ODF_VENDOR_ANNOTATION } from '../constants';
import { ODFSystemFlagsPayload } from '../redux/actions';

export const getSupportedVendors = (
  csv: ClusterServiceVersionKind
): string[] => {
  const annotations = csv?.metadata?.annotations?.[ODF_VENDOR_ANNOTATION];
  return annotations ? JSON.parse(annotations) : [];
};

export const getExternalSubSystemName = (
  name: string = '',
  storageClassName: string
) =>
  `${name.toLowerCase().replace(/\s/g, '-')}-${storageClassName}`.substring(
    0,
    230
  );

export const getStorageClassDescription = (
  sc: StorageClassResourceKind
): string => {
  const storageClassProperties = [
    isDefaultClass(sc) ? '(default)' : '',
    sc.metadata?.annotations?.['description'],
    sc.metadata?.annotations?.['storage.alpha.openshift.io/access-mode'],
    sc.provisioner,
    sc.parameters?.type,
    sc.parameters?.zone,
  ];
  return _.compact(storageClassProperties).join(' | ');
};

export const getOperatorVersion = (operator: K8sResourceKind): string =>
  operator?.spec?.version;

export const isMCGStandaloneCluster = (storageCluster: StorageClusterKind) =>
  storageCluster?.spec?.multiCloudGateway?.reconcileStrategy === 'standalone';

export const isExternalCluster = (storageCluster: StorageClusterKind) =>
  !_.isEmpty(storageCluster?.spec?.externalStorage);

export const isClusterIgnored = (storageCluster: StorageClusterKind) =>
  storageCluster?.status?.phase === 'Ignored';

export const isNFSEnabled = (storageCluster: StorageClusterKind) =>
  storageCluster?.spec?.nfs?.enable === true;

export const getStorageClusterInNs = (
  storageClusters: StorageClusterKind[],
  namespace: string
) =>
  storageClusters?.find(
    (sc: StorageClusterKind) =>
      !isClusterIgnored(sc) && getNamespace(sc) === namespace
  );

export const getResourceInNs = (
  resources: K8sResourceKind[],
  namespace: string
) => resources?.find((r: K8sResourceKind) => getNamespace(r) === namespace);

export const hasAnyExternalOCS = (
  systemFlags: ODFSystemFlagsPayload['systemFlags']
): boolean => _.some(systemFlags, (flags) => !!flags.isExternalMode);

export const hasAnyInternalOCS = (
  systemFlags: ODFSystemFlagsPayload['systemFlags']
): boolean => _.some(systemFlags, (flags) => !!flags.isInternalMode);

export const hasAnyCeph = (
  systemFlags: ODFSystemFlagsPayload['systemFlags']
): boolean => _.some(systemFlags, (flags) => !!flags.isCephAvailable);

export const hasAnyNoobaaStandalone = (
  systemFlags: ODFSystemFlagsPayload['systemFlags']
): boolean => _.some(systemFlags, (flags) => !!flags.isNoobaaStandalone);

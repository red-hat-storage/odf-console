import { ClusterServiceVersionKind } from '@odf/shared/types';
import { K8sResourceKind } from '@odf/shared/types';
import { StorageClassResourceKind } from '@odf/shared/types';
import { isDefaultClass } from '@odf/shared/utils';
import * as _ from 'lodash';
import { ODF_VENDOR_ANNOTATION } from '../constants';

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

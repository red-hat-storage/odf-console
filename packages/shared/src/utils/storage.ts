import { Model } from '@odf/odf-plugin-sdk/extensions';
import {
  CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB,
  CEPH_PROVISIONERS,
  DEFAULT_DEVICECLASS,
  ODF_OPERATOR,
  STORAGE_SIZE_UNIT_NAME_MAP,
} from '@odf/shared/constants';
import { StorageClusterModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors/k8s';
import {
  ClusterServiceVersionKind,
  StorageClusterKind,
  StorageSizeUnit,
  StorageSystemKind,
} from '@odf/shared/types';
import { getGVKLabel } from '@odf/shared/utils/common';
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export const getCapacityAutoScalingDefaultLimit = () =>
  `${CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB}${StorageSizeUnit.Ti}`;

export const getFormattedCapacity = (capacity: string) => {
  if (!capacity) {
    return '-';
  }
  return `${capacity.match(/\d+/g)[0]} ${
    STORAGE_SIZE_UNIT_NAME_MAP[capacity.match(/\D+/g)[0]]
  }`;
};

export const getODFCsv = (csvList: ClusterServiceVersionKind[] = []) =>
  csvList.find(
    (csv) =>
      csv?.metadata.name?.substring(0, ODF_OPERATOR.length) === ODF_OPERATOR
  );

export const getStorageAutoScalerName = (storageCluster: StorageClusterKind) =>
  `${getName(storageCluster)}-${DEFAULT_DEVICECLASS}`;

export const isOCSStorageSystem = (
  resource: K8sResourceKind
): resource is StorageSystemKind =>
  resource?.spec?.kind ===
  getGVKLabel({
    kind: StorageClusterModel.kind,
    apiVersion: StorageClusterModel.apiVersion,
    apiGroup: StorageClusterModel.apiGroup,
  } as Model);

export const getOCSStorageSystem = (ssList: StorageSystemKind[] = []) =>
  ssList.find((ss) => isOCSStorageSystem(ss));

export const isCephProvisioner = (scProvisioner: string): boolean => {
  return CEPH_PROVISIONERS.some((provisioner: string) =>
    _.endsWith(scProvisioner, provisioner)
  );
};

export const isCephDriver = (driver: string): boolean =>
  _.endsWith(driver, 'ceph.com');

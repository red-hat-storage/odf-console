import { Model } from '@odf/odf-plugin-sdk/extensions';
import { StorageClusterModel } from '@odf/shared/models';
import {
  ClusterServiceVersionKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { CEPH_PROVISIONERS, ODF_OPERATOR } from '../constants';
import { getGVKLabel } from '../utils/common';

export const getODFCsv = (csvList: ClusterServiceVersionKind[] = []) =>
  csvList.find(
    (csv) =>
      csv?.metadata.name?.substring(0, ODF_OPERATOR.length) === ODF_OPERATOR
  );

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

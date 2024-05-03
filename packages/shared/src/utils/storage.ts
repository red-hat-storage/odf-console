import { Model } from '@odf/odf-plugin-sdk/extensions';
import { OCSStorageClusterModel } from '@odf/shared/models';
import {
  ClusterServiceVersionKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';
import { ODF_OPERATOR } from '../constants';
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
    kind: OCSStorageClusterModel.kind,
    apiVersion: OCSStorageClusterModel.apiVersion,
    apiGroup: OCSStorageClusterModel.apiGroup,
  } as Model);

export const getOCSStorageSystem = (ssList: StorageSystemKind[] = []) =>
  ssList.find((ss) => isOCSStorageSystem(ss));

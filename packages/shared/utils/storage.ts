import { OCSStorageClusterModel } from '@odf/shared/models';
import {
  ClusterServiceVersionKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { ODF_OPERATOR } from '../constants';
import { getGVKLabel } from '../utils/common';

export const getODFCsv = (csvList: ClusterServiceVersionKind[] = []) =>
  csvList.find(
    (csv) =>
      csv?.metadata.name?.substring(0, ODF_OPERATOR.length) === ODF_OPERATOR
  );

export const getOCSStorageSystem = (ssList: StorageSystemKind[] = []) =>
  ssList.find(
    (ss) =>
      ss?.spec?.kind ===
      getGVKLabel({
        kind: OCSStorageClusterModel.kind,
        apiVersion: OCSStorageClusterModel.apiVersion,
        apiGroup: OCSStorageClusterModel.apiGroup,
      })
  );

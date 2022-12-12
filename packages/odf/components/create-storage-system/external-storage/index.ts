import { IBMFlashSystemModel } from '@odf/core/models';
import { ExternalStorage } from '@odf/core/types';
import { OCSStorageClusterModel } from '@odf/shared/models';
import {
  flashSystemCanGoToNextStep,
  FlashSystemConnectionDetails,
  createFlashSystemPayload,
} from './ibm-flashsystem/index';
import {
  rhcsCanGoToNextStep,
  ConnectionDetails,
  rhcsPayload,
} from './red-hat-ceph-storage';

export const SUPPORTED_EXTERNAL_STORAGE: ExternalStorage[] = [
  {
    displayName: 'Red Hat Ceph Storage',
    model: {
      apiGroup: OCSStorageClusterModel.apiGroup,
      apiVersion: OCSStorageClusterModel.apiVersion,
      kind: OCSStorageClusterModel.kind,
      plural: OCSStorageClusterModel.plural,
    },
    Component: ConnectionDetails,
    createPayload: rhcsPayload,
    canGoToNextStep: rhcsCanGoToNextStep,
  },
  {
    displayName: 'IBM FlashSystem Storage',
    model: {
      apiGroup: IBMFlashSystemModel.apiGroup,
      apiVersion: IBMFlashSystemModel.apiVersion,
      kind: IBMFlashSystemModel.kind,
      plural: IBMFlashSystemModel.plural,
    },
    Component: FlashSystemConnectionDetails,
    createPayload: createFlashSystemPayload,
    canGoToNextStep: flashSystemCanGoToNextStep,
  },
];

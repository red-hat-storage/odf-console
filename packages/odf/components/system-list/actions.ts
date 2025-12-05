import * as React from 'react';
import {
  StorageSystemKind,
  IBMFlashSystemModel,
  RemoteClusterModel,
  ClusterModel,
  StorageClusterModel,
} from '@odf/shared';
import { ModalKeys } from '@odf/shared/modals';
import { getGVK } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';

const getKindOfExternalSystem = (obj: StorageSystemKind): string => {
  const { kind } = getGVK(obj.spec.kind);
  if (kind.toLowerCase() === IBMFlashSystemModel.kind.toLowerCase()) {
    return IBMFlashSystemModel.kind;
  }
  if (kind.toLowerCase() === RemoteClusterModel.kind.toLowerCase()) {
    return RemoteClusterModel.kind;
  }
  if (kind.toLowerCase() === ClusterModel.kind.toLowerCase()) {
    return ClusterModel.kind;
  }
  if (kind.toLowerCase() === StorageClusterModel.kind.toLowerCase()) {
    return StorageClusterModel.kind;
  }
};

type ActionsForExternalSystem = {
  customActions: {
    key: string;
    value: string;
    component: React.LazyExoticComponent<any>;
  }[];
  hiddenActions: ModalKeys[];
};

export const getActions = (
  obj: StorageSystemKind,
  t: TFunction
): ActionsForExternalSystem => {
  if (getKindOfExternalSystem(obj) === ClusterModel.kind) {
    return {
      customActions: [
        {
          key: 'ADD_LUN_GROUP',
          value: t('Add LUN group'),
          component: React.lazy(
            () => import('../../modals/lun-group/AddLunGroupModal')
          ),
        },
      ],
      hiddenActions: [
        ModalKeys.EDIT_RES,
        ModalKeys.DELETE,
        ModalKeys.EDIT_ANN,
        ModalKeys.EDIT_LABELS,
      ],
    };
  }
  if (getKindOfExternalSystem(obj) === RemoteClusterModel.kind) {
    return {
      customActions: [
        {
          key: 'ADD_REMOTE_FILE_SYSTEM',
          value: t('Add Remote FileSystem'),
          component: React.lazy(
            () => import('../../modals/add-remote-fs/AddRemoteFileSystemModal')
          ),
        },
      ],
      hiddenActions: [
        ModalKeys.EDIT_RES,
        ModalKeys.DELETE,
        ModalKeys.EDIT_ANN,
        ModalKeys.EDIT_LABELS,
      ],
    };
  }
  return {
    customActions: [],
    hiddenActions: [],
  };
};

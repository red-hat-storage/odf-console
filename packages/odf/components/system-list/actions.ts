import * as React from 'react';
import { shouldShowConfigurePerformanceProfile } from '@odf/core/components/configure-performance-profiles/utils';
import { getConfigurePerformanceProfileRoute } from '@odf/core/constants';
import {
  StorageSystemKind,
  IBMFlashSystemModel,
  RemoteClusterModel,
  ClusterModel,
  StorageClusterModel,
  StorageClusterKind,
} from '@odf/shared';
import { CustomKebabItem } from '@odf/shared/kebab/kebab';
import { ModalKeys } from '@odf/shared/modals';
import { getGVK } from '@odf/shared/utils';
import { TFunction } from 'i18next';

const getKindOfExternalSystem = (
  obj: StorageSystemKind
): string | undefined => {
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
  return undefined;
};

type ConfigurePerformanceActionOptions = {
  storageCluster?: StorageClusterKind;
  isExternalMode?: boolean;
  isNoobaaAvailable?: boolean;
};

type ActionsForExternalSystem = {
  customActions: CustomKebabItem[];
  hiddenActions: ModalKeys[];
};

export const getActions = (
  obj: StorageSystemKind,
  t: TFunction,
  isSANSystemDeletable: boolean,
  options: ConfigurePerformanceActionOptions = {}
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
        {
          key: ModalKeys.DELETE,
          value: t('Delete SAN_Storage'),
          description: isSANSystemDeletable
            ? undefined
            : t('Cannot be deleted if LUN groups exist.'),
          component: React.lazy(
            () => import('../../modals/san-system/DeleteSANSystemModal')
          ),
          isDisabled: !isSANSystemDeletable,
        },
      ],
      hiddenActions: [
        ModalKeys.EDIT_RES,
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
  if (getKindOfExternalSystem(obj) === StorageClusterModel.kind) {
    const {
      storageCluster,
      isExternalMode = false,
      isNoobaaAvailable = false,
    } = options;
    const customActions: CustomKebabItem[] = [];
    if (
      shouldShowConfigurePerformanceProfile({
        storageCluster,
        isExternalMode,
        isNoobaaAvailable,
      })
    ) {
      customActions.push({
        key: 'CONFIGURE_PERFORMANCE',
        value: t('Configure performance profiles'),
        redirect: getConfigurePerformanceProfileRoute(
          obj.spec.namespace,
          obj.spec.name
        ),
      });
    }
    return {
      customActions,
      hiddenActions: [],
    };
  }
  return {
    customActions: [],
    hiddenActions: [],
  };
};

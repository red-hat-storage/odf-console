import * as React from 'react';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { ODFSystemFlagsPayload } from '@odf/core/redux/actions';
import { CephBlockPoolModel } from '@odf/shared';
import { ModalFooter } from '@odf/shared/generic/ModalTitle';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import {
  StorageClusterModel,
  PersistentVolumeClaimModel,
  StorageClassModel,
} from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  ListKind,
  PersistentVolumeClaimKind,
  StorageClassResourceKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  k8sDelete,
  K8sModel,
  k8sPatch,
  K8sResourceCommon,
  Patch,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  getFsPoolIndex,
  getScNamesUsingPool,
  isDefaultPool,
} from '../..//utils';
import {
  ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH,
  PoolProgress,
  PoolType,
} from '../../constants';
import { StoragePoolStatus } from '../../storage-pool/body';
import {
  StoragePoolActionType,
  StoragePoolState,
  blockPoolInitialState,
  storagePoolReducer,
} from '../../storage-pool/reducer';
import { StoragePool } from '../../types';
import { getStorageClassName } from '../../utils/common';
import { StoragePoolModalFooter, FooterPrimaryActions } from './modal-footer';

const deleteFsPoolRequest = (
  state: StoragePoolState,
  storageCluster: StorageClusterKind
) => {
  const poolIndex = getFsPoolIndex(storageCluster, state.poolName);

  // NOTE: removing the pool at the CR level should also remove it at the ceph level
  // once this bug is resolved: https://bugzilla.redhat.com/show_bug.cgi?id=2291328
  const patches: Patch[] = [
    {
      op: 'remove',
      path: `${ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH}/${poolIndex}`,
    },
  ];

  return () =>
    k8sPatch({
      model: StorageClusterModel,
      resource: storageCluster,
      data: patches,
    });
};

export const toList = (text: string[]): React.ReactNode => (
  <div
    style={{
      overflowY: text.length > 3 ? 'scroll' : 'visible',
      maxHeight: '5rem',
    }}
  >
    {text.map((s) => (
      <li key={s}>{s}</li>
    ))}
  </div>
);

type DeleteStoragePoolModalProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: StoragePool;
}>;

const DeleteStoragePoolModal: React.FC<DeleteStoragePoolModalProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const newProps = _.cloneDeep(props);
  newProps.extraProps['systemFlags'] = systemFlags;

  if (areFlagsLoaded && !flagsLoadError) {
    return props?.extraProps?.resource?.type === PoolType.FILESYSTEM ? (
      <DeleteFsPoolModal {...(newProps as DeleteFsPoolModalProps)} />
    ) : (
      <DeleteStoragePoolModalBase
        {...(newProps as DeleteStoragePoolModalBaseProps)}
      />
    );
  }
  return (
    <StatusBox
      loaded={areFlagsLoaded}
      loadError={flagsLoadError}
      label={t('Storage pool delete modal')}
    />
  );
};

type DeleteFsPoolModalProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: StoragePool;
  systemFlags: ODFSystemFlagsPayload['systemFlags'];
}>;

const DeleteFsPoolModal: React.FC<DeleteFsPoolModalProps> = (props) => {
  const { t } = useCustomTranslation();
  const {
    extraProps: { resource, systemFlags },
  } = props;
  const poolNamespace = getNamespace(resource);
  const clusterName = systemFlags[poolNamespace]?.ocsClusterName;
  const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
    useSafeK8sGet<StorageClusterKind>(
      StorageClusterModel,
      clusterName,
      poolNamespace
    );
  const newProps = _.cloneDeep(props);
  newProps.extraProps['storageCluster'] = storageCluster;

  if (storageClusterLoaded && !storageClusterLoadError) {
    return <DeleteStoragePoolModalBase {...newProps} />;
  }
  return (
    <StatusBox
      loaded={storageClusterLoaded}
      loadError={storageClusterLoadError}
      label={t('Storage pool delete modal')}
    />
  );
};

type DeleteStoragePoolModalBaseProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: StoragePool;
  systemFlags: ODFSystemFlagsPayload['systemFlags'];
  storageCluster?: StorageClusterKind;
}>;

const DeleteStoragePoolModalBase: React.FC<DeleteStoragePoolModalBaseProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const {
    extraProps: { resource, systemFlags, storageCluster },
    isOpen,
    closeModal,
  } = props;
  const poolName = getName(resource);
  const poolNamespace = getNamespace(resource);

  const [state, dispatch] = React.useReducer(
    storagePoolReducer,
    blockPoolInitialState
  );
  const [scNames, setScNames] = React.useState<React.ReactNode>();
  const [inProgress, setProgress] = React.useState(false);

  const [scResources, scLoaded, scLoadError] =
    useK8sGet<ListKind<StorageClassResourceKind>>(StorageClassModel);
  const [pvcResources, pvcLoaded, pvcLoadError] = useK8sGet<
    ListKind<PersistentVolumeClaimKind>
  >(PersistentVolumeClaimModel);

  const isExternalSC = systemFlags[poolNamespace]?.isExternalMode;

  React.useEffect(() => {
    // restrict pool management for default pool and external cluster
    isExternalSC || isDefaultPool(resource)
      ? dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.NOTALLOWED,
        })
      : dispatch({
          type: StoragePoolActionType.SET_POOL_NAME,
          payload:
            resource.type === PoolType.FILESYSTEM
              ? resource.shortName
              : poolName,
        });
  }, [resource, isExternalSC, poolName]);

  React.useEffect(() => {
    if (scLoaded && pvcLoaded && state.poolStatus !== PoolProgress.NOTALLOWED) {
      const poolScNames: string[] = getScNamesUsingPool(
        scResources.items,
        resource
      );
      const pvcScNames: string[] = pvcResources.items?.map(getStorageClassName);

      // intersection of scNames and pvcScNames
      const usedScNames = poolScNames.filter((scName) =>
        pvcScNames.includes(scName)
      );

      if (usedScNames.length) {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.BOUNDED,
        });
        setScNames(toList(usedScNames));
      }
    }
  }, [
    resource,
    scResources,
    scLoaded,
    pvcResources,
    pvcLoaded,
    state.poolStatus,
    poolName,
    t,
  ]);

  const location = useLocation();
  const navigate = useNavigate();
  // Delete pool.
  const deletePool = () => {
    setProgress(true);
    let deleteRequest: () => Promise<K8sResourceCommon>;
    if (resource.type === PoolType.FILESYSTEM) {
      deleteRequest = deleteFsPoolRequest(state, storageCluster);
    } else {
      deleteRequest = () =>
        k8sDelete({
          model: CephBlockPoolModel,
          resource,
          requestInit: null,
          json: null,
        });
    }

    deleteRequest().then(() => {
      setProgress(false);
      closeModal();
      // Go to pool list page if pool is deleted.
      if (location.pathname.includes(poolName)) {
        navigate(location.pathname.split(`/${poolName}`)[0]);
      }
    });
  };

  const MODAL_TITLE = (
    <ModalHeader>
      <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
      {t('Delete Storage Pool')}
    </ModalHeader>
  );

  const isLoaded = pvcLoaded && scLoaded;
  const loadError = pvcLoadError || scLoadError;

  return (
    <Modal
      isOpen={isOpen}
      header={MODAL_TITLE}
      variant={ModalVariant.small}
      onClose={closeModal}
    >
      {isLoaded && !loadError ? (
        <>
          <ModalBody>
            {state.poolStatus === PoolProgress.NOTALLOWED ? (
              <div key="progress-modal">
                <StoragePoolStatus
                  status={state.poolStatus}
                  name={state.poolName}
                  error={state.errorMessage}
                />
              </div>
            ) : state.poolStatus === PoolProgress.BOUNDED ? (
              <div>
                <Trans t={t}>
                  <p data-test="pool-bound-message">
                    <strong>{{ poolName }}</strong> cannot be deleted. When a
                    pool is bounded to PVC it cannot be deleted. Please detach
                    all the resources from StorageClass(es):
                  </p>
                </Trans>
                <strong>
                  <ul data-test="pool-storage-classes">{scNames}</ul>
                </strong>
              </div>
            ) : (
              <Trans t={t}>
                <p>
                  Deleting <strong>{{ poolName }}</strong> will remove all the
                  saved data of this pool. Are you sure want to delete?
                </p>
              </Trans>
            )}
          </ModalBody>
          <ModalFooter inProgress={inProgress}>
            <StoragePoolModalFooter
              state={state}
              dispatch={dispatch}
              onSubmit={deletePool}
              cancel={closeModal}
              close={closeModal}
              primaryAction={FooterPrimaryActions(t).DELETE}
            />
          </ModalFooter>
        </>
      ) : (
        <StatusBox
          loaded={isLoaded}
          loadError={loadError}
          label={t('Storage pool delete modal')}
        />
      )}
    </Modal>
  );
};

export default DeleteStoragePoolModal;

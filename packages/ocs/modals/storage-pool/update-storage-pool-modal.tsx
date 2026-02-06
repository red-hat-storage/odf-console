import * as React from 'react';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { ODFSystemFlagsPayload } from '@odf/core/redux/actions';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { StoragePoolDefinitionText } from '@odf/ocs/storage-pool/CreateStoragePool';
import { CephBlockPoolModel } from '@odf/shared';
import { ModalFooter, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { StatusBox } from '@odf/shared/generic/status-box';
import { CommonModalProps, ModalBody } from '@odf/shared/modals/Modal';
import { CephClusterModel, StorageClusterModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { CephClusterKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sModel,
  K8sResourceCommon,
  Patch,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import {
  ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH,
  COMPRESSION_ON,
  PoolProgress,
  PoolType,
} from '../../constants';
import { StoragePoolBody, StoragePoolStatus } from '../../storage-pool/body';
import {
  StoragePoolActionType,
  StoragePoolState,
  blockPoolInitialState,
  storagePoolReducer,
} from '../../storage-pool/reducer';
import { StoragePool } from '../../types';
import { getFsPoolIndex, isDefaultPool } from '../../utils';
import { StoragePoolModalFooter, FooterPrimaryActions } from './modal-footer';
import './storage-pool-modal.scss';

const updateFsPoolRequest = (
  state: StoragePoolState,
  storageCluster: StorageClusterKind
) => {
  const poolIndex = getFsPoolIndex(storageCluster, state.poolName);

  const patches: Patch[] = [
    {
      op: 'replace',
      path: `${ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH}/${poolIndex}/replicated/size`,
      value: Number(state.replicaSize),
    },
    {
      op: 'replace',
      path: `${ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH}/${poolIndex}/compressionMode`,
      value: state.isCompressed ? COMPRESSION_ON : 'none',
    },
  ];

  return () =>
    k8sPatch({
      model: StorageClusterModel,
      resource: storageCluster,
      data: patches,
    });
};

const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

type UpdateStoragePoolModalProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: StoragePool;
}>;

const UpdateStoragePoolModal: React.FC<UpdateStoragePoolModalProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const newProps = _.cloneDeep(props);
  newProps.extraProps['systemFlags'] = systemFlags;

  if (areFlagsLoaded && !flagsLoadError) {
    return props?.extraProps?.resource?.type === PoolType.FILESYSTEM ? (
      <UpdateFsPoolModal {...(newProps as UpdateFsPoolModalProps)} />
    ) : (
      <UpdateStoragePoolModalBase
        {...(newProps as UpdateStoragePoolModalBaseProps)}
      />
    );
  }
  return (
    <StatusBox
      loaded={areFlagsLoaded}
      loadError={flagsLoadError}
      label={t('Storage pool update form')}
    />
  );
};

type UpdateFsPoolModalProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: StoragePool;
  systemFlags: ODFSystemFlagsPayload['systemFlags'];
}>;

const UpdateFsPoolModal: React.FC<UpdateFsPoolModalProps> = (props) => {
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
    return <UpdateStoragePoolModalBase {...newProps} />;
  }
  return (
    <StatusBox
      loaded={storageClusterLoaded}
      loadError={storageClusterLoadError}
      label={t('Storage pool update form')}
    />
  );
};

type UpdateStoragePoolModalBaseProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: StoragePool;
  systemFlags: ODFSystemFlagsPayload['systemFlags'];
  storageCluster?: StorageClusterKind;
}>;

const UpdateStoragePoolModalBase: React.FC<UpdateStoragePoolModalBaseProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const {
    extraProps: { resource, systemFlags, storageCluster },
    closeModal,
    isOpen,
  } = props;
  const poolNamespace = getNamespace(resource);

  const [state, dispatch] = React.useReducer(
    storagePoolReducer,
    blockPoolInitialState
  );
  const [inProgress, setProgress] = React.useState(false);
  const [cephClusters, cephClustersLoaded, cephClustersLoadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  // only single cluster per Namespace
  const cephCluster = getCephClusterInNs(
    cephClusters,
    poolNamespace
  ) as CephClusterKind;

  const MODAL_TITLE = t('Edit Storage Pool');

  const populateStoragePoolData = React.useCallback(
    (pool: StoragePool) => {
      dispatch({
        type: StoragePoolActionType.SET_POOL_NAME,
        payload:
          pool.type === PoolType.FILESYSTEM ? pool.shortName : getName(pool),
      });
      dispatch({
        type: StoragePoolActionType.SET_POOL_REPLICA_SIZE,
        payload: pool?.spec.replicated.size.toString(),
      });
      dispatch({
        type: StoragePoolActionType.SET_POOL_COMPRESSED,
        payload: pool?.spec.compressionMode === COMPRESSION_ON,
      });
    },
    [dispatch]
  );

  const isExternalSC = systemFlags[poolNamespace]?.isExternalMode;

  React.useEffect(() => {
    // restrict pool management for default pool and external cluster
    isExternalSC || isDefaultPool(resource)
      ? dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.NOTALLOWED,
        })
      : populateStoragePoolData(resource);
  }, [resource, isExternalSC, populateStoragePoolData]);

  // Update block pool
  const updatePool = () => {
    setProgress(true);
    let updateRequest: () => Promise<K8sResourceCommon>;
    if (resource.type === PoolType.FILESYSTEM) {
      updateRequest = updateFsPoolRequest(state, storageCluster);
    } else {
      updateRequest = () => {
        const patch = [
          {
            op: 'replace',
            path: '/spec/replicated/size',
            value: Number(state.replicaSize),
          },
          {
            op: 'replace',
            path: '/spec/compressionMode',
            value: state.isCompressed ? COMPRESSION_ON : 'none',
          },
          {
            op: 'replace',
            path: '/spec/parameters/compression_mode',
            value: state.isCompressed ? COMPRESSION_ON : 'none',
          },
        ];
        return k8sPatch({
          model: CephBlockPoolModel,
          resource,
          data: patch,
        });
      };
    }

    updateRequest().then(() => {
      setProgress(false);
      closeModal();
    });
  };

  return (
    <Modal
      className="modal-content storage-pool__modal"
      isOpen={isOpen}
      header={
        <>
          <ModalTitle>{MODAL_TITLE}</ModalTitle>
          <StoragePoolDefinitionText className="pf-v5-u-ml-xl" />
        </>
      }
      variant={ModalVariant.medium}
      onClose={closeModal}
    >
      {cephClustersLoaded && !cephClustersLoadError ? (
        <>
          <ModalBody>
            {state.poolStatus ? (
              <div key="progress-modal">
                <StoragePoolStatus
                  status={state.poolStatus}
                  name={state.poolName}
                  error={state.errorMessage}
                />
              </div>
            ) : (
              <StoragePoolBody
                cephCluster={cephCluster}
                state={state}
                dispatch={dispatch}
                showPoolStatus
                poolType={resource.type}
                disablePoolType
                isUpdate
                prefixName={PoolType.FILESYSTEM && resource.fsName}
              />
            )}
          </ModalBody>
          <ModalFooter inProgress={inProgress}>
            <StoragePoolModalFooter
              state={state}
              dispatch={dispatch}
              onSubmit={updatePool}
              cancel={closeModal}
              close={closeModal}
              primaryAction={FooterPrimaryActions(t).UPDATE}
            />
          </ModalFooter>
        </>
      ) : (
        <StatusBox
          loadError={cephClustersLoadError}
          loaded={cephClustersLoaded}
          label={t('Storage pool update form')}
        />
      )}
    </Modal>
  );
};

export default UpdateStoragePoolModal;

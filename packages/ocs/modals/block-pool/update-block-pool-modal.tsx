import * as React from 'react';
import { ModalFooter } from '@odf/shared/generic/ModalTitle';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { CommonModalProps, ModalBody } from '@odf/shared/modals/Modal';
import { CephClusterKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sKind,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { BlockPoolBody, BlockPoolStatus } from '../../block-pool/body';
import {
  BlockPoolActionType,
  blockPoolInitialState,
  blockPoolReducer,
} from '../../block-pool/reducer';
import {
  CEPH_EXTERNAL_CR_NAME,
  COMPRESSION_ON,
  POOL_PROGRESS,
} from '../../constants';
import { CephBlockPoolModel, CephClusterModel } from '../../models';
import { StoragePoolKind } from '../../types';
import { isDefaultPool } from '../../utils';
import { BlockPoolModalFooter, FooterPrimaryActions } from './modal-footer';

type UpdateBlockPoolModalProps = CommonModalProps<{
  kindObj?: K8sKind;
  resource: StoragePoolKind;
}>;

const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
};

const UpdateBlockPoolModal: React.FC<UpdateBlockPoolModalProps> = (props) => {
  const { t } = useTranslation();
  const {
    extraProps: { resource },
    closeModal,
    isOpen,
  } = props;

  const [state, dispatch] = React.useReducer(
    blockPoolReducer,
    blockPoolInitialState
  );
  const [inProgress, setProgress] = React.useState(false);
  const [cephClusters, isLoaded, loadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);
  const cephCluster: CephClusterKind = useDeepCompareMemoize(
    cephClusters[0],
    true
  );

  const MODAL_TITLE = t('Edit BlockPool');
  const MODAL_DESC = t(
    'A BlockPool is a logical entity providing elastic capacity to applications and workloads. Pools provide a means of supporting policies for access data resilience and storage efficiency.'
  );

  const populateBlockPoolData = React.useCallback(
    (poolConfig: StoragePoolKind) => {
      dispatch({
        type: BlockPoolActionType.SET_POOL_NAME,
        payload: poolConfig?.metadata.name,
      });
      dispatch({
        type: BlockPoolActionType.SET_POOL_REPLICA_SIZE,
        payload: poolConfig?.spec.replicated.size.toString(),
      });
      dispatch({
        type: BlockPoolActionType.SET_POOL_COMPRESSED,
        payload: poolConfig?.spec.compressionMode === COMPRESSION_ON,
      });
      // Already existing pool may not have any deviceClass, Default is SSD
      poolConfig?.spec.deviceClass &&
        dispatch({
          type: BlockPoolActionType.SET_POOL_VOLUME_TYPE,
          payload: poolConfig?.spec.deviceClass,
        });
    },
    [dispatch]
  );

  React.useEffect(() => {
    // restrict pool management for default pool and external cluster
    cephCluster?.metadata.name === CEPH_EXTERNAL_CR_NAME ||
    isDefaultPool(resource)
      ? dispatch({
          type: BlockPoolActionType.SET_POOL_STATUS,
          payload: POOL_PROGRESS.NOTALLOWED,
        })
      : populateBlockPoolData(resource);
  }, [resource, cephCluster, populateBlockPoolData]);

  // Update block pool
  const updatePool = () => {
    setProgress(true);
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

    k8sPatch({
      model: CephBlockPoolModel,
      resource,
      data: patch,
    }).then(() => {
      setProgress(false);
      closeModal();
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      title={MODAL_TITLE}
      variant={ModalVariant.small}
      onClose={closeModal}
    >
      {isLoaded && !loadError ? (
        <>
          <ModalBody>
            <p>{MODAL_DESC}</p>
            {state.poolStatus ? (
              <div key="progress-modal">
                <BlockPoolStatus
                  status={state.poolStatus}
                  name={state.poolName}
                  error={state.errorMessage}
                />
              </div>
            ) : (
              <BlockPoolBody
                cephCluster={cephCluster}
                state={state}
                dispatch={dispatch}
                showPoolStatus
                isUpdate
              />
            )}
          </ModalBody>
          <ModalFooter inProgress={inProgress}>
            <BlockPoolModalFooter
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
          loadError={loadError}
          loaded={isLoaded}
          label={t('BlockPool Update Form')}
        />
      )}
    </Modal>
  );
};

export default UpdateBlockPoolModal;

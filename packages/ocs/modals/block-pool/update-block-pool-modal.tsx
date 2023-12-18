import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { ModalFooter } from '@odf/shared/generic/ModalTitle';
import { StatusBox } from '@odf/shared/generic/status-box';
import { CommonModalProps, ModalBody } from '@odf/shared/modals/Modal';
import { getNamespace } from '@odf/shared/selectors';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sKind,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { BlockPoolBody, BlockPoolStatus } from '../../block-pool/body';
import {
  BlockPoolActionType,
  blockPoolInitialState,
  blockPoolReducer,
} from '../../block-pool/reducer';
import { COMPRESSION_ON, POOL_PROGRESS } from '../../constants';
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
  isList: true,
};

const UpdateBlockPoolModal: React.FC<UpdateBlockPoolModalProps> = (props) => {
  const { t } = useCustomTranslation();
  const {
    extraProps: { resource },
    closeModal,
    isOpen,
  } = props;
  const poolNamespace = getNamespace(resource);

  const [state, dispatch] = React.useReducer(
    blockPoolReducer,
    blockPoolInitialState
  );
  const [inProgress, setProgress] = React.useState(false);
  const [cephClusters, isLoaded, loadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  // only single cluster per Namespace
  const cephCluster = getCephClusterInNs(
    cephClusters,
    poolNamespace
  ) as CephClusterKind;

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
    },
    [dispatch]
  );

  const { systemFlags } = useODFSystemFlagsSelector();
  const isExternalSC = systemFlags[poolNamespace]?.isExternalMode;

  React.useEffect(() => {
    // restrict pool management for default pool and external cluster
    isExternalSC || isDefaultPool(resource)
      ? dispatch({
          type: BlockPoolActionType.SET_POOL_STATUS,
          payload: POOL_PROGRESS.NOTALLOWED,
        })
      : populateBlockPoolData(resource);
  }, [resource, isExternalSC, populateBlockPoolData]);

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

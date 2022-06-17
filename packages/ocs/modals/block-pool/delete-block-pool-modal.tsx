import * as React from 'react';
import { ModalFooter } from '@odf/shared/generic/ModalTitle';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import {
  PersistentVolumeClaimModel,
  StorageClassModel,
} from '@odf/shared/models';
import {
  ListKind,
  PersistentVolumeClaimKind,
  StorageClassResourceKind,
  CephClusterKind,
} from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  k8sDelete,
  K8sKind,
  useK8sWatchResource,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { getScNamesUsingPool, isDefaultPool } from '../..//utils';
import { BlockPoolStatus } from '../../block-pool/body';
import {
  BlockPoolActionType,
  blockPoolInitialState,
  blockPoolReducer,
} from '../../block-pool/reducer';
import { CEPH_EXTERNAL_CR_NAME, POOL_PROGRESS } from '../../constants';
import { CephBlockPoolModel, CephClusterModel } from '../../models';
import { StoragePoolKind } from '../../types';
import { getStorageClassName } from '../../utils/common';
import { BlockPoolModalFooter, FooterPrimaryActions } from './modal-footer';

const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
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

const DeleteBlockPoolModal: React.FC<DeleteBlockPoolModalProps> = (props) => {
  const { t } = useTranslation();
  const {
    extraProps: { resource },
    isOpen,
    closeModal,
  } = props;
  const poolName = resource?.metadata.name;

  const [state, dispatch] = React.useReducer(
    blockPoolReducer,
    blockPoolInitialState
  );
  const [scNames, setScNames] = React.useState<React.ReactNode>();
  const [inProgress, setProgress] = React.useState(false);

  const [cephClusters, isLoaded, loadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);
  const [scResources, scLoaded, scLoadError] =
    useK8sGet<ListKind<StorageClassResourceKind>>(StorageClassModel);
  const [pvcResources, pvcLoaded, pvcLoadError] = useK8sGet<
    ListKind<PersistentVolumeClaimKind>
  >(PersistentVolumeClaimModel);
  const cephCluster: CephClusterKind = useDeepCompareMemoize(
    cephClusters[0],
    true
  );

  React.useEffect(() => {
    // restrict pool management for default pool and external cluster
    cephCluster?.metadata.name === CEPH_EXTERNAL_CR_NAME ||
    isDefaultPool(resource)
      ? dispatch({
          type: BlockPoolActionType.SET_POOL_STATUS,
          payload: POOL_PROGRESS.NOTALLOWED,
        })
      : dispatch({
          type: BlockPoolActionType.SET_POOL_NAME,
          payload: poolName,
        });
  }, [resource, cephCluster, isLoaded, loadError, poolName]);

  React.useEffect(() => {
    if (
      scLoaded &&
      pvcLoaded &&
      state.poolStatus !== POOL_PROGRESS.NOTALLOWED
    ) {
      const poolScNames: string[] = getScNamesUsingPool(
        scResources.items,
        poolName
      );
      const pvcScNames: string[] = pvcResources.items?.map(getStorageClassName);

      // intersection of scNames and pvcScNames
      const usedScNames = poolScNames.filter((scName) =>
        pvcScNames.includes(scName)
      );

      if (usedScNames.length) {
        dispatch({
          type: BlockPoolActionType.SET_POOL_STATUS,
          payload: POOL_PROGRESS.BOUNDED,
        });
        setScNames(toList(usedScNames));
      }
    }
  }, [
    scResources,
    scLoaded,
    pvcResources,
    pvcLoaded,
    state.poolStatus,
    poolName,
    t,
  ]);

  const location = useLocation();
  const history = useHistory();
  // Delete block pool
  const deletePool = () => {
    setProgress(true);
    k8sDelete({
      model: CephBlockPoolModel,
      resource,
      requestInit: null,
      json: null,
    }).then(() => {
      setProgress(false);
      closeModal();
      // Go to block pool list page if pool is deleted
      if (location.pathname.includes(poolName)) {
        history.push(location.pathname.split(`/${poolName}`)[0]);
      }
    });
  };

  const MODAL_TITLE = (
    <ModalHeader>
      <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
      {t('Delete BlockPool')}
    </ModalHeader>
  );

  return (
    <Modal
      isOpen={isOpen}
      header={MODAL_TITLE}
      variant={ModalVariant.small}
      onClose={closeModal}
    >
      {isLoaded &&
      pvcLoaded &&
      scLoaded &&
      !(loadError && pvcLoadError && scLoadError) ? (
        <>
          <ModalBody>
            {state.poolStatus === POOL_PROGRESS.NOTALLOWED ? (
              <div key="progress-modal">
                <BlockPoolStatus
                  status={state.poolStatus}
                  name={state.poolName}
                  error={state.errorMessage}
                />
              </div>
            ) : state.poolStatus === POOL_PROGRESS.BOUNDED ? (
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
            <BlockPoolModalFooter
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
          loaded={isLoaded && pvcLoaded && scLoaded}
          loadError={loadError ?? pvcLoadError ?? scLoadError}
          label={t('BlockPool Delete Modal')}
        />
      )}
    </Modal>
  );
};

type DeleteBlockPoolModalProps = CommonModalProps<{
  kindObj?: K8sKind;
  resource: StoragePoolKind;
}>;

export default DeleteBlockPoolModal;

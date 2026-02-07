import * as React from 'react';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { CephBlockPoolModel } from '@odf/shared';
import { ONE_SECOND } from '@odf/shared/constants';
import { StatusBox } from '@odf/shared/generic';
import { ModalTitle, ModalFooter } from '@odf/shared/generic/ModalTitle';
import {
  HandlePromiseProps,
  withHandlePromise,
} from '@odf/shared/generic/promise-component';
import { ModalBody } from '@odf/shared/modals/Modal';
import { StorageClusterModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import { CephClusterKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getValidWatchK8sResourceObj,
  referenceForModel,
} from '@odf/shared/utils';
import {
  K8sResourceCommon,
  K8sResourceKind,
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { PoolState, PoolProgress, PoolType } from '../../constants';
import { StoragePoolStatus, StoragePoolBody } from '../../storage-pool/body';
import {
  StoragePoolDefinitionText,
  createFsPoolRequest,
  getPoolKindObj,
  poolResource,
} from '../../storage-pool/CreateStoragePool';
import {
  StoragePoolActionType,
  blockPoolInitialState,
  storagePoolReducer,
} from '../../storage-pool/reducer';
import { StoragePoolKind } from '../../types';
import { StoragePoolModalFooter, FooterPrimaryActions } from './modal-footer';
import './storage-pool-modal.scss';

export const CreateStoragePoolModal = withHandlePromise(
  (props: CreateStoragePoolModalProps) => {
    const {
      cephCluster,
      onPoolCreation,
      handlePromise,
      errorMessage,
      defaultDeviceClass,
      poolType,
      existingNames,
      filesystemName,
    } = props;
    const { t } = useCustomTranslation();
    const { systemFlags, areFlagsLoaded, flagsLoadError } =
      useODFSystemFlagsSelector();
    const poolNs = getNamespace(cephCluster);
    const clusterName = systemFlags[poolNs]?.ocsClusterName;
    const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
      useSafeK8sGet<StorageClusterKind>(
        StorageClusterModel,
        clusterName,
        poolNs
      );

    const [state, dispatch] = React.useReducer(
      storagePoolReducer,
      blockPoolInitialState
    );
    const [isSubmit, setIsSubmit] = React.useState(false);
    const [timer, setTimer] = React.useState<NodeJS.Timer>(null);

    const poolName = state.poolName;

    const MODAL_TITLE = t('Create Storage Pool');

    // Watch newly created pool (or CR owner for cephfs) after submit
    const initResource =
      poolType === PoolType.FILESYSTEM
        ? {
            kind: referenceForModel(StorageClusterModel),
            namespaced: true,
            isList: false,
            name: clusterName,
            namespace: poolNs,
          }
        : poolResource(poolName, poolNs);

    const [resource, resourceLoaded, resourceLoadError] =
      useK8sWatchResource<K8sResourceKind>(
        getValidWatchK8sResourceObj(initResource, isSubmit && !!poolName)
      );

    const runPostCreationActions = React.useCallback(() => {
      if (
        resource &&
        resourceLoaded &&
        resource?.status?.phase === PoolState.READY
      ) {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.CREATED,
        });
        setIsSubmit(false);
        clearTimeout(timer);
        onPoolCreation(
          poolType === PoolType.FILESYSTEM
            ? `${filesystemName}-${poolName}`
            : poolName
        );
      } else if (
        resourceLoaded &&
        (resource?.status?.phase === PoolState.RECONCILE_FAILED ||
          resource?.status?.phase === PoolState.FAILURE)
      ) {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.NOTREADY,
        });
        setIsSubmit(false);
        clearTimeout(timer);
      } else if (
        resourceLoaded &&
        resourceLoadError &&
        resourceLoadError?.response?.status !== 404
      ) {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.FAILED,
        });
        setIsSubmit(false);
        clearTimeout(timer);
      }
    }, [
      filesystemName,
      onPoolCreation,
      poolName,
      poolType,
      resource,
      resourceLoadError,
      resourceLoaded,
      timer,
    ]);

    React.useEffect(() => {
      if (isSubmit) {
        runPostCreationActions();
      }
    }, [isSubmit, runPostCreationActions]);

    // Create new pool
    const createPool = () => {
      if (state.poolStatus === '') {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: PoolProgress.PROGRESS,
        });
        let createRequest: () => Promise<K8sResourceCommon>;
        if (poolType === PoolType.FILESYSTEM) {
          createRequest = createFsPoolRequest(state, storageCluster);
        } else {
          const poolObj: StoragePoolKind = getPoolKindObj(
            state,
            poolNs,
            defaultDeviceClass
          );
          createRequest = () =>
            k8sCreate({ model: CephBlockPoolModel, data: poolObj });
        }

        handlePromise(
          createRequest(),
          () => {
            setIsSubmit(true);
            // The modal will wait in order to get feedback from Rook
            const timeoutTimer = setTimeout(() => {
              dispatch({
                type: StoragePoolActionType.SET_POOL_STATUS,
                payload: PoolProgress.TIMEOUT,
              });
              setIsSubmit(false);
            }, 30 * ONE_SECOND);
            setTimer(timeoutTimer);
          },
          () => {
            dispatch({
              type: StoragePoolActionType.SET_POOL_STATUS,
              payload: PoolProgress.FAILED,
            });
          }
        );
      }
    };

    const isLoaded = storageClusterLoaded && areFlagsLoaded;
    const isLoadError = storageClusterLoadError || flagsLoadError;

    if (isLoaded && !isLoadError) {
      return (
        <Modal
          isOpen
          onClose={props.closeModal}
          className="modal-content storage-pool__modal"
          variant={ModalVariant.medium}
          header={
            <>
              <ModalTitle>{MODAL_TITLE}</ModalTitle>
              <StoragePoolDefinitionText className="pf-v5-u-ml-xl" />
            </>
          }
        >
          <ModalBody>
            {state.poolStatus ? (
              <div key="progress-modal">
                <StoragePoolStatus
                  status={state.poolStatus}
                  name={poolName}
                  error={errorMessage}
                />
              </div>
            ) : (
              <StoragePoolBody
                cephCluster={cephCluster}
                state={state}
                dispatch={dispatch}
                showPoolStatus
                poolType={poolType}
                existingNames={existingNames}
                disablePoolType
                prefixName={filesystemName}
              />
            )}
          </ModalBody>
          <ModalFooter inProgress={state.poolStatus === PoolProgress.PROGRESS}>
            <StoragePoolModalFooter
              state={state}
              dispatch={dispatch}
              onSubmit={createPool}
              cancel={props.closeModal}
              close={props.closeModal}
              primaryAction={FooterPrimaryActions(t).CREATE}
            />
          </ModalFooter>
        </Modal>
      );
    }
    return <StatusBox loaded={isLoaded} loadError={isLoadError} />;
  }
);

export type CreateStoragePoolModalProps = {
  cephCluster?: CephClusterKind;
  onPoolCreation: (name: string) => void;
  defaultDeviceClass: string;
  poolType: PoolType;
  existingNames: string[];
  filesystemName?: string;
} & React.ComponentProps<ModalComponent> &
  HandlePromiseProps;

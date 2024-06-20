import * as React from 'react';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { ONE_SECOND } from '@odf/shared/constants';
import { StatusBox } from '@odf/shared/generic';
import { ModalTitle, ModalFooter } from '@odf/shared/generic/ModalTitle';
import {
  HandlePromiseProps,
  withHandlePromise,
} from '@odf/shared/generic/promise-component';
import { ModalBody } from '@odf/shared/modals/Modal';
import { OCSStorageClusterModel } from '@odf/shared/models';
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
import { Modal, ModalVariant } from '@patternfly/react-core';
import { POOL_STATE, POOL_PROGRESS, POOL_TYPE } from '../../constants';
import { CephBlockPoolModel } from '../../models';
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
        OCSStorageClusterModel,
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
      poolType === POOL_TYPE.FILESYSTEM
        ? {
            kind: referenceForModel(OCSStorageClusterModel),
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
        resource?.status?.phase === POOL_STATE.READY
      ) {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: POOL_PROGRESS.CREATED,
        });
        setIsSubmit(false);
        clearTimeout(timer);
        onPoolCreation(
          poolType === POOL_TYPE.FILESYSTEM
            ? `${filesystemName}-${poolName}`
            : poolName
        );
      } else if (
        resourceLoaded &&
        (resource?.status?.phase === POOL_STATE.RECONCILE_FAILED ||
          resource?.status?.phase === POOL_STATE.FAILURE)
      ) {
        dispatch({
          type: StoragePoolActionType.SET_POOL_STATUS,
          payload: POOL_PROGRESS.NOTREADY,
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
          payload: POOL_PROGRESS.FAILED,
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
          payload: POOL_PROGRESS.PROGRESS,
        });
        let createRequest: () => Promise<K8sResourceCommon>;
        if (poolType === POOL_TYPE.FILESYSTEM) {
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
                payload: POOL_PROGRESS.TIMEOUT,
              });
              setIsSubmit(false);
            }, 30 * ONE_SECOND);
            setTimer(timeoutTimer);
          },
          () => {
            dispatch({
              type: StoragePoolActionType.SET_POOL_STATUS,
              payload: POOL_PROGRESS.FAILED,
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
          header={<ModalTitle>{MODAL_TITLE}</ModalTitle>}
        >
          <ModalBody>
            <StoragePoolDefinitionText className="storage-pool__definition-text" />
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
                fsName={filesystemName}
              />
            )}
          </ModalBody>
          <ModalFooter inProgress={state.poolStatus === POOL_PROGRESS.PROGRESS}>
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
  poolType: POOL_TYPE;
  existingNames: string[];
  filesystemName?: string;
} & React.ComponentProps<ModalComponent> &
  HandlePromiseProps;

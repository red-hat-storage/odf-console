import * as React from 'react';
import { useSafeK8sGet, useSafeK8sList } from '@odf/core/hooks';
import { cephClusterResource } from '@odf/core/resources';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { PoolType } from '@odf/ocs/constants';
import { CephBlockPoolModel, CephFileSystemModel } from '@odf/ocs/models';
import { StoragePoolBody } from '@odf/ocs/storage-pool/body';
import { CephFilesystemKind, StoragePoolKind } from '@odf/ocs/types';
import {
  getExistingBlockPoolNames,
  getExistingFsPoolNames,
} from '@odf/ocs/utils';
import { CephClusterKind, StatusBox } from '@odf/shared';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import {
  AttachStorageAction,
  AttachStorageActionType,
  AttachStorageFormState,
} from './state';

type StoragePoolFormProps = {
  state: AttachStorageFormState;
  dispatch: React.Dispatch<AttachStorageAction>;
  clusterName: string;
};
const StoragePoolForm: React.FC<StoragePoolFormProps> = ({
  state,
  dispatch,
  clusterName,
}) => {
  const { t } = useTranslation();
  const { namespace } = useParams();

  const [cephClusters, cephClustersLoaded, cephClustersLoadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  const cephCluster = getCephClusterInNs(
    cephClusters,
    namespace
  ) as CephClusterKind;

  const fsName = `${clusterName}-cephfilesystem`;

  const [fsData, fsDataLoaded, fsDataLoadError] =
    useSafeK8sGet<CephFilesystemKind>(CephFileSystemModel, fsName, namespace);

  const fsExistingNames = React.useMemo(
    () => getExistingFsPoolNames(fsData),
    [fsData]
  );

  const [blockPools, blockPoolsLoaded, blockPoolsLoadError] =
    useSafeK8sList<StoragePoolKind>(CephBlockPoolModel);

  const blockExistingNames = React.useMemo(() => {
    let blockPoolNames = [];
    if (blockPoolsLoaded && !blockPoolsLoadError) {
      blockPoolNames = getExistingBlockPoolNames(blockPools);
    }
    return blockPoolNames;
  }, [blockPools, blockPoolsLoaded, blockPoolsLoadError]);

  const existingNames =
    state.poolType === PoolType.FILESYSTEM
      ? fsExistingNames
      : blockExistingNames;

  const onPoolTypeChange = React.useCallback(
    (newPoolType: PoolType) => {
      dispatch({
        type: AttachStorageActionType.SET_POOL_TYPE,
        payload: newPoolType,
      });
    },
    [dispatch]
  );

  const isLoaded = fsDataLoaded && cephClustersLoaded && blockPoolsLoaded;
  const isLoadError =
    fsDataLoadError || cephClustersLoadError || blockPoolsLoadError;

  return (
    <div className="create-storage-pool__form">
      {!isLoaded || isLoadError ? (
        <StatusBox
          loaded={isLoaded}
          loadError={isLoadError}
          label={t('Storage pool creation form')}
        />
      ) : (
        <StoragePoolBody
          cephCluster={cephCluster}
          state={state}
          dispatch={dispatch}
          showPoolStatus={false}
          poolType={state.poolType}
          existingNames={existingNames}
          onPoolTypeChange={onPoolTypeChange}
          prefixName={
            state.poolType === PoolType.FILESYSTEM
              ? fsName
              : `${clusterName}-cephblockpool`
          }
          usePrefix={state.poolType !== PoolType.FILESYSTEM}
          placeholder={state.lsoStorageClassName}
        />
      )}
    </div>
  );
};

export default StoragePoolForm;

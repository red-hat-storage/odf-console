import * as React from 'react';
import { ERASURE_CODING_BLOCK_METADATA_POOL_NAME } from '@odf/core/constants';
import { useSafeK8sGet, useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { CephBlockPoolModel, CephFileSystemModel } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import { CephClusterModel, StorageClusterModel } from '@odf/shared/models';
import {
  CephClusterKind,
  DataPool,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  Patch,
  WatchK8sResource,
  getAPIVersionForModel,
  k8sCreate,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal } from '@patternfly/react-core/deprecated';
import { useParams, useNavigate } from 'react-router-dom-v5-compat';
import { Button, Content, ContentVariants } from '@patternfly/react-core';
import {
  ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH,
  COMPRESSION_ON,
  PoolState,
  PoolType,
} from '../constants';
import { useCephBlockPools } from '../hooks';
import { CephFilesystemKind, StoragePoolKind } from '../types';
import { getErrorMessage, getExistingFsPoolNames } from '../utils';
import { StoragePoolBody } from './body';
import { StoragePoolFooter } from './footer';
import {
  DataProtectionPolicy,
  StoragePoolActionType,
  blockPoolInitialState,
  storagePoolReducer,
  StoragePoolState,
} from './reducer';
import './create-storage-pool.scss';
import '../style.scss';

export const createFsPoolRequest = (
  state: StoragePoolState,
  storageCluster: StorageClusterKind
) => {
  const isErasureCoding =
    state.dataProtectionPolicy === DataProtectionPolicy.ErasureCoding &&
    state.erasureCodingSchema != null;
  const patchPool: DataPool = {
    name: state.poolName,
    compressionMode: state.isCompressed ? COMPRESSION_ON : 'none',
    ...(isErasureCoding
      ? {
          erasureCoded: {
            dataChunks: state.erasureCodingSchema!.k,
            codingChunks: state.erasureCodingSchema!.m,
          },
        }
      : {
          replicated: { size: Number(state.replicaSize) },
        }),
  };
  const patch: Patch = storageCluster?.spec?.managedResources?.cephFilesystems
    ?.additionalDataPools
    ? {
        op: 'add',
        path: `${ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH}/-`,
        value: patchPool,
      }
    : {
        op: 'add',
        path: ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH,
        value: [patchPool],
      };

  return () =>
    k8sPatch({
      model: StorageClusterModel,
      resource: storageCluster,
      data: [patch],
    });
};

export const getPoolKindObj = (
  state: StoragePoolState,
  ns: string,
  deviceClass: StoragePoolKind['spec']['deviceClass']
): StoragePoolKind => {
  const isErasureCoding =
    state.dataProtectionPolicy === DataProtectionPolicy.ErasureCoding &&
    state.erasureCodingSchema != null;
  return {
    apiVersion: getAPIVersionForModel(CephBlockPoolModel),
    kind: CephBlockPoolModel.kind,
    metadata: {
      name: state.poolName,
      namespace: ns,
    },
    spec: {
      compressionMode: state.isCompressed ? COMPRESSION_ON : 'none',
      // without explicit "true" Rook will not allow updating CRUSH Rules ("deviceClass" will not be set)
      enableCrushUpdates: true,
      deviceClass: deviceClass,
      parameters: {
        compression_mode: state.isCompressed ? COMPRESSION_ON : 'none',
      },
      ...(isErasureCoding
        ? {
            erasureCoded: {
              dataChunks: state.erasureCodingSchema!.k,
              codingChunks: state.erasureCodingSchema!.m,
            },
          }
        : {
            failureDomain: state.failureDomain,
            replicated: {
              size: Number(state.replicaSize),
            },
          }),
    },
  };
};

export const ensureErasureCodedMetadataPoolRef = (
  storageCluster: StorageClusterKind
): Promise<K8sResourceCommon> => {
  const mr = storageCluster.spec?.managedResources;
  const cephBlockPools = mr?.cephBlockPools;
  if ((cephBlockPools?.erasureCodedMetadataPool?.trim() ?? '') !== '') {
    return Promise.resolve(storageCluster as K8sResourceCommon);
  }

  const metadataPoolPath =
    '/spec/managedResources/cephBlockPools/erasureCodedMetadataPool';
  const patches: Patch[] =
    mr == null
      ? [
          {
            op: 'add',
            path: '/spec/managedResources',
            value: {
              cephBlockPools: {
                erasureCodedMetadataPool:
                  ERASURE_CODING_BLOCK_METADATA_POOL_NAME,
              },
            },
          },
        ]
      : cephBlockPools == null
        ? [
            {
              op: 'add',
              path: '/spec/managedResources/cephBlockPools',
              value: {
                erasureCodedMetadataPool:
                  ERASURE_CODING_BLOCK_METADATA_POOL_NAME,
              },
            },
          ]
        : [
            {
              op: 'add',
              path: metadataPoolPath,
              value: ERASURE_CODING_BLOCK_METADATA_POOL_NAME,
            },
          ];

  return k8sPatch({
    model: StorageClusterModel,
    resource: storageCluster,
    data: patches,
  });
};

export const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

export const poolResource = (
  poolName: string,
  ns: string
): WatchK8sResource => ({
  kind: referenceForModel(CephBlockPoolModel),
  namespaced: true,
  isList: false,
  name: poolName,
  namespace: ns,
});

export const StoragePoolDefinitionText: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t } = useCustomTranslation();

  return (
    <p className={className}>
      {t(
        'A storage pool is a logical entity which provides capacity to applications and workloads. With pools you can support policies for data resiliency and storage efficiency.'
      )}
    </p>
  );
};

const CreateStoragePool: React.FC<{}> = ({}) => {
  const { t } = useCustomTranslation();
  const params = useParams();
  const poolNs = params?.namespace;

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const clusterName = systemFlags[poolNs]?.ocsClusterName;

  const isExternalStorageSystem = systemFlags[poolNs]?.isExternalMode;

  // We read pools from CephFilesystem as it's the only resource where the default pool appears
  // (unlike in StorageCluster CR).
  const fsName = `${clusterName}-cephfilesystem`;
  const [fsData, fsDataLoaded, fsDataLoadError] =
    useSafeK8sWatchResource<CephFilesystemKind>((ns) => ({
      isList: false,
      kind: referenceForModel(CephFileSystemModel),
      namespaced: true,
      namespace: ns,
      name: fsName,
    }));

  // Collect existing fs pool names to check against new pool name.
  const fsExistingNames = React.useMemo(
    () => getExistingFsPoolNames(fsData),
    [fsData]
  );

  const [cephClusters, cephClustersLoaded, cephClustersLoadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);
  // Only single cluster per Namespace.
  const cephCluster = getCephClusterInNs(
    cephClusters,
    poolNs
  ) as CephClusterKind;

  // Collect existing block pool names to check against new pool name.
  // Also get the block default deviceClass.
  const {
    existingBlockPoolNames,
    defaultDeviceClass,
    blockPoolsLoaded,
    blockPoolsLoadError,
  } = useCephBlockPools(clusterName, poolNs);

  const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
    useSafeK8sGet<StorageClusterKind>(StorageClusterModel, clusterName, poolNs);

  const isLoaded =
    areFlagsLoaded &&
    fsDataLoaded &&
    cephClustersLoaded &&
    storageClusterLoaded &&
    blockPoolsLoaded;
  const isLoadError =
    flagsLoadError ||
    fsDataLoadError ||
    cephClustersLoadError ||
    storageClusterLoadError ||
    blockPoolsLoadError;

  if (isLoaded && !isLoadError) {
    return (
      <CreateStoragePoolForm
        appName={params.appName}
        storageCluster={storageCluster}
        cephCluster={cephCluster}
        isExternalStorageSystem={isExternalStorageSystem}
        poolNs={poolNs}
        fsName={fsName}
        fsExistingNames={fsExistingNames}
        blockExistingNames={existingBlockPoolNames}
        defaultDeviceClass={defaultDeviceClass}
      />
    );
  }
  return (
    <StatusBox
      loaded={isLoaded}
      loadError={isLoadError}
      label={t('Storage pool creation form')}
    />
  );
};

type CreateStoragePoolFormProps = {
  appName: string;
  storageCluster: StorageClusterKind;
  cephCluster: CephClusterKind;
  isExternalStorageSystem: boolean;
  poolNs: string;
  fsName: string;
  fsExistingNames: string[];
  blockExistingNames: string[];
  defaultDeviceClass: string;
};

const CreateStoragePoolForm: React.FC<CreateStoragePoolFormProps> = ({
  storageCluster,
  cephCluster,
  isExternalStorageSystem,
  poolNs,
  fsName,
  fsExistingNames,
  blockExistingNames,
  defaultDeviceClass,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const [state, dispatch] = React.useReducer(
    storagePoolReducer,
    blockPoolInitialState
  );
  const [poolType, setPoolType] = React.useState<PoolType>(PoolType.FILESYSTEM);
  const onPoolTypeChange = React.useMemo(
    () => (newPoolType: PoolType) => setPoolType(newPoolType),
    [setPoolType]
  );
  const existingNames =
    poolType === PoolType.FILESYSTEM ? fsExistingNames : blockExistingNames;

  const blockPoolPageUrl = '/odf/storage-cluster/storage-pools';

  const onClose = () => {
    navigate(-1);
  };

  // Create new pool
  const createPool = () => {
    if (cephCluster?.status?.phase === PoolState.READY) {
      if (
        state.dataProtectionPolicy === DataProtectionPolicy.ErasureCoding &&
        !state.erasureCodingSchema
      ) {
        dispatch({
          type: StoragePoolActionType.SET_ERROR_MESSAGE,
          payload: t('Please select an erasure coding scheme.'),
        });
        return;
      }

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

      const runCreate = async () => {
        if (
          poolType === PoolType.BLOCK &&
          state.dataProtectionPolicy === DataProtectionPolicy.ErasureCoding
        ) {
          await ensureErasureCodedMetadataPoolRef(storageCluster);
        }
        return createRequest();
      };

      dispatch({ type: StoragePoolActionType.SET_INPROGRESS, payload: true });
      runCreate()
        .then(() =>
          poolType === PoolType.BLOCK
            ? navigate(
                `${blockPoolPageUrl}/${state.poolName}?namespace=${poolNs}`
              )
            : navigate(`${blockPoolPageUrl}`)
        )
        .finally(() =>
          dispatch({
            type: StoragePoolActionType.SET_INPROGRESS,
            payload: false,
          })
        )
        .catch((err) =>
          dispatch({
            type: StoragePoolActionType.SET_ERROR_MESSAGE,
            payload: getErrorMessage(err.message) || 'Could not create Pool.',
          })
        );
    } else
      dispatch({
        type: StoragePoolActionType.SET_ERROR_MESSAGE,
        payload: t(
          "Data Foundation's StorageCluster is not available. Try again after the StorageCluster is ready to use."
        ),
      });
  };

  if (isExternalStorageSystem) {
    return (
      <Modal
        title={t('Create storage pool')}
        titleIconVariant="warning"
        isOpen
        onClose={onClose}
        variant="small"
        actions={[
          <Button key="confirm" variant="primary" onClick={onClose}>
            {t('Close')}
          </Button>,
        ]}
      >
        <strong>
          {t(
            "Pool creation is not supported for Data Foundation's external RHCS storage system."
          )}
        </strong>
      </Modal>
    );
  }

  return (
    <>
      <div className="odf-create-operand__header">
        <Content className="odf-create-operand__header-text">
          <Content component={ContentVariants.h1}>
            {t('Create storage pool')}
          </Content>
        </Content>
        <StoragePoolDefinitionText />
      </div>
      <div className="create-storage-pool__form">
        <StoragePoolBody
          cephCluster={cephCluster}
          state={state}
          dispatch={dispatch}
          showPoolStatus={false}
          poolType={poolType}
          existingNames={existingNames}
          onPoolTypeChange={onPoolTypeChange}
          prefixName={fsName}
          erasureCodingDeviceClass={defaultDeviceClass}
        />
        <StoragePoolFooter
          state={state}
          cancel={onClose}
          onConfirm={createPool}
        />
      </div>
    </>
  );
};

export default CreateStoragePool;

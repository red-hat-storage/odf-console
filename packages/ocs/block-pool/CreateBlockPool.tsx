import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  useParams,
  useLocation,
  useNavigate,
} from 'react-router-dom-v5-compat';
import { Button, Modal } from '@patternfly/react-core';
import { COMPRESSION_ON, POOL_STATE } from '../constants';
import { CephBlockPoolModel, CephClusterModel } from '../models';
import { StoragePoolKind } from '../types';
import { getErrorMessage } from '../utils';
import { BlockPoolBody } from './body';
import { BlockPoolFooter } from './footer';
import {
  BlockPoolActionType,
  blockPoolInitialState,
  blockPoolReducer,
  BlockPoolState,
} from './reducer';
import './create-block-pool.scss';

export const getPoolKindObj = (
  state: BlockPoolState,
  ns: string
): StoragePoolKind => ({
  apiVersion: getAPIVersionForModel(CephBlockPoolModel),
  kind: CephBlockPoolModel.kind,
  metadata: {
    name: state.poolName,
    namespace: ns,
  },
  spec: {
    compressionMode: state.isCompressed ? COMPRESSION_ON : 'none',
    deviceClass: state.volumeType || '',
    failureDomain: state.failureDomain,
    parameters: {
      compression_mode: state.isCompressed ? COMPRESSION_ON : 'none',
    },
    replicated: {
      size: Number(state.replicaSize),
    },
  },
});

export const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

const CreateBlockPool: React.FC<{}> = ({}) => {
  const { pathname: url } = useLocation();
  const params = useParams();
  const { t } = useCustomTranslation();

  const navigate = useNavigate();
  const poolNs = params?.namespace;

  const [state, dispatch] = React.useReducer(
    blockPoolReducer,
    blockPoolInitialState
  );

  const [cephClusters, isLoaded, loadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);
  // only single cluster per Namespace
  const cephCluster = getCephClusterInNs(
    cephClusters,
    poolNs
  ) as CephClusterKind;

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const isExternalStorageSystem = systemFlags[poolNs]?.isExternalMode;

  // OCS create pool page url ends with ~new, ODF create pool page ends with /create/~new
  const blockPoolPageUrl = params?.appName
    ? url.replace('/~new', '')
    : url.replace('/create/~new', '');

  const onClose = () => {
    navigate(-1);
  };

  // Create new pool
  const createPool = () => {
    if (cephCluster?.status?.phase === POOL_STATE.READY) {
      const poolObj: StoragePoolKind = getPoolKindObj(state, poolNs);

      dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: true });
      k8sCreate({ model: CephBlockPoolModel, data: poolObj })
        .then(() => navigate(`${blockPoolPageUrl}/${state.poolName}`))
        .finally(() =>
          dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: false })
        )
        .catch((err) =>
          dispatch({
            type: BlockPoolActionType.SET_ERROR_MESSAGE,
            payload:
              getErrorMessage(err.message) || 'Could not create BlockPool.',
          })
        );
    } else
      dispatch({
        type: BlockPoolActionType.SET_ERROR_MESSAGE,
        payload: t(
          "Data Foundation's StorageCluster is not available. Try again after the StorageCluster is ready to use."
        ),
      });
  };

  if (isExternalStorageSystem) {
    return (
      <Modal
        title={t('Create BlockPool')}
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
            "Pool creation is not supported for Data Foundation's external RHCS StorageSystem."
          )}
        </strong>
      </Modal>
    );
  }

  return (
    <>
      <div className="co-create-operand__header">
        <h1 className="co-create-operand__header-text">
          {t('Create BlockPool')}
        </h1>
        <p className="help-block">
          {t(
            'A BlockPool is a logical entity providing elastic capacity to applications and workloads. Pools provide a means of supporting policies for access data resilience and storage efficiency.'
          )}
        </p>
      </div>
      <div className="ceph-create-block-pool__form">
        {isLoaded && areFlagsLoaded && !loadError && !flagsLoadError ? (
          <>
            <BlockPoolBody
              cephCluster={cephCluster}
              state={state}
              dispatch={dispatch}
              showPoolStatus={false}
            />
            <BlockPoolFooter
              state={state}
              cancel={onClose}
              onConfirm={createPool}
            />
          </>
        ) : (
          <StatusBox
            loadError={loadError || flagsLoadError}
            loaded={isLoaded && areFlagsLoaded}
            label={t('BlockPool Creation Form')}
          />
        )}
      </div>
    </>
  );
};

export default CreateBlockPool;

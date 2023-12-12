import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  useParams,
  useLocation,
  useNavigate,
} from 'react-router-dom-v5-compat';
import { Button, Modal } from '@patternfly/react-core';
import {
  CEPH_EXTERNAL_CR_NAME,
  COMPRESSION_ON,
  POOL_STATE,
} from '../constants';
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

export const cephClusterResource = (ns: string) => ({
  kind: referenceForModel(CephClusterModel),
  namespace: ns,
  isList: true,
});

const CreateBlockPool: React.FC<{}> = ({}) => {
  const { pathname: url } = useLocation();
  const params = useParams();
  const { t } = useCustomTranslation();

  const navigate = useNavigate();

  const [state, dispatch] = React.useReducer(
    blockPoolReducer,
    blockPoolInitialState
  );
  const [cephClusters, isLoaded, loadError] =
    useSafeK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  const cephCluster: CephClusterKind = useDeepCompareMemoize(
    cephClusters[0],
    true
  );

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

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
      const poolObj: StoragePoolKind = getPoolKindObj(state, odfNamespace);

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

  if (cephCluster?.metadata.name === CEPH_EXTERNAL_CR_NAME) {
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
        {isLoaded && isODFNsLoaded && !loadError && !odfNsLoadError ? (
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
            loadError={loadError || odfNsLoadError}
            loaded={isLoaded && isODFNsLoaded}
            label={t('BlockPool Creation Form')}
          />
        )}
      </div>
    </>
  );
};

export default CreateBlockPool;

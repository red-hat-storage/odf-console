import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants/common';
import PageHeading from '@odf/shared/heading/page-heading';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  Text,
  TextInput,
  TextContent,
  TextVariants,
  ActionGroup,
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  REPLICATION_TYPE,
  ODFMCO_OPERATOR,
  HUB_CLUSTER_NAME,
} from '../../constants';
import { DRPolicyModel, MirrorPeerModel } from '../../models';
import { DRPolicyKind, MirrorPeerKind } from '../../types';
import {
  drPolicyReducer,
  drPolicyInitialState,
  DRPolicyActionType,
} from './reducer';
import { SelectClusterList } from './select-cluster-list';
import { DRReplicationType } from './select-replication-type';
import { SelectedCluster } from './selected-cluster-view';
import './create-dr-policy.scss';
import '../../style.scss';

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): MirrorPeerKind =>
  mirrorPeers?.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer?.spec?.items?.map((item) => item?.clusterName) ?? [];
    return existingPeerNames.sort().join(',') === peerNames.sort().join(',');
  });

const getDRPolicyListPageLink = (url: string) =>
  url.replace(`${referenceForModel(DRPolicyModel)}/~new`, '');

export const CreateDRPolicy: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { pathname: url } = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = React.useReducer(
    drPolicyReducer,
    drPolicyInitialState
  );
  // odfmco mirrorpeer info
  const [mirrorPeers] = useK8sWatchResource<MirrorPeerKind[]>({
    kind: referenceForModel(MirrorPeerModel),
    isList: true,
    namespaced: false,
    cluster: HUB_CLUSTER_NAME,
  });
  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
    cluster: HUB_CLUSTER_NAME,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  React.useEffect(() => {
    if (state.selectedClusters.length === 2) {
      // ODF detection
      dispatch({
        type: DRPolicyActionType.SET_IS_ODF_DETECTED,
        payload: state.selectedClusters.every(
          (cluster) => cluster?.cephFSID !== '' && cluster?.isValidODFVersion
        ),
      });

      // DR replication type
      const isReplicationAutoDetectable = state.selectedClusters.every(
        (cluster) => cluster?.cephFSID !== ''
      );
      const cephFSIDs = state.selectedClusters.reduce((ids, cluster) => {
        if (cluster?.cephFSID !== '') {
          ids.add(cluster?.cephFSID);
        }
        return ids;
      }, new Set());

      dispatch({
        type: DRPolicyActionType.SET_IS_REPLICATION_INPUT_MANUAL,
        payload: !isReplicationAutoDetectable,
      });
      dispatch({
        type: DRPolicyActionType.SET_REPLICATION,
        payload:
          isReplicationAutoDetectable && cephFSIDs.size <= 1
            ? REPLICATION_TYPE.SYNC
            : REPLICATION_TYPE.ASYNC,
      });
    } else {
      dispatch({
        type: DRPolicyActionType.SET_IS_ODF_DETECTED,
        payload: false,
      });
      dispatch({
        type: DRPolicyActionType.SET_IS_REPLICATION_INPUT_MANUAL,
        payload: false,
      });
      dispatch({
        type: DRPolicyActionType.SET_REPLICATION,
        payload: '',
      });
    }
  }, [state.selectedClusters, t, dispatch]);

  const onCreate = () => {
    const promises: Promise<K8sResourceKind>[] = [];
    const peerNames = state.selectedClusters.map((cluster) => cluster?.name);

    // DRPolicy creation
    const drPolicyPayload: DRPolicyKind = {
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
      metadata: { name: state.policyName },
      spec: {
        schedulingInterval:
          state.replication === REPLICATION_TYPE.ASYNC ? state.syncTime : '0m',
        drClusters: peerNames,
      },
    };
    promises.push(
      k8sCreate({
        model: DRPolicyModel,
        data: drPolicyPayload,
        cluster: HUB_CLUSTER_NAME,
      })
    );

    const mirrorPeer: MirrorPeerKind =
      fetchMirrorPeer(mirrorPeers, peerNames) ?? {};

    if (Object.keys(mirrorPeer).length === 0) {
      // MirrorPeer creation
      const mirrorPeerPayload: MirrorPeerKind = {
        apiVersion: getAPIVersionForModel(MirrorPeerModel),
        kind: MirrorPeerModel.kind,
        metadata: { generateName: 'mirrorpeer-' },
        spec: {
          manageS3: true,
          type: state.replication,
          items: state.selectedClusters.map((cluster) => ({
            clusterName: cluster?.name,
            storageClusterRef: {
              name: cluster.storageClusterName,
              // ToDo (epic 4422): Need to update this as per ConfigMap/ClusterClaim (whichever us decided) JSON output
              namespace: CEPH_STORAGE_NAMESPACE,
            },
          })),
        },
      };
      promises.push(
        k8sCreate({
          model: MirrorPeerModel,
          data: mirrorPeerPayload,
          cluster: HUB_CLUSTER_NAME,
        })
      );
    }

    Promise.all(promises)
      .then(() => {
        navigate(getDRPolicyListPageLink(url));
      })
      .catch((error) => {
        dispatch({
          type: DRPolicyActionType.SET_ERROR_MESSAGE,
          payload: error?.message,
        });
      });
  };

  const setPolicyName = (strVal: string) =>
    dispatch({
      type: DRPolicyActionType.SET_POLICY_NAME,
      payload: strVal,
    });

  const areDRPolicyInputsValid = () =>
    !!state.policyName &&
    Object.keys(state.selectedClusters)?.length === MAX_ALLOWED_CLUSTERS &&
    state.isODFDetected;

  return (
    <div>
      <PageHeading title={t('Create DRPolicy')}>
        <TextContent className="mco-create-data-policy__description">
          <Text component={TextVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      <Form className="mco-create-data-policy">
        <FormGroup fieldId="policy-name" label={t('Policy name')}>
          <TextInput
            data-test="policy-name-text"
            id="policy-name"
            value={state.policyName}
            type="text"
            onChange={setPolicyName}
            isRequired
          />
        </FormGroup>
        <FormGroup
          fieldId="connect-clusters"
          label={t('Connect clusters')}
          helperText={t(
            'Enables mirroring/replication between two selected clusters, ensuring failover or relocation between the two clusters in the event of an outage or planned maintenance.'
          )}
          isHelperTextBeforeField
        >
          <SelectClusterList
            state={state}
            requiredODFVersion={odfMCOVersion}
            dispatch={dispatch}
          />
        </FormGroup>
        <FormGroup
          helperText={t(
            "Note: If your cluster isn't visible on this list, verify its import status and refer to the steps outlined in the ACM documentation."
          )}
        />
        {!!odfMCOVersion && (
          <FormGroup fieldId="policy-name">
            <Alert
              className="odf-alert mco-create-data-policy__alert"
              title={t(
                'Data Foundation {{ version }} or above must be installed on the managed clusters to setup connection for enabling replication/mirroring.',
                { version: odfMCOVersion }
              )}
              variant={AlertVariant.info}
              isInline
            />
          </FormGroup>
        )}
        {!!state.selectedClusters.length && (
          <FormGroup fieldId="selected-clusters" label={t('Selected clusters')}>
            {state.selectedClusters.map((c, i) => (
              <SelectedCluster
                key={c.name}
                id={i + 1}
                cluster={c}
                dispatch={dispatch}
              />
            ))}
          </FormGroup>
        )}
        <DRReplicationType
          state={state}
          requiredODFVersion={odfMCOVersion}
          dispatch={dispatch}
        />
        {state.errorMessage && (
          <FormGroup fieldId="error-message">
            <Alert
              className="odf-alert mco-create-data-policy__alert"
              title={t('An error occurred')}
              variant="danger"
              isInline
            >
              {state.errorMessage}
            </Alert>
          </FormGroup>
        )}
        <ActionGroup className="mco-create-data-policy__action-group">
          <Button
            data-test="create-button"
            variant={ButtonVariant.primary}
            onClick={onCreate}
            isDisabled={!areDRPolicyInputsValid()}
          >
            {t('Create')}
          </Button>
          <Button
            data-test="cancel-button"
            variant={ButtonVariant.secondary}
            onClick={() => navigate(-1)}
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
};

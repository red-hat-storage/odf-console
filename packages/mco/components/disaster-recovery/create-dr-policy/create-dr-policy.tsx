import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants/common';
import PageHeading from '@odf/shared/heading/page-heading';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  referenceForGroupVersionKind,
  referenceForModel,
} from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { RouteComponentProps, match as Match } from 'react-router';
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
} from '../../../constants';
import { DRPolicyModel, MirrorPeerModel } from '../../../models';
import { DRPolicyKind, MirrorPeerKind } from '../../../types';
import {
  drPolicyReducer,
  drPolicyInitialState,
  DRPolicyActionType,
} from './reducer';
import { SelectClusterList } from './select-cluster-list';
import { DRReplicationType } from './select-replication-type';
import { SelectedCluster } from './selected-cluster-view';
import './create-dr-policy.scss';
import '../../../style.scss';

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): MirrorPeerKind =>
  mirrorPeers?.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer?.spec?.items?.map((item) => item?.clusterName) ?? [];
    return existingPeerNames.sort().join(',') === peerNames.sort().join(',');
  });

type ReRouteResourceProps = {
  history: RouteComponentProps['history'];
  match: Match<{ url: string }>;
};

export const CreateDRPolicy: React.FC<ReRouteResourceProps> = ({
  match,
  history,
}) => {
  const { t } = useCustomTranslation();
  const { url } = match;
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
  const odfMCOVersion = React.useMemo(() => {
    const version = csv?.spec?.version;
    // converting z-stream release version to main release version
    return version ? version.substring(0, version.lastIndexOf('.')) + '.0' : '';
  }, [csv]);

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

  const onCreate = async () => {
    try {
      const peerNames = state.selectedClusters.map((cluster) => cluster?.name);
      const mirrorPeer: MirrorPeerKind =
        fetchMirrorPeer(mirrorPeers, peerNames) ?? {};

      // DRPolicy creation
      const payload: DRPolicyKind = {
        apiVersion: getAPIVersionForModel(DRPolicyModel),
        kind: DRPolicyModel.kind,
        metadata: { name: state.policyName },
        spec: {
          schedulingInterval:
            state.replication === REPLICATION_TYPE.ASYNC
              ? state.syncTime
              : '0m',
          drClusters: peerNames,
        },
      };
      await k8sCreate({
        model: DRPolicyModel,
        data: payload,
        cluster: HUB_CLUSTER_NAME,
      });

      if (Object.keys(mirrorPeer).length > 0) {
        // MirrorPeer update
        if (state.replication === REPLICATION_TYPE.ASYNC) {
          const patch = [
            {
              op: 'replace',
              path: '/spec/schedulingIntervals',
              value: [
                ...new Set([
                  ...mirrorPeer?.spec?.schedulingIntervals,
                  state.syncTime,
                ]),
              ],
            },
          ];
          await k8sPatch({
            model: MirrorPeerModel,
            resource: mirrorPeer,
            data: patch,
            cluster: HUB_CLUSTER_NAME,
          });
        }
      } else {
        // MirrorPeer creation
        const payload: MirrorPeerKind = {
          apiVersion: getAPIVersionForModel(MirrorPeerModel),
          kind: MirrorPeerModel.kind,
          metadata: { generateName: 'mirror-peer-' },
          spec: {
            manageS3: true,
            type: state.replication,
            schedulingIntervals:
              state.replication === REPLICATION_TYPE.ASYNC
                ? [state.syncTime]
                : [],
            items: state.selectedClusters.map((cluster) => ({
              clusterName: cluster?.name,
              storageClusterRef: {
                name: cluster.storageClusterName,
                namespace: CEPH_STORAGE_NAMESPACE,
              },
            })),
          },
        };
        await k8sCreate({
          model: MirrorPeerModel,
          data: payload,
          cluster: HUB_CLUSTER_NAME,
        });
      }

      const { apiGroup, apiVersion, kind } = DRPolicyModel;
      const drPolicyKind =
        referenceForGroupVersionKind(apiGroup)(apiVersion)(kind);
      history.push(url.replace(`${drPolicyKind}/~new`, ''));
    } catch (error) {
      dispatch({
        type: DRPolicyActionType.SET_ERROR_MESSAGE,
        payload: error?.message,
      });
    }
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
            onClick={history.goBack}
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
};

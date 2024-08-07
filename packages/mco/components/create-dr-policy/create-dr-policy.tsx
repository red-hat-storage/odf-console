import * as React from 'react';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import { getMajorVersion, parseNamespaceName } from '@odf/mco/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
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
import { Trans } from 'react-i18next';
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
  FormHelperText,
  HelperText,
  HelperTextItem,
  ExpandableSection,
  Checkbox,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  REPLICATION_TYPE,
  ODFMCO_OPERATOR,
  RBD_IMAGE_FLATTEN_LABEL,
} from '../../constants';
import { DRPolicyModel, MirrorPeerModel } from '../../models';
import { DRPolicyKind, MirrorPeerKind } from '../../types';
import {
  drPolicyReducer,
  drPolicyInitialState,
  DRPolicyActionType,
  ManagedClusterInfoType,
  DRPolicyAction,
} from './reducer';
import { SelectClusterList } from './select-cluster-list';
import { DRReplicationType } from './select-replication-type';
import { SelectedCluster, checkForErrors } from './selected-cluster-view';
import './create-dr-policy.scss';
import '../../style.scss';

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): MirrorPeerKind =>
  mirrorPeers.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer?.spec?.items?.map((item) => item?.clusterName) ?? [];
    return existingPeerNames.sort().join(',') === peerNames.sort().join(',');
  }) || {};

const getPeerClustersRef = (clusters: ManagedClusterInfoType[]) =>
  clusters.map((cluster) => {
    const { storageClusterNamespacedName } =
      cluster?.odfInfo.storageClusterInfo;
    const [storageClusterName, storageClusterNamesapce] = parseNamespaceName(
      storageClusterNamespacedName
    );
    return {
      clusterName: cluster?.name,
      storageClusterRef: {
        name: storageClusterName,
        namespace: storageClusterNamesapce,
      },
    };
  });

const createDRPolicy = (
  policyName: string,
  replicationType: REPLICATION_TYPE,
  syncIntervalTime: string,
  enableRBDImageFlatten: boolean,
  peerNames: string[]
) => {
  const drPolicyPayload: DRPolicyKind = {
    apiVersion: getAPIVersionForModel(DRPolicyModel),
    kind: DRPolicyModel.kind,
    metadata: { name: policyName },
    spec: {
      replicationClassSelector: enableRBDImageFlatten
        ? { matchLabels: RBD_IMAGE_FLATTEN_LABEL }
        : {},
      schedulingInterval:
        replicationType === REPLICATION_TYPE.ASYNC ? syncIntervalTime : '0m',
      drClusters: peerNames,
    },
  };
  return k8sCreate({
    model: DRPolicyModel,
    data: drPolicyPayload,
  });
};

const createMirrorPeer = (
  selectedClusters: ManagedClusterInfoType[],
  replicationType: REPLICATION_TYPE
) => {
  const mirrorPeerPayload: MirrorPeerKind = {
    apiVersion: getAPIVersionForModel(MirrorPeerModel),
    kind: MirrorPeerModel.kind,
    metadata: { generateName: 'mirrorpeer-' },
    spec: {
      manageS3: true,
      type: replicationType,
      items: getPeerClustersRef(selectedClusters),
    },
  };
  return k8sCreate({
    model: MirrorPeerModel,
    data: mirrorPeerPayload,
  });
};

const getDRPolicyListPageLink = (url: string) =>
  url.replace(`/${referenceForModel(DRPolicyModel)}/~new`, '');

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  enableRBDImageFlatten,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const handleRBDImageFlattenOnChange = (checked: boolean) => {
    dispatch({
      type: DRPolicyActionType.SET_RBD_IMAGE_FLATTEN,
      payload: checked,
    });
  };

  return (
    <ExpandableSection toggleText={t('Advanced settings')}>
      <Checkbox
        label={t(
          'Enable disaster recovery support for restored and cloned PersistentVolumeClaims (For Data Foundation only)'
        )}
        isChecked={enableRBDImageFlatten}
        onChange={(_event, checked: boolean) =>
          handleRBDImageFlattenOnChange(checked)
        }
        id="flat-image-checkbox"
        name="flat-image-checkbox"
      />
      <Alert
        className="pf-v5-u-mt-md odf-alert mco-create-data-policy__alert"
        title={
          <Trans>
            Before choosing this option, read the section
            <i className="pf-v5-u-mx-xs">
              Creating Disaster Recovery Policy on Hub cluster chapter of
              Regional-DR solution guide
            </i>
            to understand the impact and limitations of this feature.
          </Trans>
        }
        variant={AlertVariant.warning}
        isInline
      />
    </ExpandableSection>
  );
};

const CreateDRPolicy: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { pathname: url } = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = React.useReducer(
    drPolicyReducer,
    drPolicyInitialState
  );
  const [errorMessage, setErrorMessage] = React.useState('');

  const [mirrorPeers, mirrorPeerLoaded, mirrorPeerLoadError] =
    useK8sWatchResource<MirrorPeerKind[]>({
      kind: referenceForModel(MirrorPeerModel),
      isList: true,
      namespaced: false,
    });

  const [drPolicies, policyLoaded, policyLoadedError] = useK8sWatchResource<
    DRPolicyKind[]
  >(getDRPolicyResourceObj());

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  const onCreate = () => {
    const promises: Promise<K8sResourceKind>[] = [];
    const peerNames = state.selectedClusters.map((cluster) => cluster?.name);
    promises.push(
      createDRPolicy(
        state.policyName,
        state.replicationType,
        state.syncIntervalTime,
        state.enableRBDImageFlatten,
        peerNames
      )
    );

    const mirrorPeer: MirrorPeerKind =
      mirrorPeerLoaded &&
      !mirrorPeerLoadError &&
      fetchMirrorPeer(mirrorPeers, peerNames);

    if (Object.keys(mirrorPeer).length === 0) {
      promises.push(
        createMirrorPeer(state.selectedClusters, state.replicationType)
      );
    }

    Promise.all(promises)
      .then(() => {
        navigate(getDRPolicyListPageLink(url));
      })
      .catch((error) => {
        setErrorMessage(error?.message);
      });
  };

  const setPolicyName = (strVal: string) =>
    dispatch({
      type: DRPolicyActionType.SET_POLICY_NAME,
      payload: strVal,
    });

  const areDRPolicyInputsValid = () =>
    !!state.policyName &&
    !!state.replicationType &&
    state.selectedClusters.length === MAX_ALLOWED_CLUSTERS &&
    !checkForErrors(state.selectedClusters);

  const loaded = mirrorPeerLoaded && policyLoaded;
  const loadedError = mirrorPeerLoadError || policyLoadedError;

  return (
    <>
      <PageHeading title={t('Create DRPolicy')}>
        <TextContent className="mco-create-data-policy__description">
          <Text component={TextVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      {loaded && !loadedError ? (
        <Form className="mco-create-data-policy">
          <FormGroup fieldId="policy-name" label={t('Policy name')}>
            <TextInput
              data-test="policy-name-text"
              id="policy-name"
              data-testid="policy-name"
              value={state.policyName}
              type="text"
              onChange={(_event, strVal: string) => setPolicyName(strVal)}
              isRequired
            />
          </FormGroup>
          <FormGroup fieldId="connect-clusters" label={t('Connect clusters')}>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t(
                    'Enables mirroring/replication between two selected clusters, ensuring failover or relocation between the two clusters in the event of an outage or planned maintenance.'
                  )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <SelectClusterList
              selectedClusters={state.selectedClusters}
              requiredODFVersion={odfMCOVersion}
              dispatch={dispatch}
            />
          </FormGroup>
          <FormGroup>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t(
                    "Note: If your cluster isn't visible on this list, verify its import status and refer to the steps outlined in the ACM documentation."
                  )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
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
            <FormGroup
              fieldId="selected-clusters"
              label={t('Selected clusters')}
            >
              {state.selectedClusters.map((c, i) => (
                <SelectedCluster key={c.name} id={i + 1} cluster={c} />
              ))}
            </FormGroup>
          )}
          <DRReplicationType
            selectedClusters={state.selectedClusters}
            replicationType={state.replicationType}
            syncIntervalTime={state.syncIntervalTime}
            requiredODFVersion={odfMCOVersion}
            drPolicies={drPolicies}
            dispatch={dispatch}
          />
          {state.replicationType === REPLICATION_TYPE.ASYNC && (
            <AdvancedSettings
              enableRBDImageFlatten={state.enableRBDImageFlatten}
              dispatch={dispatch}
            />
          )}
          {errorMessage && (
            <FormGroup fieldId="error-message">
              <Alert
                className="odf-alert mco-create-data-policy__alert"
                title={t('An error occurred')}
                variant="danger"
                isInline
              >
                {errorMessage}
              </Alert>
            </FormGroup>
          )}
          <ActionGroup className="mco-create-data-policy__action-group">
            <Button
              data-testid="create-button"
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
      ) : (
        <StatusBox loaded={loaded} loadError={loadedError} />
      )}
    </>
  );
};

type AdvancedSettingsProps = {
  enableRBDImageFlatten: boolean;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export default CreateDRPolicy;

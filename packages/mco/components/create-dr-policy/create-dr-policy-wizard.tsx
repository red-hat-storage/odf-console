import * as React from 'react';
import { usePrePairNetworkValidation } from '@odf/mco/hooks';
import { getMajorVersion } from '@odf/mco/utils';
import {
  ACM_DEFAULT_DOC_VERSION,
  DRClusterModel,
  MirrorPeerModel,
  useDocVersion,
} from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Wizard, WizardStep } from '@patternfly/react-core';
import {
  ACM_OPERATOR_SPEC_NAME,
  acmDocHome,
  acmSubmarinerDoc,
  BackendType,
  CreateDRPolicyStepNames,
  CreateDRPolicyWizardSteps,
  gettingStartedDRDocs,
  MAX_ALLOWED_CLUSTERS,
  ODFMCO_OPERATOR,
  SubmarinerStatus,
} from '../../constants';
import '../../style.scss';
import {
  DRClusterKind,
  DRPolicyKind,
  MirrorPeerKind,
  S3StoreProfile,
  type S3Details,
} from '../../types';
import { fetchRamenS3Profiles } from '../../utils/tps-payload-creator';
import { ClusterPairingProgress } from './cluster-pairing-progress/cluster-pairing-progress';
import { PairingSuccess } from './cluster-pairing-progress/pairing-success';
import './create-dr-policy.scss';
import { CreateDRPolicyWizardFooter } from './footer';
import { createPolicyPromises } from './utils/k8s-utils';
import {
  DRPolicyActionType,
  drPolicyInitialState,
  drPolicyReducer,
} from './utils/reducer';
import {
  isPrePairValidationPassed,
  shouldRunPrePairValidation,
  validateClustersStepInputs,
  validateConfigureStepInputs,
  validatePolicyStepInputs,
  validateReviewStepInputs,
} from './utils/step-validation';
import {
  ClustersStep,
  ConfigureClusterPairStep,
  PolicyStep,
  ReviewDRPolicyStep,
} from './wizard-steps';

const convertS3ProfileToDetails = (
  profile: S3StoreProfile,
  clusterName: string
): S3Details => {
  return {
    clusterName,
    bucketName: profile.s3Bucket || '',
    endpoint: profile.s3CompatibleEndpoint || '',
    accessKeyId: '',
    secretKey: '',
    region: profile.s3Region || '',
    s3ProfileName: profile.s3ProfileName || '',
  };
};

export interface CreateDRPolicyWizardProps {
  preSelectedClusters?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateDRPolicyWizard: React.FC<CreateDRPolicyWizardProps> = ({
  preSelectedClusters = [],
  onSuccess,
  onCancel,
}) => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer(
    drPolicyReducer,
    drPolicyInitialState
  );
  const [s3ErrorMessage, setS3ErrorMessage] = React.useState('');
  const [createErrorMessage, setCreateErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(CreateDRPolicyWizardSteps.Clusters);
  const [acknowledgedStatus, setAcknowledgedStatus] =
    React.useState<SubmarinerStatus | null>(null);
  const policyPeerRef = React.useRef<{
    pairingMirrorPeerName: string;
    skipPairingProgress: boolean;
    isNewMirrorPeer: boolean;
    isNewPolicy: boolean;
    previousPolicySpec?: DRPolicyKind['spec'];
  }>({
    pairingMirrorPeerName: '',
    skipPairingProgress: false,
    isNewMirrorPeer: false,
    isNewPolicy: false,
  });

  const clearAcknowledgedStatus = React.useCallback(() => {
    setAcknowledgedStatus(null);
  }, []);

  const [mirrorPeers, mirrorPeerLoaded, mirrorPeerLoadError] =
    useK8sWatchResource<MirrorPeerKind[]>({
      kind: referenceForModel(MirrorPeerModel),
      isList: true,
      namespaced: false,
    });

  const [drClusters, drClustersLoaded, drClustersLoadError] =
    useK8sWatchResource<DRClusterKind[]>({
      kind: referenceForModel(DRClusterModel),
      isList: true,
      namespaced: false,
    });

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  const selectedDRClusters = React.useMemo(() => {
    if (
      state.clusters.selectedClusters.length === MAX_ALLOWED_CLUSTERS &&
      drClustersLoaded &&
      !drClustersLoadError
    ) {
      const drCluster1 = drClusters.find(
        (drCluster) =>
          getName(drCluster) === getName(state.clusters.selectedClusters[0])
      );
      const drCluster2 = drClusters.find(
        (drCluster) =>
          getName(drCluster) === getName(state.clusters.selectedClusters[1])
      );
      return [drCluster1, drCluster2].filter(Boolean) as DRClusterKind[];
    }
    return [];
  }, [
    state.clusters.selectedClusters,
    drClusters,
    drClustersLoaded,
    drClustersLoadError,
  ]);

  const prefilledPairRef = React.useRef<string>('');
  React.useEffect(() => {
    let cancelled = false;

    const loadS3ProfileDetails = async () => {
      setS3ErrorMessage('');

      if (state.configure.replicationBackend !== BackendType.ThirdParty) {
        prefilledPairRef.current = '';
        return;
      }

      if (selectedDRClusters.length !== MAX_ALLOWED_CLUSTERS) {
        prefilledPairRef.current = '';
        return;
      }

      const pairKey = selectedDRClusters.map(getName).join('/');
      if (prefilledPairRef.current === pairKey) {
        return;
      }

      try {
        const ramenS3Profiles = await fetchRamenS3Profiles();

        if (cancelled) {
          return;
        }

        // Ignore stale responses if the active pair or backend changed mid-flight.
        const activePairKey = selectedDRClusters.map(getName).join('/');
        if (
          state.configure.replicationBackend !== BackendType.ThirdParty ||
          selectedDRClusters.length !== MAX_ALLOWED_CLUSTERS ||
          activePairKey !== pairKey
        ) {
          return;
        }

        prefilledPairRef.current = pairKey;

        const cluster1S3ProfileName =
          selectedDRClusters[0]?.spec?.s3ProfileName;
        const cluster2S3ProfileName =
          selectedDRClusters[1]?.spec?.s3ProfileName;

        const cluster1Name = getName(selectedDRClusters[0]);
        const cluster2Name = getName(selectedDRClusters[1]);

        if (cluster1S3ProfileName) {
          const cluster1Profile = ramenS3Profiles.find(
            (profile) => profile.s3ProfileName === cluster1S3ProfileName
          );
          if (cluster1Profile) {
            const cluster1Details = convertS3ProfileToDetails(
              cluster1Profile,
              cluster1Name
            );
            dispatch({
              type: DRPolicyActionType.SET_CLUSTER1_S3_DETAILS,
              payload: cluster1Details,
            });
          }
        }

        if (cluster2S3ProfileName) {
          const cluster2Profile = ramenS3Profiles.find(
            (profile) => profile.s3ProfileName === cluster2S3ProfileName
          );
          if (cluster2Profile) {
            const cluster2Details = convertS3ProfileToDetails(
              cluster2Profile,
              cluster2Name
            );
            dispatch({
              type: DRPolicyActionType.SET_CLUSTER2_S3_DETAILS,
              payload: cluster2Details,
            });
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        prefilledPairRef.current = '';
        setS3ErrorMessage(
          t('Failed to load S3 profile details: {{error}}', {
            error: (error as Error)?.message || JSON.stringify(error),
          })
        );
      }
    };

    loadS3ProfileDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedDRClusters, dispatch, state.configure.replicationBackend, t]);

  const onCreate = async () => {
    try {
      setCreateErrorMessage('');
      setIsLoading(true);
      const result = await createPolicyPromises(
        state,
        mirrorPeers,
        selectedDRClusters
      );
      setIsLoading(false);

      if (result.mirrorPeerName) {
        policyPeerRef.current = {
          pairingMirrorPeerName: result.mirrorPeerName,
          skipPairingProgress: !!result.skipPairingProgress,
          isNewMirrorPeer: !!result.isNewMirrorPeer,
          isNewPolicy: result.isNewPolicy,
          previousPolicySpec: result.previousPolicySpec,
        };
        return;
      }

      onSuccess();
    } catch (error) {
      setIsLoading(false);
      setCreateErrorMessage((error as Error)?.message || JSON.stringify(error));
    }
  };

  const onCancelPairing = () => {
    clearAcknowledgedStatus();
    policyPeerRef.current = {
      pairingMirrorPeerName: '',
      skipPairingProgress: false,
      isNewMirrorPeer: false,
      isNewPolicy: false,
      previousPolicySpec: undefined,
    };
    setCreateErrorMessage('');
    setStep(CreateDRPolicyWizardSteps.Clusters);
  };

  const loaded = mirrorPeerLoaded && drClustersLoaded;
  const loadedError = mirrorPeerLoadError || drClustersLoadError;

  const clusterNames = React.useMemo(
    () => state.clusters.selectedClusters.map(getName),
    [state.clusters.selectedClusters]
  );
  const shouldRunValidation = shouldRunPrePairValidation(state);
  const validationActive =
    shouldRunValidation && step !== CreateDRPolicyWizardSteps.Clusters;
  const prePairValidation = usePrePairNetworkValidation(
    clusterNames,
    validationActive
  );
  const acknowledgedUnvalidatedSubmariner =
    acknowledgedStatus === prePairValidation.status;

  const prePairValidationPassed =
    !validationActive ||
    isPrePairValidationPassed(
      prePairValidation,
      acknowledgedUnvalidatedSubmariner
    );

  const acmDocVersion = useDocVersion({
    defaultDocVersion: ACM_DEFAULT_DOC_VERSION,
    specName: ACM_OPERATOR_SPEC_NAME,
  });

  const acmDoc = acmDocHome(acmDocVersion);
  const submarinerDoc = acmSubmarinerDoc(acmDocVersion);

  const allDRClustersExist = selectedDRClusters.length === MAX_ALLOWED_CLUSTERS;

  if (!loaded || loadedError) {
    return <StatusBox loaded={loaded} loadError={loadedError} />;
  }

  if (
    policyPeerRef.current.pairingMirrorPeerName &&
    policyPeerRef.current.skipPairingProgress
  ) {
    return <PairingSuccess onViewPolicy={onSuccess} onClose={onCancel} />;
  }

  if (policyPeerRef.current.pairingMirrorPeerName) {
    return (
      <ClusterPairingProgress
        mirrorPeerName={policyPeerRef.current.pairingMirrorPeerName}
        mirrorPeers={mirrorPeers}
        mirrorPeersLoaded={mirrorPeerLoaded}
        mirrorPeersLoadError={mirrorPeerLoadError}
        policyName={state.policy.policyName}
        deleteMirrorPeerOnCancel={policyPeerRef.current.isNewMirrorPeer}
        deletePolicyOnCancel={policyPeerRef.current.isNewPolicy}
        previousPolicySpec={policyPeerRef.current.previousPolicySpec}
        onViewPolicy={onSuccess}
        onClose={onCancel}
        onCancelPairing={onCancelPairing}
      />
    );
  }

  const stepNames = CreateDRPolicyStepNames(t);
  const stepValidity: Record<CreateDRPolicyWizardSteps, boolean> = {
    [CreateDRPolicyWizardSteps.Clusters]: validateClustersStepInputs(state),
    [CreateDRPolicyWizardSteps.Configure]: validateConfigureStepInputs(
      state,
      allDRClustersExist,
      prePairValidationPassed
    ),
    [CreateDRPolicyWizardSteps.Policy]: validatePolicyStepInputs(state),
    [CreateDRPolicyWizardSteps.Review]: validateReviewStepInputs(
      state,
      allDRClustersExist,
      prePairValidationPassed
    ),
  };

  return (
    <Wizard
      className="pf-v6-u-h-75vh"
      navAriaLabel={t('Create DRPolicy steps')}
      isVisitRequired
      onStepChange={(_event, currentStep) => {
        const nextStep = currentStep.id as CreateDRPolicyWizardSteps;
        if (nextStep === CreateDRPolicyWizardSteps.Clusters) {
          clearAcknowledgedStatus();
        }
        setStep(nextStep);
      }}
      footer={
        <CreateDRPolicyWizardFooter
          stepValidity={stepValidity}
          isLoading={isLoading}
          errorMessage={createErrorMessage}
          onCreate={onCreate}
          onCancel={onCancel}
        />
      }
    >
      <WizardStep
        id={CreateDRPolicyWizardSteps.Clusters}
        name={stepNames[CreateDRPolicyWizardSteps.Clusters]}
      >
        <ClustersStep
          state={state}
          dispatch={dispatch}
          requiredODFVersion={odfMCOVersion}
          preSelectedClusters={preSelectedClusters}
          acmDoc={acmDoc}
          mirrorPeers={mirrorPeers}
          onSelectedClustersChange={clearAcknowledgedStatus}
        />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Configure}
        name={stepNames[CreateDRPolicyWizardSteps.Configure]}
      >
        <ConfigureClusterPairStep
          replicationBackend={state.configure.replicationBackend}
          selectedClusters={state.clusters.selectedClusters}
          selectedClustersHaveODF={state.clusters.selectedClustersHaveODF}
          cluster1S3Details={state.configure.cluster1S3Details}
          cluster2S3Details={state.configure.cluster2S3Details}
          useSameS3Connection={state.configure.useSameS3Connection}
          dispatch={dispatch}
          selectedDRClusters={selectedDRClusters}
          validation={prePairValidation}
          acknowledgedUnvalidatedSubmariner={acknowledgedUnvalidatedSubmariner}
          onAcknowledgeUnvalidatedSubmariner={(acknowledged) =>
            setAcknowledgedStatus(
              acknowledged ? prePairValidation.status : null
            )
          }
          onReplicationBackendChange={clearAcknowledgedStatus}
          docHref={submarinerDoc}
          errorMessage={s3ErrorMessage}
        />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Policy}
        name={stepNames[CreateDRPolicyWizardSteps.Policy]}
      >
        <PolicyStep
          state={state}
          dispatch={dispatch}
          docHref={gettingStartedDRDocs(odfMCOVersion).CREATE_POLICY}
        />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Review}
        name={stepNames[CreateDRPolicyWizardSteps.Review]}
      >
        <ReviewDRPolicyStep
          state={state}
          validation={shouldRunValidation ? prePairValidation : undefined}
        />
      </WizardStep>
    </Wizard>
  );
};

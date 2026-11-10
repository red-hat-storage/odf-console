import * as React from 'react';
import {
  getS3ConfigurationResourceObj,
  usePrePairNetworkValidation,
} from '@odf/mco/hooks';
import { getMajorVersion } from '@odf/mco/utils';
import { getThrownMessage } from '@odf/mco/utils/error-message';
import {
  ACM_DEFAULT_DOC_VERSION,
  DOC_VERSION,
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
  CreateDRPolicyStepNames,
  CreateDRPolicyWizardSteps,
  gettingStartedDRDocs,
  ODFMCO_OPERATOR,
  SubmarinerStatus,
} from '../../constants';
import '../../style.scss';
import { DRPolicyKind, MirrorPeerKind, S3ConfigurationKind } from '../../types';
import { ClusterPairingProgress } from './cluster-pairing-progress/cluster-pairing-progress';
import { PairingSuccess } from './cluster-pairing-progress/pairing-success';
import { S3ConfigurationProgress } from './cluster-pairing-progress/s3-configuration-progress';
import './create-dr-policy.scss';
import { CreateDRPolicyWizardFooter } from './footer';
import { createPolicyPromises } from './utils/k8s-utils';
import { drPolicyInitialState, drPolicyReducer } from './utils/reducer';
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
  const [createErrorMessage, setCreateErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  // Created this run, not yet Ready.
  const [pendingS3ConfigurationNames, setPendingS3ConfigurationNames] =
    React.useState<string[]>([]);
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

  // optional: degrade to an empty list on hubs predating the CRD.
  const [s3Configurations, s3ConfigurationsLoaded, s3ConfigurationsLoadError] =
    useK8sWatchResource<S3ConfigurationKind[]>(getS3ConfigurationResourceObj());

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  // Already-claimed clusters are shown read-only and reused; the spec is immutable.
  const clustersWithS3Configuration = React.useMemo(() => {
    if (!s3ConfigurationsLoaded || s3ConfigurationsLoadError) {
      return new Set<string>();
    }
    const claimed = new Set(
      (s3Configurations ?? []).flatMap(
        (s3Configuration) => s3Configuration.spec?.managedClusters ?? []
      )
    );
    return new Set(
      state.clusters.selectedClusters
        .map(getName)
        .filter((clusterName) => claimed.has(clusterName))
    );
  }, [
    state.clusters.selectedClusters,
    s3Configurations,
    s3ConfigurationsLoaded,
    s3ConfigurationsLoadError,
  ]);

  const onCreate = async () => {
    try {
      setCreateErrorMessage('');
      setIsLoading(true);
      const result = await createPolicyPromises(
        state,
        mirrorPeers,
        s3Configurations
      );
      setIsLoading(false);

      if (result.s3ConfigurationNames?.length) {
        // MCO provisions bucket, profile and DRClusters asynchronously.
        setPendingS3ConfigurationNames(result.s3ConfigurationNames);
      }

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

      if (!result.s3ConfigurationNames?.length) {
        onSuccess();
      }
    } catch (error) {
      setIsLoading(false);
      setCreateErrorMessage(getThrownMessage(error));
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

  const onS3ConfigurationComplete = React.useCallback(() => {
    setPendingS3ConfigurationNames([]);
    // Third-party has no MirrorPeer, so S3 ready is the last step.
    if (!policyPeerRef.current.pairingMirrorPeerName) {
      onSuccess();
    }
  }, [onSuccess]);

  const loaded = mirrorPeerLoaded && s3ConfigurationsLoaded;
  const loadedError = mirrorPeerLoadError || s3ConfigurationsLoadError;

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

  if (!loaded || loadedError) {
    return <StatusBox loaded={loaded} loadError={loadedError} />;
  }

  // S3 creates the DRClusters the policy references, so it must settle first.
  if (pendingS3ConfigurationNames.length) {
    return (
      <S3ConfigurationProgress
        s3ConfigurationNames={pendingS3ConfigurationNames}
        s3Configurations={s3Configurations}
        onComplete={onS3ConfigurationComplete}
        onClose={onCancel}
      />
    );
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
      clustersWithS3Configuration,
      prePairValidationPassed
    ),
    [CreateDRPolicyWizardSteps.Policy]: validatePolicyStepInputs(state),
    [CreateDRPolicyWizardSteps.Review]: validateReviewStepInputs(
      state,
      clustersWithS3Configuration,
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
          clustersWithS3Configuration={clustersWithS3Configuration}
          validation={prePairValidation}
          acknowledgedUnvalidatedSubmariner={acknowledgedUnvalidatedSubmariner}
          onAcknowledgeUnvalidatedSubmariner={(acknowledged) =>
            setAcknowledgedStatus(
              acknowledged ? prePairValidation.status : null
            )
          }
          onReplicationBackendChange={clearAcknowledgedStatus}
          docHref={submarinerDoc}
        />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Policy}
        name={stepNames[CreateDRPolicyWizardSteps.Policy]}
      >
        <PolicyStep
          state={state}
          dispatch={dispatch}
          docHref={gettingStartedDRDocs(DOC_VERSION).CREATE_POLICY_RDR}
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

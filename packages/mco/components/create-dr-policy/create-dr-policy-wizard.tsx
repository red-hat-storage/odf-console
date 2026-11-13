import * as React from 'react';
import { getS3ConfigurationResourceObj } from '@odf/mco/hooks';
import { getMajorVersion } from '@odf/mco/utils';
import { getThrownMessage } from '@odf/mco/utils/error-message';
import { getDescriptorById } from '@odf/mco/utils/storage-vendor-registry';
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
} from '../../constants';
import { getDRPolicyResourceObj } from '../../hooks/mco-resources';
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
  shouldRunPrePairValidation,
  validateClustersStepInputs,
  validateConfigureStepInputs,
  validatePolicyStepInputs,
  validateProviderStepInputs,
  validateReviewStepInputs,
} from './utils/step-validation';
import {
  ClustersStep,
  ConfigureClusterPairStep,
  PolicyStep,
  ProviderStep,
  ReviewDRPolicyStep,
} from './wizard-steps';
import { usePrePairChecks } from './wizard-steps/configure-cluster-pair-step/pre-pair-checks-runner';

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
  const [pendingS3ConfigurationNames, setPendingS3ConfigurationNames] =
    React.useState<string[]>([]);
  const [step, setStep] = React.useState(CreateDRPolicyWizardSteps.Clusters);
  const [acknowledgedChecks, setAcknowledgedChecks] = React.useState<
    Set<string>
  >(new Set());
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

  const clearAcknowledgedChecks = React.useCallback(() => {
    setAcknowledgedChecks(new Set());
  }, []);

  const handleAcknowledgeCheck = React.useCallback(
    (checkId: string, acknowledged: boolean) => {
      setAcknowledgedChecks((prev) => {
        const next = new Set(prev);
        if (acknowledged) {
          next.add(checkId);
        } else {
          next.delete(checkId);
        }
        return next;
      });
    },
    []
  );

  const [mirrorPeers, mirrorPeerLoaded, mirrorPeerLoadError] =
    useK8sWatchResource<MirrorPeerKind[]>({
      kind: referenceForModel(MirrorPeerModel),
      isList: true,
      namespaced: false,
    });

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

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
    clearAcknowledgedChecks();
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

  const loaded = mirrorPeerLoaded && drPoliciesLoaded && s3ConfigurationsLoaded;
  const loadedError =
    mirrorPeerLoadError || drPoliciesLoadError || s3ConfigurationsLoadError;

  const clusterNames = React.useMemo(
    () => state.clusters.selectedClusters.map(getName),
    [state.clusters.selectedClusters]
  );
  const shouldRunValidation = shouldRunPrePairValidation(state);
  const validationActive =
    shouldRunValidation && step !== CreateDRPolicyWizardSteps.Clusters;
  const descriptor = state.provider.storageVendor
    ? getDescriptorById(state.provider.storageVendor)
    : null;
  const { allLoaded, allPassed, requiresAcknowledgement } = usePrePairChecks(
    descriptor,
    validationActive,
    clusterNames
  );

  const prePairCheckResults = React.useMemo(() => {
    if (!descriptor) return new Map();
    const results = new Map();
    descriptor.prePairChecks.forEach((check) => {
      results.set(check.id, check.useCheck(clusterNames, validationActive));
    });
    return results;
  }, [descriptor, clusterNames, validationActive]);

  const allRequiredChecksAcknowledged = React.useMemo(() => {
    if (!descriptor) return true;
    return descriptor.prePairChecks.every((check) => {
      const result = check.useCheck(clusterNames, validationActive);
      const needsAck = requiresAcknowledgement(check.id, result);
      return !needsAck || acknowledgedChecks.has(check.id);
    });
  }, [
    descriptor,
    clusterNames,
    validationActive,
    requiresAcknowledgement,
    acknowledgedChecks,
  ]);

  const prePairValidationPassed =
    !validationActive ||
    (allLoaded && allPassed && allRequiredChecksAcknowledged);

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
    [CreateDRPolicyWizardSteps.Provider]: validateProviderStepInputs(state),
    [CreateDRPolicyWizardSteps.Configure]: validateConfigureStepInputs(
      state,
      clustersWithS3Configuration,
      prePairValidationPassed
    ),
    [CreateDRPolicyWizardSteps.Policy]: validatePolicyStepInputs(
      state,
      descriptor
    ),
    [CreateDRPolicyWizardSteps.Review]: validateReviewStepInputs(
      state,
      clustersWithS3Configuration,
      prePairValidationPassed,
      descriptor
    ),
  };

  const wizardSteps = descriptor?.steps ?? [
    CreateDRPolicyWizardSteps.Clusters,
    CreateDRPolicyWizardSteps.Provider,
  ];

  return (
    <Wizard
      className="pf-v6-u-h-75vh"
      navAriaLabel={t('Create DRPolicy steps')}
      isVisitRequired
      onStepChange={(_event, currentStep) => {
        const nextStep = currentStep.id as CreateDRPolicyWizardSteps;
        if (
          nextStep === CreateDRPolicyWizardSteps.Clusters ||
          nextStep === CreateDRPolicyWizardSteps.Provider
        ) {
          clearAcknowledgedChecks();
        }
        if (
          wizardSteps.includes(nextStep) ||
          nextStep === CreateDRPolicyWizardSteps.Clusters ||
          nextStep === CreateDRPolicyWizardSteps.Provider
        ) {
          setStep(nextStep);
        }
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
      {wizardSteps.map((stepId) => {
        const stepComponent = (() => {
          switch (stepId) {
            case CreateDRPolicyWizardSteps.Clusters:
              return (
                <ClustersStep
                  state={state}
                  dispatch={dispatch}
                  requiredODFVersion={odfMCOVersion}
                  preSelectedClusters={preSelectedClusters}
                  acmDoc={acmDoc}
                  mirrorPeers={mirrorPeers}
                  onSelectedClustersChange={clearAcknowledgedChecks}
                />
              );
            case CreateDRPolicyWizardSteps.Provider:
              return (
                <ProviderStep
                  selectedClusters={state.clusters.selectedClusters}
                  selectedVendor={state.provider.storageVendor}
                  mirrorPeers={mirrorPeers}
                  drPolicies={drPolicies}
                  dispatch={dispatch}
                  onProviderChange={clearAcknowledgedChecks}
                />
              );
            case CreateDRPolicyWizardSteps.Configure:
              return (
                <ConfigureClusterPairStep
                  storageVendor={state.provider.storageVendor}
                  selectedClusters={state.clusters.selectedClusters}
                  cluster1S3Details={state.configure.cluster1S3Details}
                  cluster2S3Details={state.configure.cluster2S3Details}
                  useSameS3Connection={state.configure.useSameS3Connection}
                  dispatch={dispatch}
                  clustersWithS3Configuration={clustersWithS3Configuration}
                  acknowledgedChecks={acknowledgedChecks}
                  onAcknowledgeCheck={handleAcknowledgeCheck}
                  docHref={submarinerDoc}
                />
              );
            case CreateDRPolicyWizardSteps.Policy:
              return (
                <PolicyStep
                  state={state}
                  dispatch={dispatch}
                  docHref={gettingStartedDRDocs(DOC_VERSION).CREATE_POLICY_RDR}
                />
              );
            case CreateDRPolicyWizardSteps.Review:
              return (
                <ReviewDRPolicyStep
                  state={state}
                  prePairCheckResults={prePairCheckResults}
                />
              );
            default:
              return null;
          }
        })();

        return (
          <WizardStep key={stepId} id={stepId} name={stepNames[stepId]}>
            {stepComponent}
          </WizardStep>
        );
      })}
    </Wizard>
  );
};

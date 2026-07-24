import * as React from 'react';
import { usePrePairNetworkValidation } from '@odf/mco/hooks';
import { getMajorVersion, shouldRunPrePairValidation } from '@odf/mco/utils';
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
import { FormGroup, Wizard, WizardStep } from '@patternfly/react-core';
import {
  ACM_OPERATOR_SPEC_NAME,
  acmDocHome,
  acmSubmarinerDoc,
  BackendType,
  CreateDRPolicyStepNames,
  CreateDRPolicyWizardSteps,
  MAX_ALLOWED_CLUSTERS,
  ODFMCO_OPERATOR,
} from '../../constants';
import '../../style.scss';
import { DRClusterKind, MirrorPeerKind, S3StoreProfile } from '../../types';
import { fetchRamenS3Profiles } from '../../utils/tps-payload-creator';
import { S3Details } from './add-s3-bucket-details/s3-bucket-details-form';
import { ClustersStep } from './clusters-step';
import { ConfigureClusterPairStep } from './configure-cluster-pair-step';
import './create-dr-policy.scss';
import { CreateDRPolicyWizardFooter } from './footer';
import { PolicyStep } from './policy-step';
import { PrePairNetworkValidation } from './pre-pair-network-validation';
import { ReviewDRPolicyStep } from './review-dr-policy-step';
import { createPolicyPromises } from './utils/k8s-utils';
import {
  DRPolicyActionType,
  drPolicyInitialState,
  drPolicyReducer,
  DRPolicyState,
} from './utils/reducer';
import {
  isFilled,
  validateClustersStepInputs,
  validateConfigureStepInputs,
} from './utils/step-validation';

const validatePolicyInputs = (state: DRPolicyState): boolean =>
  isFilled(state.policyName) && !!state.replicationType;

const validateDRPolicyInputs = (
  state: DRPolicyState,
  allDRClustersExist = false,
  prePairValidationPassed = true
): boolean =>
  validatePolicyInputs(state) &&
  validateClustersStepInputs(state) &&
  validateConfigureStepInputs(
    state,
    allDRClustersExist,
    prePairValidationPassed
  );

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

export interface CreateDRPolicyFormProps {
  preSelectedClusters?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateDRPolicyForm: React.FC<CreateDRPolicyFormProps> = ({
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
      state.selectedClusters.length === MAX_ALLOWED_CLUSTERS &&
      drClustersLoaded &&
      !drClustersLoadError
    ) {
      const drCluster1 = drClusters.find(
        (drCluster) => getName(drCluster) === getName(state.selectedClusters[0])
      );
      const drCluster2 = drClusters.find(
        (drCluster) => getName(drCluster) === getName(state.selectedClusters[1])
      );
      return [drCluster1, drCluster2].filter(Boolean) as DRClusterKind[];
    }
    return [];
  }, [
    state.selectedClusters,
    drClusters,
    drClustersLoaded,
    drClustersLoadError,
  ]);

  React.useEffect(() => {
    const loadS3ProfileDetails = async () => {
      if (
        state.replicationBackend === BackendType.ThirdParty &&
        selectedDRClusters.length === MAX_ALLOWED_CLUSTERS
      ) {
        setS3ErrorMessage('');
        try {
          const ramenS3Profiles = await fetchRamenS3Profiles();

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
          setS3ErrorMessage(
            t('Failed to load S3 profile details: {{error}}', {
              error: (error as Error)?.message || JSON.stringify(error),
            })
          );
        }
      }
    };

    loadS3ProfileDetails();
  }, [selectedDRClusters, dispatch, state.replicationBackend, t]);

  const onCreate = async () => {
    try {
      setCreateErrorMessage('');
      setIsLoading(true);
      await createPolicyPromises(state, mirrorPeers, selectedDRClusters);
      onSuccess();
    } catch (error) {
      setIsLoading(false);
      setCreateErrorMessage((error as Error)?.message || JSON.stringify(error));
    }
  };

  const loaded = mirrorPeerLoaded && drClustersLoaded;
  const loadedError = mirrorPeerLoadError || drClustersLoadError;

  const clusterNames = state.selectedClusters.map(getName);
  const shouldRunValidation = shouldRunPrePairValidation(
    state.selectedClusters.length,
    state.isClusterSelectionValid,
    state.replicationBackend === BackendType.DataFoundation
  );
  // Cluster pair validation runs only after the user leaves the clusters page.
  const validationActive =
    shouldRunValidation && step !== CreateDRPolicyWizardSteps.Clusters;
  const prePairValidation = usePrePairNetworkValidation(
    clusterNames,
    validationActive
  );
  const prePairValidationPassed =
    !validationActive || prePairValidation.canProceed;

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

  const stepNames = CreateDRPolicyStepNames(t);
  const stepValidity: Record<CreateDRPolicyWizardSteps, boolean> = {
    [CreateDRPolicyWizardSteps.Clusters]: validateClustersStepInputs(state),
    [CreateDRPolicyWizardSteps.Configure]: validateConfigureStepInputs(
      state,
      allDRClustersExist,
      prePairValidationPassed
    ),
    [CreateDRPolicyWizardSteps.Policy]: validatePolicyInputs(state),
    [CreateDRPolicyWizardSteps.Review]: validateDRPolicyInputs(
      state,
      allDRClustersExist,
      prePairValidationPassed
    ),
  };

  return (
    <Wizard
      className="mco-create-data-policy__wizard--height"
      navAriaLabel={t('Create DRPolicy steps')}
      isVisitRequired
      onStepChange={(_event, currentStep) =>
        setStep(currentStep.id as CreateDRPolicyWizardSteps)
      }
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
        />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Configure}
        name={stepNames[CreateDRPolicyWizardSteps.Configure]}
      >
        <ConfigureClusterPairStep
          replicationBackend={state.replicationBackend}
          selectedClusters={state.selectedClusters}
          selectedClustersHaveODF={state.selectedClustersHaveODF}
          cluster1S3Details={state.cluster1S3Details}
          cluster2S3Details={state.cluster2S3Details}
          useSameS3Connection={state.useSameS3Connection}
          dispatch={dispatch}
          clusterNames={clusterNames}
          selectedDRClusters={selectedDRClusters}
          validation={prePairValidation}
          docHref={submarinerDoc}
          errorMessage={s3ErrorMessage}
        />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Policy}
        name={stepNames[CreateDRPolicyWizardSteps.Policy]}
      >
        <PolicyStep state={state} dispatch={dispatch} />
      </WizardStep>
      <WizardStep
        id={CreateDRPolicyWizardSteps.Review}
        name={stepNames[CreateDRPolicyWizardSteps.Review]}
      >
        <ReviewDRPolicyStep
          state={state}
          networkStatus={
            shouldRunValidation ? (
              <FormGroup fieldId="review-cluster-network">
                <PrePairNetworkValidation
                  clusterNames={clusterNames}
                  validation={prePairValidation}
                  docHref={submarinerDoc}
                />
              </FormGroup>
            ) : undefined
          }
        />
      </WizardStep>
    </Wizard>
  );
};

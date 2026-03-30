import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { NooBaaBucketClassModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { useParams, useNavigate } from 'react-router-dom-v5-compat';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Title,
  Wizard,
  WizardStep,
  WizardFooterWrapper,
  useWizardContext,
} from '@patternfly/react-core';
import { NamespacePolicyType } from '../../constants';
import { BucketClassType, PlacementPolicy } from '../../types';
import { validateBucketClassName, validateDuration } from '../../utils';
import { Action, initialState, reducer, State } from './state';
import BackingStorePage from './wizard-pages/backingstore-page';
import GeneralPage from './wizard-pages/general-page';
import { NamespacePolicyPage } from './wizard-pages/namespace-policy-page';
import { CacheNamespaceStorePage } from './wizard-pages/namespace-store-pages/cache-namespace-store';
import { MultiNamespaceStorePage } from './wizard-pages/namespace-store-pages/multi-namespace-store';
import { SingleNamespaceStorePage } from './wizard-pages/namespace-store-pages/single-namespace-store';
import PlacementPolicyPage from './wizard-pages/placement-policy-page';
import ReviewPage from './wizard-pages/review-page';
import './create-bc.scss';
import '../../style.scss';

enum CreateStepsBC {
  GENERAL = 'GENERAL',
  PLACEMENT = 'PLACEMENT',
  RESOURCES = 'RESOURCES',
  REVIEW = 'REVIEW',
}

export const NS_STORE_MODAL_KEY = 'BC_CREATE_WIZARD_NS_STORE_CREATE_MODAL';

const NamespaceStoreCreateModal = React.lazy(
  () => import('../namespace-store/namespace-store-modal')
);
const CreateBackingStoreFormModal = React.lazy(
  () => import('../create-bs/create-bs-modal')
);

type BucketClassWizardFooterProps = {
  state: State;
  dispatch: React.Dispatch<Action>;
  namespace: string;
};

const BucketClassWizardFooter: React.FC<BucketClassWizardFooterProps> = ({
  state,
  dispatch,
  namespace,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();

  const [showErrorAlert, setShowErrorAlert] = React.useState(false);

  const currentStepId = activeStep.id as string;

  const backingStoreNextConditions = React.useCallback(() => {
    if (state.tier1BackingStore.length === 0) return false;
    if (
      state.tier1Policy === PlacementPolicy.Mirror &&
      state.tier1BackingStore.length < 2
    )
      return false;
    if (
      state.tier2Policy === PlacementPolicy.Mirror &&
      state.tier2BackingStore.length < 2
    )
      return false;
    if (!!state.tier2Policy && state.tier2BackingStore.length === 0)
      return false;
    return true;
  }, [
    state.tier1BackingStore.length,
    state.tier1Policy,
    state.tier2BackingStore.length,
    state.tier2Policy,
  ]);

  const namespaceStoreNextConditions = React.useCallback(() => {
    if (state.namespacePolicyType === NamespacePolicyType.SINGLE) {
      return (
        state.readNamespaceStore.length === 1 &&
        state.writeNamespaceStore.length === 1
      );
    }
    if (state.namespacePolicyType === NamespacePolicyType.CACHE) {
      return (
        !!state.hubNamespaceStore &&
        !!state.cacheBackingStore &&
        validateDuration(state.timeToLive)
      );
    }
    if (state.namespacePolicyType === NamespacePolicyType.MULTI) {
      return (
        state.readNamespaceStore.length >= 1 &&
        state.writeNamespaceStore.length === 1
      );
    }
    return false;
  }, [
    state.namespacePolicyType,
    state.readNamespaceStore.length,
    state.writeNamespaceStore.length,
    state.hubNamespaceStore,
    state.cacheBackingStore,
    state.timeToLive,
  ]);

  const creationConditionsSatisfied = React.useCallback(() => {
    return (
      (state.bucketClassType === BucketClassType.STANDARD
        ? backingStoreNextConditions()
        : namespaceStoreNextConditions()) && !!state.bucketClassName
    );
  }, [
    state.bucketClassType,
    state.bucketClassName,
    backingStoreNextConditions,
    namespaceStoreNextConditions,
  ]);

  const canProceed = React.useMemo(() => {
    switch (currentStepId) {
      case CreateStepsBC.GENERAL:
        return validateBucketClassName(state.bucketClassName.trim());
      case CreateStepsBC.PLACEMENT:
        return state.bucketClassType === BucketClassType.STANDARD
          ? !!state.tier1Policy
          : !!state.namespacePolicyType;
      case CreateStepsBC.RESOURCES:
        return state.bucketClassType === BucketClassType.STANDARD
          ? backingStoreNextConditions()
          : namespaceStoreNextConditions();
      case CreateStepsBC.REVIEW:
        return creationConditionsSatisfied();
      default:
        return false;
    }
  }, [
    currentStepId,
    state.bucketClassName,
    state.bucketClassType,
    state.tier1Policy,
    state.namespacePolicyType,
    backingStoreNextConditions,
    namespaceStoreNextConditions,
    creationConditionsSatisfied,
  ]);

  const getPayload = React.useCallback(() => {
    const metadata = {
      apiVersion: getAPIVersionForModel(NooBaaBucketClassModel),
      kind: NooBaaBucketClassModel.kind,
      metadata: {
        name: state.bucketClassName,
        namespace: namespace,
      },
    };
    let payload = null;
    if (state.bucketClassType === BucketClassType.STANDARD) {
      payload = {
        ...metadata,
        spec: {
          placementPolicy: {
            tiers: [
              {
                placement: state.tier1Policy,
                backingStores: state.tier1BackingStore.map(getName),
              },
            ],
          },
        },
      };
      if (state.tier2Policy) {
        payload.spec.placementPolicy.tiers.push({
          placement: state.tier2Policy,
          backingStores: state.tier2BackingStore.map(getName),
        });
      }
    } else {
      switch (state.namespacePolicyType) {
        case NamespacePolicyType.SINGLE:
          payload = {
            ...metadata,
            spec: {
              namespacePolicy: {
                type: state.namespacePolicyType,
                single: {
                  resource: getName(state.readNamespaceStore[0]),
                },
              },
            },
          };
          break;
        case NamespacePolicyType.MULTI:
          payload = {
            ...metadata,
            spec: {
              namespacePolicy: {
                type: state.namespacePolicyType,
                multi: {
                  writeResource: getName(state.writeNamespaceStore[0]),
                  readResources: state.readNamespaceStore.map(getName),
                },
              },
            },
          };
          break;
        case NamespacePolicyType.CACHE:
          payload = {
            ...metadata,
            spec: {
              namespacePolicy: {
                type: state.namespacePolicyType,
                cache: {
                  caching: {
                    ttl: state.timeToLive,
                  },
                  hubResource: getName(state.hubNamespaceStore),
                },
              },
              placementPolicy: {
                tiers: [
                  {
                    backingStores: [getName(state.cacheBackingStore)],
                  },
                ],
              },
            },
          };
          break;
        default:
          return null;
      }
    }
    return payload;
  }, [namespace, state]);

  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const finalStep = React.useCallback(() => {
    dispatch({ type: 'setIsLoading', value: true });
    const payload = getPayload();
    const promiseObj = k8sCreate({
      model: NooBaaBucketClassModel,
      data: payload,
    });
    promiseObj
      .then((obj) => {
        if (!isMountedRef.current) return;
        const resourcePath = `${referenceForModel(
          NooBaaBucketClassModel
        )}/${getName(obj)}`;
        dispatch({ type: 'setIsLoading', value: false });
        navigate(`/odf/resource/${resourcePath}`);
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        dispatch({ type: 'setIsLoading', value: false });
        dispatch({ type: 'setError', value: err.message });
      });
  }, [dispatch, getPayload, navigate]);

  const handleNext = () => {
    if (currentStepId === CreateStepsBC.REVIEW) {
      finalStep();
    } else {
      goToNextStep();
    }
  };

  const isLoading = state.isLoading;

  React.useEffect(() => {
    if (state.error) {
      setShowErrorAlert(true);
    }
  }, [state.error]);

  return (
    <>
      {showErrorAlert && state.error && (
        <Alert
          className="nb-create-bc-wizard__alert"
          variant="danger"
          isInline
          actionClose={
            <AlertActionCloseButton
              onClose={() => {
                setShowErrorAlert(false);
                dispatch({ type: 'setError', value: '' });
              }}
            />
          }
          title={t('An error has occurred')}
        >
          {state.error}
        </Alert>
      )}
      <WizardFooterWrapper>
        <Button
          isLoading={isLoading}
          isDisabled={!canProceed || isLoading}
          variant="primary"
          onClick={handleNext}
        >
          {currentStepId === CreateStepsBC.REVIEW
            ? t('Create BucketClass')
            : t('Next')}
        </Button>
        <Button
          variant="secondary"
          onClick={goToPrevStep}
          isDisabled={currentStepId === CreateStepsBC.GENERAL || isLoading}
        >
          {t('Back')}
        </Button>
        <Button
          variant="link"
          onClick={() => navigate(-1)}
          isDisabled={isLoading}
        >
          {t('Cancel')}
        </Button>
      </WizardFooterWrapper>
    </>
  );
};

const CreateBucketClass: React.FC = () => {
  const { t } = useCustomTranslation();

  const { odfNamespace } = useODFNamespaceSelector();

  const [state, dispatch] = React.useReducer(reducer, initialState);
  const { ns } = useParams();
  const namespace = ns || odfNamespace;

  const launcher = useModal();

  const launchNamespaceStoreModal = React.useCallback(
    () => launcher(NamespaceStoreCreateModal, { isOpen: true }),
    [launcher]
  );
  const launchBackingStoreModal = React.useCallback(
    () => launcher(CreateBackingStoreFormModal, { isOpen: true }),
    [launcher]
  );

  const renderNamespaceStorePage = () => {
    switch (state.namespacePolicyType) {
      case NamespacePolicyType.SINGLE:
        return (
          <SingleNamespaceStorePage
            state={state}
            dispatch={dispatch}
            namespace={namespace}
            launchModal={launchNamespaceStoreModal}
          />
        );
      case NamespacePolicyType.CACHE:
        return (
          <CacheNamespaceStorePage
            state={state}
            dispatch={dispatch}
            namespace={namespace}
            launchModal={launchNamespaceStoreModal}
            launchBackingStoreModal={launchBackingStoreModal}
          />
        );
      case NamespacePolicyType.MULTI:
        return (
          <MultiNamespaceStorePage
            state={state}
            dispatch={dispatch}
            namespace={namespace}
            launchModal={launchNamespaceStoreModal}
          />
        );
      default:
        return null;
    }
  };

  const steps = [
    {
      id: CreateStepsBC.GENERAL,
      name: t('General'),
      component: (
        <GeneralPage dispatch={dispatch} state={state} namespace={namespace} />
      ),
    },
    {
      id: CreateStepsBC.PLACEMENT,
      name: t('Placement Policy'),
      component:
        state.bucketClassType === BucketClassType.STANDARD ? (
          <PlacementPolicyPage state={state} dispatch={dispatch} />
        ) : (
          <NamespacePolicyPage state={state} dispatch={dispatch} />
        ),
    },
    {
      id: CreateStepsBC.RESOURCES,
      name: t('Resources'),
      component:
        state.bucketClassType === BucketClassType.STANDARD ? (
          <BackingStorePage
            state={state}
            dispatcher={dispatch}
            namespace={namespace}
          />
        ) : (
          renderNamespaceStorePage()
        ),
    },
    {
      id: CreateStepsBC.REVIEW,
      name: t('Review'),
      component: <ReviewPage state={state} />,
    },
  ];

  return (
    <>
      <div className="odf-create-operand__header">
        <Title
          size="2xl"
          headingLevel="h1"
          className="odf-create-operand__header-text"
        >
          {t('Create new BucketClass')}
        </Title>
        <p className="help-block">
          {t(
            'BucketClass is a CRD representing a class for buckets that defines tiering policies and data placements for an OBC.'
          )}
        </p>
      </div>
      <div className="nb-create-bc-wizard">
        <NamespaceSafetyBox>
          <Wizard
            isVisitRequired
            footer={
              <BucketClassWizardFooter
                state={state}
                dispatch={dispatch}
                namespace={namespace}
              />
            }
          >
            {steps.map((step) => (
              <WizardStep key={step.id} id={step.id} name={step.name}>
                {step.component}
              </WizardStep>
            ))}
          </Wizard>
        </NamespaceSafetyBox>
      </div>
    </>
  );
};

export default CreateBucketClass;

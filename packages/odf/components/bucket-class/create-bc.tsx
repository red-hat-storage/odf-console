import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { RouteComponentProps, useHistory } from 'react-router';
import { Title, Wizard, WizardStep } from '@patternfly/react-core';
import { NamespacePolicyType } from '../../constants';
import { NooBaaBucketClassModel } from '../../models';
import { BucketClassType, PlacementPolicy } from '../../types';
import { validateBucketClassName, validateDuration } from '../../utils';
import { initialState, reducer, State } from './state';
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

const CreateBucketClass: React.FC<CreateBCProps> = ({ match }) => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const { ns = CEPH_STORAGE_NAMESPACE } = match.params;

  const launcher = useModal();

  const history = useHistory();

  const launchModal = React.useCallback(
    () => launcher(NamespaceStoreCreateModal, { isOpen: true }),
    [launcher]
  );

  const getNamespaceStorePage = () => {
    switch (state.namespacePolicyType) {
      case NamespacePolicyType.SINGLE:
        return (
          <SingleNamespaceStorePage
            state={state}
            dispatch={dispatch}
            namespace={ns}
            launchModal={launchModal}
          />
        );
      case NamespacePolicyType.CACHE:
        return (
          <CacheNamespaceStorePage
            state={state}
            dispatch={dispatch}
            namespace={ns}
            launchModal={launchModal}
          />
        );
      case NamespacePolicyType.MULTI:
        return (
          <MultiNamespaceStorePage
            state={state}
            dispatch={dispatch}
            namespace={ns}
            launchModal={launchModal}
          />
        );
      default:
        return null;
    }
  };

  const getPayload = (currentState: State) => {
    const metadata = {
      apiVersion: getAPIVersionForModel(NooBaaBucketClassModel),
      kind: NooBaaBucketClassModel.kind,
      metadata: {
        name: currentState.bucketClassName,
        namespace: ns,
      },
    };
    let payload = null;
    if (currentState.bucketClassType === BucketClassType.STANDARD) {
      payload = {
        ...metadata,
        spec: {
          placementPolicy: {
            tiers: [
              {
                placement: currentState.tier1Policy,
                backingStores: currentState.tier1BackingStore.map(getName),
              },
            ],
          },
        },
      };
      if (currentState.tier2Policy) {
        payload.spec.placementPolicy.tiers.push({
          placement: currentState.tier2Policy,
          backingStores: currentState.tier2BackingStore.map(getName),
        });
      }
    } else {
      switch (currentState.namespacePolicyType) {
        case NamespacePolicyType.SINGLE:
          payload = {
            ...metadata,
            spec: {
              namespacePolicy: {
                type: currentState.namespacePolicyType,
                single: {
                  resource: getName(currentState.readNamespaceStore[0]),
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
                type: currentState.namespacePolicyType,
                cache: {
                  caching: {
                    ttl: currentState.timeToLive,
                  },
                  hubResource: getName(currentState.hubNamespaceStore),
                },
              },
              placementPolicy: {
                tiers: [
                  {
                    backingStores: [getName(currentState.cacheBackingStore)],
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
  };
  const finalStep = () => {
    dispatch({ type: 'setIsLoading', value: true });
    const payload = getPayload(state);
    const promiseObj = k8sCreate({
      model: NooBaaBucketClassModel,
      data: payload,
    });
    promiseObj
      .then((obj) => {
        const resourcePath = `${referenceForModel(
          NooBaaBucketClassModel
        )}/${getName(obj)}`;
        dispatch({ type: 'setIsLoading', value: false });
        history.push(`/odf/resource/${resourcePath}`);
      })
      .catch((err) => {
        dispatch({ type: 'setIsLoading', value: false });
        dispatch({ type: 'setError', value: err.message });
      });
  };

  const backingStoreNextConditions = () => {
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
  };

  const namespaceStoreNextConditions = () => {
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
  };

  const creationConditionsSatisfied = () => {
    return (
      (state.bucketClassType === BucketClassType.STANDARD
        ? backingStoreNextConditions()
        : namespaceStoreNextConditions()) && !!state.bucketClassName
    );
  };

  const [currentStep, setCurrentStep] = React.useState(1);
  const [stepsReached, setStepsReached] = React.useState(1);

  const StepPositionMap = Object.entries(CreateStepsBC).reduce(
    (acc, cur, index) => {
      acc[cur[0]] = index + 1;
      return acc;
    },
    {}
  );

  const canJumpToHelper = (that) => {
    const currentId = StepPositionMap[that.id];
    if (currentId === currentStep && !that.enableNext) {
      setStepsReached(currentId);
    }
    return stepsReached >= currentId;
  };

  const steps: WizardStep[] = [
    {
      id: CreateStepsBC.GENERAL,
      name: t('General'),
      component: (
        <GeneralPage dispatch={dispatch} state={state} namespace={ns} />
      ),
      enableNext: validateBucketClassName(state.bucketClassName.trim()),
      get canJumpTo() {
        return canJumpToHelper(this);
      },
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
      enableNext:
        state.bucketClassType === BucketClassType.STANDARD
          ? !!state.tier1Policy
          : !!state.namespacePolicyType,
      get canJumpTo() {
        return canJumpToHelper(this);
      },
    },
    {
      id: CreateStepsBC.RESOURCES,
      name: t('Resources'),
      component:
        state.bucketClassType === BucketClassType.STANDARD ? (
          <BackingStorePage
            state={state}
            dispatcher={dispatch}
            namespace={ns}
          />
        ) : (
          getNamespaceStorePage()
        ),
      enableNext:
        state.bucketClassType === BucketClassType.STANDARD
          ? backingStoreNextConditions()
          : namespaceStoreNextConditions(),
      get canJumpTo() {
        return canJumpToHelper(this);
      },
    },
    {
      id: CreateStepsBC.REVIEW,
      name: t('Review'),
      component: <ReviewPage state={state} />,
      nextButtonText: t('Create BucketClass'),
      enableNext: creationConditionsSatisfied(),
      get canJumpTo() {
        return canJumpToHelper(this);
      },
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
        <Wizard
          steps={steps}
          cancelButtonText={t('Cancel')}
          nextButtonText={t('Next')}
          backButtonText={t('Back')}
          onSave={finalStep}
          onClose={() => history.goBack()}
          onNext={({ id }) => {
            setCurrentStep(currentStep + 1);
            const idIndexPlusOne = StepPositionMap[id];
            const newStepHigherBound =
              stepsReached < idIndexPlusOne ? idIndexPlusOne : stepsReached;
            setStepsReached(newStepHigherBound);
          }}
          onBack={() => {
            setCurrentStep(currentStep - 1);
          }}
          onGoToStep={(newStep) => {
            setCurrentStep(StepPositionMap[newStep.id]);
          }}
        />
      </div>
    </>
  );
};

type CreateBCProps = RouteComponentProps<{ ns?: string; appName?: string }>;

export default CreateBucketClass;

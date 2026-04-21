import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  BackingStorageType,
  DeploymentType,
  StartingPoint,
} from '@odf/core/types';
import {
  StorageClassWizardStepExtensionProps as ExternalStorage,
  isStorageClassWizardStep,
} from '@odf/odf-plugin-sdk/extensions';
import { useK8sList, DOC_VERSION } from '@odf/shared';
import { DEFAULT_INFRASTRUCTURE, tnfHomePage } from '@odf/shared/constants';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  CustomResourceDefinitionModel,
  InfrastructureModel,
  NamespaceModel,
  StorageClusterModel,
} from '@odf/shared/models';
import {
  CustomResourceDefinitionKind,
  InfrastructureKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInfrastructurePlatform } from '@odf/shared/utils';
import { ViewDocumentation } from '@odf/shared/utils/doc-utils';
import {
  useK8sWatchResource,
  useResolvedExtensions,
} from '@openshift-console/dynamic-plugin-sdk';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import * as _ from 'lodash-es';
import { useNavigate, useLocation } from 'react-router-dom-v5-compat';
import {
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import { EmptyState, Spinner } from '@patternfly/react-core';
import { CREATE_SS_PAGE_URL, Steps, StepsName } from '../../constants';
import { hasAnyExternalOCS, hasAnyInternalOCS } from '../../utils';
import { createSteps } from './create-steps';
import {
  BackingStorage,
  OptionalSettings,
} from './create-storage-system-steps';
import { EXTERNAL_CEPH_STORAGE } from './external-systems/CreateCephSystem/CephConnectionDetails/system-connection-details';
import { CreateStorageSystemFooter } from './footer';
import { CreateStorageSystemHeader } from './header';
import { initialState, reducer, WizardReducer } from './reducer';
import './create-storage-system.scss';
import useTNFValidation from './useTNFValidation';

const useIsStorageClusterCRDPresent = (): boolean => {
  const [crds, crdsLoaded, crdsError] = useK8sWatchResource<
    CustomResourceDefinitionKind[]
  >({
    groupVersionKind: {
      group: CustomResourceDefinitionModel.apiGroup,
      version: CustomResourceDefinitionModel.apiVersion,
      kind: CustomResourceDefinitionModel.kind,
    },
    isList: true,
    optional: true,
  });
  const storageClusterCRD = crds?.filter(
    (crd) => crd.spec.names.kind === StorageClusterModel.kind
  );

  const isStorageClusterCRDPresent =
    crdsLoaded && _.isEmpty(crdsError) && storageClusterCRD.length > 0;

  return isStorageClusterCRDPresent;
};

const convertModeToDeploymentType = (mode: string): DeploymentType => {
  switch (mode) {
    case StartingPoint.STORAGE_CLUSTER:
      return DeploymentType.FULL;
    case StartingPoint.OBJECT_STORAGE:
      return DeploymentType.MCG;
  }
};

export const RedirectStorageSystem: React.FC<{}> = () => {
  const navigate = useNavigate();
  const { pathname: url } = useLocation();

  if (url !== CREATE_SS_PAGE_URL) {
    navigate(CREATE_SS_PAGE_URL, { replace: true });
  }

  return null;
};

type CreateStorageSystemProps = {
  isTNFEnabled: boolean;
};
const CreateStorageSystem: React.FC<CreateStorageSystemProps> = ({
  isTNFEnabled,
}) => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer<WizardReducer>(
    reducer,
    initialState
  );
  const location = useLocation();

  React.useEffect(() => {
    // To set up deployment type based the URL
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode');
    const storageClass = urlParams.get('storageClass');
    if (mode) {
      dispatch({
        type: 'backingStorage/setDeployment',
        payload: convertModeToDeploymentType(mode),
      });
    }
    if (storageClass) {
      dispatch({
        type: 'wizard/setStorageClass',
        payload: { name: storageClass },
      });
      dispatch({
        type: 'backingStorage/setType',
        payload: BackingStorageType.EXISTING,
      });
    }
  }, [location.search]);

  const [infra, infraLoaded, infraLoadError] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );
  const [namespaces, namespacesLoaded, namespacesError] =
    useK8sList(NamespaceModel);

  const [extensions, extensionsResolved] = useResolvedExtensions(
    isStorageClassWizardStep
  );

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();

  const infraType = getInfrastructurePlatform(infra);

  let wizardSteps = [];
  let hasOCS: boolean = false;
  let hasExternal: boolean = false;
  let hasInternal: boolean = false;
  let hasMultipleClusters: boolean = false;

  const supportedExternalStorage: ExternalStorage[] = React.useMemo(() => {
    if (extensionsResolved) {
      return [
        ...EXTERNAL_CEPH_STORAGE,
        ...((extensions?.map((vendor) => vendor.properties) ??
          []) as unknown as ExternalStorage[]),
      ];
    }
    return EXTERNAL_CEPH_STORAGE;
  }, [extensions, extensionsResolved]);

  const allLoaded = areFlagsLoaded && infraLoaded && namespacesLoaded;
  const anyError = flagsLoadError || infraLoadError || namespacesError;

  if (allLoaded && !anyError) {
    hasExternal = hasAnyExternalOCS(systemFlags);
    hasInternal = hasAnyInternalOCS(systemFlags);
    hasOCS = hasExternal || hasInternal;
    hasMultipleClusters = hasExternal && hasInternal;

    wizardSteps = createSteps(
      t,
      state,
      dispatch,
      infraType,
      hasOCS,
      supportedExternalStorage,
      hasMultipleClusters,
      isTNFEnabled
    );
  }

  const steps = [
    {
      id: 1,
      name: StepsName(t)[Steps.BackingStorage],
      component: (
        <BackingStorage
          state={state.backingStorage}
          storageClass={state.storageClass}
          dispatch={dispatch}
          hasOCS={hasOCS}
          hasExternal={hasExternal}
          hasInternal={hasInternal}
          stepIdReached={state.stepIdReached}
          infraType={infraType}
          isTNFEnabled={isTNFEnabled}
          error={anyError}
          loaded={allLoaded}
          supportedExternalStorage={supportedExternalStorage}
        />
      ),
      canJumpTo: true,
    },
    {
      id: 2,
      name: StepsName(t)[Steps.OptionalSettings],
      component: (
        <OptionalSettings
          state={state.optionalSettings}
          dispatch={dispatch}
          hasOCS={hasOCS}
          hasMultipleClusters={hasMultipleClusters}
          deployment={state.backingStorage.deployment}
          backingStorageType={state.backingStorage.type}
          isTNFEnabled={isTNFEnabled}
        />
      ),
      canJumpTo: true,
    },
    ...wizardSteps,
  ];

  return (
    <>
      <CreateStorageSystemHeader state={state} />
      <Wizard
        className="odf-create-storage-system-wizard"
        isVisitRequired
        footer={
          <CreateStorageSystemFooter
            state={state}
            hasOCS={hasOCS}
            dispatch={dispatch}
            disableNext={!allLoaded || !!anyError}
            supportedExternalStorage={supportedExternalStorage}
            existingNamespaces={namespaces}
            isTNFEnabled={isTNFEnabled}
          />
        }
      >
        {steps.map((step) => (
          <WizardStep key={step.id} id={step.id} name={step.name}>
            {step.component}
          </WizardStep>
        ))}
      </Wizard>
    </>
  );
};

const CreateStorageSystemWtihLoader: React.FC = () => {
  const { t } = useCustomTranslation();
  // In case it randomly goes loading or refetches
  const [isCrdPresent, setIsCrdPresent] = React.useState(false);
  const isStorageClusterCRDPresent = useIsStorageClusterCRDPresent();
  // It takes a while for the CRD to be present
  const [delayedShow, setDelayedShow] = React.useState(false);
  const { isTNFEnabled, isTNFValidationLoading, isTNFValidated } =
    useTNFValidation();

  React.useEffect(() => {
    if (isStorageClusterCRDPresent && !isCrdPresent) {
      setIsCrdPresent(true);
    }
  }, [isCrdPresent, isStorageClusterCRDPresent]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isCrdPresent) {
      timer = setTimeout(() => setDelayedShow(true), 5000);
    }

    return () => clearTimeout(timer);
  }, [isCrdPresent]);

  const isLoading = isTNFValidationLoading || !isCrdPresent || !delayedShow;
  const isTNFValidationError = isTNFEnabled && !isTNFValidated;

  if (!isLoading && !isTNFValidationError) {
    return <CreateStorageSystem isTNFEnabled={isTNFEnabled} />;
  }

  return (
    <>
      <CreateStorageSystemHeader state={{} as any} />
      {isLoading ? (
        <EmptyState
          icon={Spinner}
          className="odf-create-storage-system-wizard__empty-state"
          data-test="create-wizard-empty-state"
        >
          <EmptyStateBody>
            <p>
              {t(
                'Data Foundation is gathering required resources, this may take up to a minute.'
              )}
            </p>
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <EmptyState
          headingLevel="h4"
          icon={ExclamationCircleIcon}
          titleText={t('Error')}
        >
          <EmptyStateBody>
            <p>
              {t(
                'There was an issue while validating the two node configuration on this cluster.'
              )}
            </p>
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <ViewDocumentation
                doclink={tnfHomePage(DOC_VERSION)}
                text={t('Setting up TNF homepage')}
                padding="0"
              />{' '}
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      )}
    </>
  );
};

export default CreateStorageSystemWtihLoader;

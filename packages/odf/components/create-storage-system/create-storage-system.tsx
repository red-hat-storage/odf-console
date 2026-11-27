import * as React from 'react';
import {
  useODFSystemFlagsSelector,
  useODFNamespaceSelector,
} from '@odf/core/redux';
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
import { useNavigate, useLocation } from 'react-router';
import {
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import { EmptyState, Spinner } from '@patternfly/react-core';
import {
  CREATE_SS_PAGE_URL,
  HCI_DISK_DISCOVERY_DEFAULTS,
  NO_PROVISIONER,
  Steps,
  StepsName,
} from '../../constants';
import { hasAnyExternalOCS, hasAnyInternalOCS } from '../../utils';
import { createSteps } from './create-steps';
import {
  BackingStorage,
  OptionalSettings,
} from './create-storage-system-steps';
import {
  UseHCIDisksResult,
  HCIDiskProfile,
} from './create-storage-system-steps/create-local-volume-set-step/useHCIDisks';
import { EXTERNAL_CEPH_STORAGE } from './external-systems/CreateCephSystem/CephConnectionDetails/system-connection-details';
import { CreateStorageSystemFooter } from './footer';
import { CreateStorageSystemHeader } from './header';
import {
  initialState,
  reducer,
  WizardReducer,
  WizardState,
  wizardStateInitializer,
} from './reducer';
import { useHCILoadingOrchestrator } from './useHCILoadingOrchestrator';
import useTNFValidation from './useTNFValidation';
import './create-storage-system.scss';

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
  isHCIEnabled: boolean;
  hciResults: UseHCIDisksResult;
  diskProfile?: HCIDiskProfile | null;
};
const CreateStorageSystem: React.FC<CreateStorageSystemProps> = ({
  isTNFEnabled,
  isHCIEnabled,
  hciResults,
  diskProfile,
}) => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer<WizardReducer, WizardState>(
    reducer,
    initialState,
    wizardStateInitializer(isHCIEnabled)
  );
  const location = useLocation();

  const hciLVSExistsOnMount = React.useRef(
    isHCIEnabled && (hciResults?.lvsExists ?? false)
  );

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

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();
  const hciInitRef = React.useRef(false);
  React.useEffect(() => {
    if (!isHCIEnabled || hciInitRef.current) return;
    if (!isODFNsLoaded || odfNsLoadError) return;
    if (!hciResults.discoveryNodes.length) return;

    hciInitRef.current = true;

    dispatch({
      type: 'backingStorage/setSystemNamespace',
      payload: odfNamespace,
    });
    dispatch({ type: 'wizard/setNodes', payload: hciResults.discoveryNodes });
    dispatch({
      type: 'wizard/setStorageClass',
      payload: {
        name: HCI_DISK_DISCOVERY_DEFAULTS.storageClassName,
        provisioner: NO_PROVISIONER,
      },
    });
    if (diskProfile) {
      dispatch({
        type: 'wizard/setCreateLocalVolumeSet',
        payload: { field: 'minDiskSize', value: diskProfile.minDiskSize },
      });
      dispatch({
        type: 'wizard/setCreateLocalVolumeSet',
        payload: { field: 'maxDiskSize', value: diskProfile.maxDiskSize },
      });
      dispatch({
        type: 'wizard/setCreateLocalVolumeSet',
        payload: { field: 'diskSizeUnit', value: diskProfile.diskSizeUnit },
      });
    }
    if (hciResults.arbiter.isArbiterTopology) {
      dispatch({
        type: 'capacityAndNodes/enableArbiter',
        payload: true,
      });
      dispatch({
        type: 'capacityAndNodes/arbiterLocation',
        payload: hciResults.arbiter.arbiterZone,
      });
    }
  }, [
    isHCIEnabled,
    isODFNsLoaded,
    odfNsLoadError,
    odfNamespace,
    hciResults.discoveryNodes,
    hciResults.arbiter,
    diskProfile,
    dispatch,
  ]);

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
      isTNFEnabled,
      isHCIEnabled,
      isHCIEnabled ? hciResults : undefined,
      hciLVSExistsOnMount.current
    );
  }

  const steps = [];
  if (!isHCIEnabled) {
    steps.push({
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
    });
  }

  steps.push(
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
    ...wizardSteps
  );

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
            storageClusterMutator={
              isHCIEnabled ? hciResults.storageClusterMutator : undefined
            }
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
  const { isTNFEnabled, isTNFValidationLoading, isTNFValidated } =
    useTNFValidation();
  const { isHCIEnabled, hciLoading, hciResults, diskProfile } =
    useHCILoadingOrchestrator();

  React.useEffect(() => {
    if (isStorageClusterCRDPresent && !isCrdPresent) {
      setIsCrdPresent(true);
    }
  }, [isCrdPresent, isStorageClusterCRDPresent]);

  const isLoading = isTNFValidationLoading || !isCrdPresent || hciLoading;
  const isTNFValidationError = isTNFEnabled && !isTNFValidated;

  if (!isLoading && !isTNFValidationError) {
    return (
      <CreateStorageSystem
        isTNFEnabled={isTNFEnabled}
        isHCIEnabled={isHCIEnabled}
        hciResults={hciResults}
        diskProfile={diskProfile}
      />
    );
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

import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  StorageClassWizardStepExtensionProps as ExternalStorage,
  isStorageClassWizardStep,
} from '@odf/odf-plugin-sdk/extensions';
import { DEFAULT_INFRASTRUCTURE } from '@odf/shared/constants';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import {
  InfrastructureModel,
  NamespaceModel,
  ODFStorageSystem,
} from '@odf/shared/models';
import { InfrastructureKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInfrastructurePlatform,
  referenceForModel,
} from '@odf/shared/utils';
import { useResolvedExtensions } from '@openshift-console/dynamic-plugin-sdk';
import { Wizard, WizardStep } from '@patternfly/react-core/deprecated';
import { useNavigate, useLocation } from 'react-router-dom-v5-compat';
import { Steps, StepsName } from '../../constants';
import { hasAnyExternalOCS, hasAnyInternalOCS } from '../../utils';
import { createSteps } from './create-steps';
import { BackingStorage } from './create-storage-system-steps';
import { EXTERNAL_CEPH_STORAGE } from './external-ceph-storage/system-connection-details';
import { CreateStorageSystemFooter } from './footer';
import { CreateStorageSystemHeader } from './header';
import { initialState, reducer, WizardReducer } from './reducer';
import './create-storage-system.scss';

const CREATE_SS_PAGE_URL = `/odf/resource/${referenceForModel(
  ODFStorageSystem
)}/create/~new`;

export const RedirectStorageSystem: React.FC<{}> = () => {
  const navigate = useNavigate();
  const { pathname: url } = useLocation();

  if (url !== CREATE_SS_PAGE_URL) {
    navigate(CREATE_SS_PAGE_URL, { replace: true });
  }

  return null;
};

const CreateStorageSystem: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer<WizardReducer>(
    reducer,
    initialState
  );

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

  let wizardSteps: WizardStep[] = [];
  let hasOCS: boolean = false;
  let hasExternal: boolean = false;
  let hasInternal: boolean = false;
  let hasMultipleClusters: boolean = false;

  const supportedExternalStorage: ExternalStorage[] = React.useMemo(() => {
    if (extensionsResolved) {
      return [
        ...EXTERNAL_CEPH_STORAGE,
        ...(extensions?.map(
          (vendor) => vendor.properties
        ) as ExternalStorage[]),
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
      hasMultipleClusters
    );
  }

  const steps: WizardStep[] = [
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
          hasMultipleClusters={hasMultipleClusters}
          stepIdReached={state.stepIdReached}
          infraType={infraType}
          error={anyError}
          loaded={allLoaded}
          supportedExternalStorage={supportedExternalStorage}
        />
      ),
    },
    ...wizardSteps,
  ];

  return (
    <>
      <CreateStorageSystemHeader state={state} />
      <Wizard
        className="odf-create-storage-system-wizard"
        steps={steps}
        footer={
          <CreateStorageSystemFooter
            state={state}
            hasOCS={hasOCS}
            dispatch={dispatch}
            disableNext={!allLoaded || !!anyError}
            supportedExternalStorage={supportedExternalStorage}
            existingNamespaces={namespaces}
          />
        }
        cancelButtonText={t('Cancel')}
        nextButtonText={t('Next')}
        backButtonText={t('Back')}
      />
    </>
  );
};

export default CreateStorageSystem;

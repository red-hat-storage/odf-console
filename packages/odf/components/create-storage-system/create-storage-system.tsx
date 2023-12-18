import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  StorageClassWizardStepExtensionProps as ExternalStorage,
  isStorageClassWizardStep,
} from '@odf/odf-plugin-sdk/extensions';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { InfrastructureModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInfrastructurePlatform } from '@odf/shared/utils';
import { useResolvedExtensions } from '@openshift-console/dynamic-plugin-sdk';
import { useLocation } from 'react-router-dom-v5-compat';
import { Wizard, WizardStep } from '@patternfly/react-core';
import { Steps, StepsName } from '../../constants';
import { hasAnyExternalOCS, hasAnyInternalOCS } from '../../utils';
import { createSteps } from './create-steps';
import { BackingStorage } from './create-storage-system-steps';
import { EXTERNAL_CEPH_STORAGE } from './external-ceph-storage/system-connection-details';
import { CreateStorageSystemFooter } from './footer';
import { CreateStorageSystemHeader } from './header';
import { initialState, reducer, WizardReducer } from './reducer';
import './create-storage-system.scss';

const CreateStorageSystem: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer<WizardReducer>(
    reducer,
    initialState
  );

  const [infra, infraLoaded, infraLoadError] = useK8sGet<any>(
    InfrastructureModel,
    'cluster'
  );

  const [extensions, extensionsResolved] = useResolvedExtensions(
    isStorageClassWizardStep
  );
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();

  const infraType = getInfrastructurePlatform(infra);
  const { pathname: url } = useLocation();

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

  if (areFlagsLoaded && !flagsLoadError && infraLoaded && !infraLoadError) {
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
          error={infraLoadError || flagsLoadError}
          loaded={infraLoaded && areFlagsLoaded}
          supportedExternalStorage={supportedExternalStorage}
        />
      ),
    },
    ...wizardSteps,
  ];

  return (
    <>
      <CreateStorageSystemHeader url={url} />
      <Wizard
        className="odf-create-storage-system-wizard"
        steps={steps}
        footer={
          <CreateStorageSystemFooter
            state={state}
            hasOCS={hasOCS}
            dispatch={dispatch}
            disableNext={
              !areFlagsLoaded ||
              !!flagsLoadError ||
              !infraLoaded ||
              !!infraLoadError
            }
            supportedExternalStorage={supportedExternalStorage}
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

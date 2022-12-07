import * as React from 'react';
import { isStorageClassWizardStep } from '@odf/shared/custom-extensions/extensions/ExternalStorage';
import { StorageClassWizardStepProps as ExternalStorage } from '@odf/shared/custom-extensions/properties/StorageClassWizardStepProps';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { InfrastructureModel } from '@odf/shared/models';
import { ODFStorageSystem } from '@odf/shared/models';
import { ListKind, StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInfrastructurePlatform } from '@odf/shared/utils';
import { useResolvedExtensions } from '@openshift-console/dynamic-plugin-sdk';
import {
  RouteComponentProps,
  useHistory,
  match as RouteMatch,
} from 'react-router';
import { Wizard, WizardStep } from '@patternfly/react-core';
import { Steps, StepsName, STORAGE_CLUSTER_SYSTEM_KIND } from '../../constants';
import { EXTERNAL_CEPH_STORAGE } from '../create-storage-system/red-hat-ceph-storage';
import { createSteps } from './create-steps';
import { BackingStorage } from './create-storage-system-steps';
import { CreateStorageSystemFooter } from './footer';
import { CreateStorageSystemHeader } from './header';
import { initialState, reducer, WizardReducer } from './reducer';
import './create-storage-system.scss';

const CreateStorageSystem: React.FC<CreateStorageSystemProps> = () => {
  const { t } = useCustomTranslation();
  const history = useHistory();
  const [state, dispatch] = React.useReducer<WizardReducer>(
    reducer,
    initialState
  );
  const [ssList, ssLoaded, ssLoadError] =
    useK8sGet<ListKind<StorageSystemKind>>(ODFStorageSystem);
  const [infra, infraLoaded, infraLoadError] = useK8sGet<any>(
    InfrastructureModel,
    'cluster'
  );
  const [applicationAction, reslovedApplicationAction] = useResolvedExtensions(
    isStorageClassWizardStep
  );
  const infraType = getInfrastructurePlatform(infra);

  const url = history.location.pathname;

  let wizardSteps: WizardStep[] = [];
  let hasOCS: boolean = false;

  const supportedExternalStorage: ExternalStorage[] = React.useMemo(() => {
    if (reslovedApplicationAction) {
      return [
        ...EXTERNAL_CEPH_STORAGE,
        ...(applicationAction.map(
          (vendor) => vendor.properties
        ) as ExternalStorage[]),
      ];
    }
    return EXTERNAL_CEPH_STORAGE;
  }, [applicationAction, reslovedApplicationAction]);

  if (ssLoaded && !ssLoadError && infraLoaded && !infraLoadError) {
    hasOCS = ssList?.items?.some(
      (ss) => ss.spec.kind === STORAGE_CLUSTER_SYSTEM_KIND
    );
    wizardSteps = createSteps(
      t,
      state,
      dispatch,
      infraType,
      hasOCS,
      history,
      supportedExternalStorage
    );
  }

  const steps: WizardStep[] = [
    {
      id: 1,
      name: StepsName(t)[Steps.BackingStorage],
      component: (
        <BackingStorage
          state={state.backingStorage}
          supportedExternalStorage={supportedExternalStorage}
          storageClass={state.storageClass}
          dispatch={dispatch}
          storageSystems={ssList?.items || []}
          stepIdReached={state.stepIdReached}
          infraType={infraType}
          error={ssLoadError || infraLoadError}
          loaded={ssLoaded && infraLoaded}
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
            supportedExternalStorage={supportedExternalStorage}
            disableNext={
              !ssLoaded || !!ssLoadError || !infraLoaded || !!infraLoadError
            }
            history={history}
          />
        }
        cancelButtonText={t('Cancel')}
        nextButtonText={t('Next')}
        backButtonText={t('Back')}
      />
    </>
  );
};

type CreateStorageSystemProps = {
  match: RouteMatch<{ ns: string; appName: string }>;
  history: RouteComponentProps['history'];
};

export default CreateStorageSystem;

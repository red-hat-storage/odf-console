import * as React from 'react';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { InfrastructureModel } from '@odf/shared/models';
import { ODFStorageSystem } from '@odf/shared/models';
import { ListKind, StorageSystemKind } from '@odf/shared/types';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, match as RouteMatch, useHistory } from 'react-router';
import { Wizard, WizardStep } from '@patternfly/react-core';
import {
  Steps,
  StepsName,
  STORAGE_CLUSTER_SYSTEM_KIND,
} from '../../constants';
import { createSteps } from './create-steps';
import { BackingStorage } from './create-storage-system-steps';
import { CreateStorageSystemFooter } from './footer';
import { CreateStorageSystemHeader } from './header';
import { initialState, reducer, WizardReducer } from './reducer';

const CreateStorageSystem: React.FC<CreateStorageSystemProps> = () => {
  const { t } = useTranslation('plugin__odf-console');
  const history = useHistory();
  const [state, dispatch] = React.useReducer<WizardReducer>(reducer, initialState);
  const [ssList, ssLoaded, ssLoadError] = useK8sGet<ListKind<StorageSystemKind>>(
    ODFStorageSystem,
  );
  const [infra, infraLoaded, infraLoadError] = useK8sGet<any>(InfrastructureModel, 'cluster');
  const infraType = infra?.spec?.platformSpec?.type;

  const url = history.location.pathname;

  let wizardSteps: WizardStep[] = [];
  let hasOCS: boolean = false;

  if (ssLoaded && !ssLoadError && infraLoaded && !infraLoadError) {
    hasOCS = ssList?.items?.some((ss) => ss.spec.kind === STORAGE_CLUSTER_SYSTEM_KIND);
    wizardSteps = createSteps(t, state, dispatch, infraType, hasOCS, history);
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
        steps={steps}
        footer={
          <CreateStorageSystemFooter
            state={state}
            hasOCS={hasOCS}
            dispatch={dispatch}
            disableNext={!ssLoaded || !!ssLoadError || !infraLoaded || !!infraLoadError}
            history = {history}
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

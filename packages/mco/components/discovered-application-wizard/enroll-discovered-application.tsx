import * as React from 'react';
import {
  EnrollDiscoveredApplicationStepNames,
  EnrollDiscoveredApplicationSteps,
  DR_BASE_ROUTE,
} from '@odf/mco/constants';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Content,
  ContentVariants,
  Wizard,
  WizardStep,
  WizardStepProps,
} from '@patternfly/react-core';
import { EnrollDiscoveredApplicationFooter } from './footer';
import { createPromise } from './utils/k8s-utils';
import {
  EnrollDiscoveredApplicationState,
  EnrollDiscoveredApplicationAction,
  EnrollReducer,
  reducer,
  initialState,
} from './utils/reducer';
import {
  NamespaceSelection,
  Configuration,
  ReplicationSelection,
  Review,
} from './wizard-steps';
import './enroll-discovered-application.scss';

const breadcrumbs = (t: TFunction) => [
  {
    name: t('Protected applications'),
    path: `${DR_BASE_ROUTE}/protected-applications`,
  },
  {
    name: t('Enroll discovered application'),
    path: '',
  },
];

export const createSteps = (
  state: EnrollDiscoveredApplicationState,
  isValidationEnabled: boolean,
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>,
  t: TFunction
): (Pick<WizardStepProps, 'id' | 'name'> & {
  component: React.ReactElement;
})[] => [
  {
    id: 1,
    name: EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Namespace
    ],
    component: (
      <NamespaceSelection
        state={state}
        isValidationEnabled={isValidationEnabled}
        dispatch={dispatch}
      />
    ),
  },
  {
    id: 2,
    name: EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Configuration
    ],
    component: (
      <Configuration
        state={state}
        isValidationEnabled={isValidationEnabled}
        dispatch={dispatch}
      />
    ),
  },
  {
    id: 3,
    name: EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Replication
    ],
    component: (
      <ReplicationSelection
        state={state}
        isValidationEnabled={isValidationEnabled}
        dispatch={dispatch}
      />
    ),
  },
  {
    id: 4,
    name: EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Review
    ],
    component: <Review state={state} />,
  },
];

const EnrollDiscoveredApplication: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [isValidationEnabled, setIsValidationEnabled] = React.useState(false);
  const [onSaveError, setOnSaveError] = React.useState('');

  const [state, dispatch] = React.useReducer<EnrollReducer>(
    reducer,
    initialState
  );

  const title = t('Enroll discovered application');

  const onSubmit = async (
    setRequestInProgress: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setRequestInProgress(true);
    const promises = createPromise(state);
    await Promise.all(promises)
      .then(() => {
        navigate(
          `${DR_BASE_ROUTE}/protected-applications?enrolledApp=${state.namespace.name}`
        );
      })
      .catch((error) => {
        setOnSaveError(error?.message);
        setRequestInProgress(false);
      });
  };

  const steps = createSteps(state, isValidationEnabled, dispatch, t);

  return (
    <>
      <PageHeading title={title} breadcrumbs={breadcrumbs(t)}>
        <Content>
          <Content component={ContentVariants.small}>
            {t(
              'Enroll your applications to improve resilience by implementing disaster recovery protection.'
            )}
          </Content>
        </Content>
      </PageHeading>
      <Wizard
        className="mco-enroll-discovered-application__wizard--height"
        navAriaLabel={t('Enroll discovered application nav')}
        isVisitRequired
        footer={
          <EnrollDiscoveredApplicationFooter
            state={state}
            isValidationEnabled={isValidationEnabled}
            onSaveError={onSaveError}
            setIsValidationEnabled={setIsValidationEnabled}
            onSubmit={onSubmit}
            onCancel={() => navigate(-1)}
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

export default EnrollDiscoveredApplication;

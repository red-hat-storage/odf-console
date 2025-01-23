import * as React from 'react';
import {
  EnrollDiscoveredApplicationStepNames,
  EnrollDiscoveredApplicationSteps,
  DR_BASE_ROUTE,
} from '@odf/mco/constants';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Wizard, WizardStep } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Text, TextContent, TextVariants } from '@patternfly/react-core';
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
  stepIdReached: number,
  isValidationEnabled: boolean,
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>,
  t: TFunction
): WizardStep[] => [
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
    canJumpTo: stepIdReached >= 1,
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
    canJumpTo: stepIdReached >= 2,
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
    canJumpTo: stepIdReached >= 3,
  },
  {
    id: 4,
    name: EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Review
    ],
    component: <Review state={state} />,
    canJumpTo: stepIdReached >= 4,
  },
];

const EnrollDiscoveredApplication: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [stepIdReached, setStepIdReached] = React.useState(1);
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

  return (
    <>
      <PageHeading title={title} breadcrumbs={breadcrumbs(t)}>
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'Enroll your applications to improve resilience by implementing disaster recovery protection.'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      <Wizard
        className="mco-enroll-discovered-application__wizard--height"
        navAriaLabel={t('Enroll discovered application nav')}
        mainAriaLabel={t('Enroll discovered application steps')}
        steps={createSteps(
          state,
          stepIdReached,
          isValidationEnabled,
          dispatch,
          t
        )}
        footer={
          <EnrollDiscoveredApplicationFooter
            state={state}
            stepIdReached={stepIdReached}
            isValidationEnabled={isValidationEnabled}
            onSaveError={onSaveError}
            setStepIdReached={setStepIdReached}
            setIsValidationEnabled={setIsValidationEnabled}
            onSubmit={onSubmit}
            onCancel={() => navigate(-1)}
          />
        }
      />
    </>
  );
};

export default EnrollDiscoveredApplication;

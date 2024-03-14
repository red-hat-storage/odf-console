import * as React from 'react';
import {
  EnrollDiscoveredApplicationStepNames,
  EnrollDiscoveredApplicationSteps,
  DR_BASE_ROUTE,
} from '@odf/mco/constants';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Wizard, WizardStep } from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import { Text, TextContent, TextVariants } from '@patternfly/react-core';
import { EnrollDiscoveredApplicationFooter } from './footer';
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
      EnrollDiscoveredApplicationSteps.Configure
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
    component: <></>,
    canJumpTo: stepIdReached >= 4,
  },
];

const EnrollDiscoveredApplication: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const [stepIdReached, setStepIdReached] = React.useState(1);
  const [isValidationEnabled, setIsValidationEnabled] = React.useState(false);

  const [state, dispatch] = React.useReducer<EnrollReducer>(
    reducer,
    initialState
  );

  const title = t('Enroll discovered application');

  /* eslint-disable @typescript-eslint/no-empty-function */
  const onSubmit = async () => {};
  /* eslint-disable @typescript-eslint/no-empty-function */
  const onClose = () => {};

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
            setStepIdReached={setStepIdReached}
            setIsValidationEnabled={setIsValidationEnabled}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        }
      />
    </>
  );
};

export default EnrollDiscoveredApplication;

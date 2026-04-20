import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import {
  diskModeDropdownItems,
  MINIMUM_NODES,
  NO_PROVISIONER,
  arbiterText,
  LSO_OPERATOR,
  OCS_TOLERATION,
  lsoInstallationPage,
} from '@odf/core/constants';
import { useNodesData, useLSODiskDiscovery } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  nodesWithoutTaints,
  getLocalVolumeSetRequestData,
} from '@odf/core/utils';
import { getNamespace, LocalVolumeSetModel } from '@odf/shared';
import { ErrorAlert } from '@odf/shared/generic/Error';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isCSVSucceeded } from '@odf/shared/utils';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { Modal } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useWizardContext } from '@patternfly/react-core';
import {
  Alert,
  AlertVariant,
  Button,
  Form,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { ErrorHandler } from '../../error-handler';
import { WizardDispatch, WizardNodeState, WizardState } from '../../reducer';
import { LocalVolumeSetBody } from './body';
import { SelectedCapacity } from './selected-capacity';
import { useLSODiscoveredDisks } from './useLSODiscoveredDisks';
import './create-local-volume-set-step.scss';

const makeLocalVolumeSetCall = (
  state: WizardState['createLocalVolumeSet'],
  storageClassName: string,
  setInProgress: React.Dispatch<React.SetStateAction<boolean>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>,
  ns: string,
  onNext: () => void,
  lvsNodes: WizardState['nodes'],
  dispatch: WizardDispatch
) => {
  setInProgress(true);

  const nodes = lvsNodes.map((node) => node.hostName);

  const requestData = getLocalVolumeSetRequestData(
    { ...state, storageClassName },
    nodes,
    ns,
    OCS_TOLERATION
  );
  k8sCreate({ model: LocalVolumeSetModel, data: requestData })
    .then(() => {
      setInProgress(false);
      if (!storageClassName) {
        dispatch({
          type: 'wizard/setStorageClass',
          payload: { name: state.volumeSetName, provisioner: NO_PROVISIONER },
        });
      }
      onNext();
    })
    .catch((err) => {
      setErrorMessage(err.message);
      setInProgress(false);
    });
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  state,
  dispatch,
  setInProgress,
  setErrorMessage,
  storageClassName,
  stepIdReached,
  ns,
  nodes,
}) => {
  const { t } = useCustomTranslation();
  const { goToNextStep, activeStep } = useWizardContext();

  const cancel = () => {
    dispatch({
      type: 'wizard/setCreateLocalVolumeSet',
      payload: { field: 'showConfirmModal', value: false },
    });
  };

  const handleNext = () => {
    const stepId = activeStep.id as number;
    dispatch({
      type: 'wizard/setStepIdReached',
      payload: stepIdReached <= stepId ? stepId + 1 : stepIdReached,
    });
    goToNextStep();
  };

  const makeLVSCall = () => {
    cancel();
    makeLocalVolumeSetCall(
      state,
      storageClassName,
      setInProgress,
      setErrorMessage,
      ns,
      handleNext,
      nodes,
      dispatch
    );
  };

  const description = (
    <>
      <span>
        {t("After the LocalVolumeSet is created you won't be able to edit it.")}
      </span>
      <p className="pf-v6-u-pt-sm">
        <strong>{t('Note:')} </strong>
        {arbiterText(t)}
      </p>
    </>
  );
  return (
    <Modal
      title={t('Create LocalVolumeSet')}
      isOpen={state.showConfirmModal}
      onClose={cancel}
      variant="small"
      actions={[
        <Button key="confirm" variant="primary" onClick={makeLVSCall}>
          {t('Yes')}
        </Button>,
        <Button key="cancel" variant="link" onClick={cancel}>
          {t('Cancel')}
        </Button>,
      ]}
      description={description}
    >
      <p>{t('Are you sure you want to continue?')}</p>
    </Modal>
  );
};

type ConfirmationModalProps = {
  state: WizardState['createLocalVolumeSet'];
  dispatch: WizardDispatch;
  storageClassName: string;
  ns: string;
  setInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  nodes: WizardState['nodes'];
  stepIdReached: WizardState['stepIdReached'];
};

const RequestErrors: React.FC<RequestErrorsProps> = ({
  errorMessage,
  inProgress,
}) => (
  <>
    {errorMessage && <ErrorAlert message={errorMessage} />}
    {inProgress && <LoadingInline />}
  </>
);

type RequestErrorsProps = { errorMessage: string; inProgress: boolean };

export const LSOInstallAlert = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  return (
    <Alert
      variant="info"
      title={t('Local Storage Operator not installed')}
      className="odf-create-lvs__alert--override"
      isInline
    >
      <Trans t={t as any} ns="plugin__odf-console">
        Before we can create a storage system, the Local Storage Operator needs
        to be installed. When installation is finished come back to Data
        Foundation to create a storage system.
        <div className="ceph-ocs-install__lso-alert__button">
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(lsoInstallationPage)}
          >
            Install
          </Button>
        </div>
      </Trans>
    </Alert>
  );
};

const getLVSStepValidationErrors = (
  state: WizardState['createLocalVolumeSet'],
  t: TFunction
) => {
  const validationErrors: { title: string; description: string }[] = [];
  if (state.chartNodes.size < MINIMUM_NODES)
    validationErrors.push({
      title: t('Minimum Node Requirement'),
      description: t(
        'A minimum of 3 nodes are required for the initial deployment. Only {{nodes}} node match to the selected filters. Please adjust the filters to include more nodes.',
        { nodes: state.chartNodes.size }
      ),
    });
  if (!state.isValidDeviceType && state.deviceType.length !== 0)
    validationErrors.push({
      title: t('Cannot proceed with selected device types'),
      description: t(
        'Choose a different device type or combination, or select only mpath to proceed.'
      ),
    });

  return validationErrors;
};

export const CreateLocalVolumeSet: React.FC<CreateLocalVolumeSetProps> = ({
  state,
  storageClass,
  dispatch,
  nodes,
  stepIdReached,
  isMCG,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });
  const lsoNamespace = getNamespace(csv);

  const [rawNodes, rawNodesLoaded, rawNodesLoadError]: [
    NodeData[],
    boolean,
    any,
  ] = useNodesData();
  const allNodes: WizardNodeState[] =
    createWizardNodeState(nodesWithoutTaints(rawNodes)) || [];

  const [discoveryInProgress, discoveryError] = useLSODiskDiscovery(
    allNodes,
    lsoNamespace,
    !csvLoadError && csvLoaded
  );

  const {
    filteredDisksOnSelectedNodes,
    allDiscoveredDisks,
    disksLoaded,
    disksError,
  } = useLSODiscoveredDisks(state, nodes, lsoNamespace, allNodes);

  const [lvsInProgress, setLvsInProgress] = React.useState(false);
  const [lvsError, setLvsError] = React.useState(null);

  const allLoaded =
    csvLoaded && !discoveryInProgress && rawNodesLoaded && disksLoaded;

  const anyError =
    csvLoadError || rawNodesLoadError || discoveryError || disksError;

  const lvsStepValidationErrors = getLVSStepValidationErrors(state, t);

  return (
    <ErrorHandler
      loaded={allLoaded}
      loadingMessage={
        !csvLoaded
          ? t('Checking Local Storage Operator installation')
          : !allLoaded
            ? t('Discovering disks on all hosts. This may take a few minutes.')
            : null
      }
      error={anyError}
      errorMessage={
        csvLoadError || !isCSVSucceeded(csv) ? <LSOInstallAlert /> : null
      }
    >
      <>
        <Grid>
          <GridItem lg={8} md={8} sm={8}>
            <Form noValidate={false} className="odf-create-lvs__form">
              <LocalVolumeSetBody
                state={state}
                dispatch={dispatch}
                storageClassName={storageClass.name}
                allNodes={allNodes}
                nodes={nodes}
                defaultVolumeMode={
                  isMCG
                    ? diskModeDropdownItems.FILESYSTEM
                    : diskModeDropdownItems.BLOCK
                }
                systemNamespace={systemNamespace}
              />
            </Form>
          </GridItem>
          <GridItem
            lg={3}
            lgOffset={9}
            md={3}
            mdOffset={9}
            sm={3}
            smOffset={9}
            className="odf-create-lvs__donut-chart"
          >
            <SelectedCapacity
              dispatch={dispatch}
              state={state}
              chartDisks={filteredDisksOnSelectedNodes}
              allDiscoveredDisks={allDiscoveredDisks}
            />
          </GridItem>
        </Grid>
        <ConfirmationModal
          ns={lsoNamespace}
          nodes={nodes}
          state={state}
          dispatch={dispatch}
          setInProgress={setLvsInProgress}
          setErrorMessage={setLvsError}
          storageClassName={storageClass.name}
          stepIdReached={stepIdReached}
        />
        {!!lvsStepValidationErrors.length &&
          lvsStepValidationErrors.map((lvsStepValidationError) => (
            <Alert
              className="odf-create-lvs__alert"
              variant={AlertVariant.danger}
              title={lvsStepValidationError.title}
              isInline
            >
              {lvsStepValidationError.description}
            </Alert>
          ))}
        <RequestErrors errorMessage={lvsError} inProgress={lvsInProgress} />
      </>
    </ErrorHandler>
  );
};

type CreateLocalVolumeSetProps = {
  state: WizardState['createLocalVolumeSet'];
  storageClass: WizardState['storageClass'];
  nodes: WizardState['nodes'];
  stepIdReached: WizardState['stepIdReached'];
  dispatch: WizardDispatch;
  isMCG: boolean;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

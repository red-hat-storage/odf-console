import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import {
  diskModeDropdownItems,
  LABEL_OPERATOR,
  LABEL_SELECTOR,
  MINIMUM_NODES,
  NO_PROVISIONER,
  arbiterText,
  LSO_OPERATOR,
  OCS_TOLERATION,
} from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import {
  LocalVolumeDiscoveryResult,
  LocalVolumeSetModel,
} from '@odf/core/models';
import { LocalVolumeDiscoveryResultKind } from '@odf/core/types';
import {
  nodesWithoutTaints,
  getLocalVolumeSetRequestData,
  createLocalVolumeDiscovery,
  updateLocalVolumeDiscovery,
} from '@odf/core/utils';
import { ErrorAlert } from '@odf/shared/generic/Error';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  k8sCreate,
  WatchK8sResource,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  WizardContext,
  WizardContextType,
} from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Alert,
  Button,
  Form,
  Grid,
  GridItem,
  Modal,
} from '@patternfly/react-core';
import { ErrorHandler } from '../../error-handler';
import { WizardDispatch, WizardNodeState, WizardState } from '../../reducer';
import { LocalVolumeSetBody } from './body';
import { SelectedCapacity } from './selected-capacity';
import './create-local-volume-set-step.scss';

const goToLSOInstallationPage = (navigate) =>
  navigate(
    '/operatorhub/all-namespaces?details-item=local-storage-operator-redhat-operators-openshift-marketplace'
  );

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

const initDiskDiscovery = async (
  nodes: WizardNodeState[] = [],
  namespace: string,
  setError: (error: any) => void,
  setInProgress: (inProgress: boolean) => void
) => {
  setInProgress(true);
  const nodeByHostNames: string[] = nodes.map((node) => node.hostName);
  try {
    await updateLocalVolumeDiscovery(nodeByHostNames, namespace, setError);
  } catch (loadError) {
    if (loadError?.response?.status === 404) {
      try {
        await createLocalVolumeDiscovery(
          nodeByHostNames,
          namespace,
          OCS_TOLERATION
        );
      } catch (createError) {
        setError(createError.message);
      }
    }
  } finally {
    setError(false);
    setInProgress(false);
  }
};

const getLvdrResource = (
  nodes: WizardNodeState[] = [],
  ns: string
): WatchK8sResource => {
  return {
    kind: referenceForModel(LocalVolumeDiscoveryResult),
    namespace: ns,
    isList: true,
    selector: {
      matchExpressions: [
        {
          key: LABEL_SELECTOR,
          operator: LABEL_OPERATOR,
          values: nodes.map((node) => node.name),
        },
      ],
    },
  };
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
  const { onNext, activeStep } =
    React.useContext<WizardContextType>(WizardContext);

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
    onNext();
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
      <p className="pf-v5-u-pt-sm">
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
        Before we can create a StorageSystem, the Local Storage Operator needs
        to be installed. When installation is finished come back to Data
        Foundation to create a StorageSystem.
        <div className="ceph-ocs-install__lso-alert__button">
          <Button
            type="button"
            variant="primary"
            onClick={() => goToLSOInstallationPage(navigate)}
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
  const allNodes = React.useRef([]);

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });
  const [rawNodes, rawNodesLoaded, rawNodesLoadError] = useNodesData();
  const [lvdResults, lvdResultsLoaded] = useK8sWatchResource<
    LocalVolumeDiscoveryResultKind[]
  >(getLvdrResource(allNodes.current, csv?.metadata?.namespace));
  const [lvdInProgress, setLvdInProgress] = React.useState(false);
  const [lvdError, setLvdError] = React.useState(null);
  const [lvsetInProgress, setLvsetInProgress] = React.useState(false);
  const [lvsetError, setLvsetError] = React.useState(null);

  React.useEffect(() => {
    const nonTaintedNodes = nodesWithoutTaints(rawNodes);
    allNodes.current = createWizardNodeState(nonTaintedNodes);
  }, [rawNodes]);

  React.useEffect(() => {
    if (!csvLoadError && csvLoaded && allNodes.current.length) {
      initDiskDiscovery(
        allNodes.current,
        csv?.metadata.namespace,
        setLvdError,
        setLvdInProgress
      );
    }
  }, [csv, csvLoadError, csvLoaded, rawNodes]);

  const discoveriesLoaded =
    csvLoaded &&
    !lvdInProgress &&
    rawNodesLoaded &&
    lvdResultsLoaded &&
    allNodes.current?.length === lvdResults?.length;

  const discoveriesLoadError = csvLoadError || rawNodesLoadError || lvdError;
  const ns = csv?.metadata?.namespace;

  const lvsStepValidationErrors = getLVSStepValidationErrors(state, t);

  return (
    <ErrorHandler
      loaded={discoveriesLoaded}
      loadingMessage={
        !csvLoaded
          ? t('Checking Local Storage Operator installation')
          : !discoveriesLoaded
          ? t('Discovering disks on all hosts. This may take a few minutes.')
          : null
      }
      error={discoveriesLoadError}
      errorMessage={
        csvLoadError || csv?.status?.phase !== 'Succeeded' ? (
          <LSOInstallAlert />
        ) : null
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
                allNodes={allNodes.current}
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
              ns={ns}
              nodes={nodes}
              lvdResults={lvdResults}
            />
          </GridItem>
        </Grid>
        <ConfirmationModal
          ns={ns}
          nodes={nodes}
          state={state}
          dispatch={dispatch}
          setInProgress={setLvsetInProgress}
          setErrorMessage={setLvsetError}
          storageClassName={storageClass.name}
          stepIdReached={stepIdReached}
        />
        {!!lvsStepValidationErrors.length &&
          lvsStepValidationErrors.map((lvsStepValidationError) => (
            <Alert
              className="odf-create-lvs__alert"
              variant="danger"
              title={lvsStepValidationError.title}
              isInline
            >
              {lvsStepValidationError.description}
            </Alert>
          ))}
        <RequestErrors errorMessage={lvsetError} inProgress={lvsetInProgress} />
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

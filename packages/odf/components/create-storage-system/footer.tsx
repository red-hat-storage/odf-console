import * as React from 'react';
/**
 * (ToDo) Need to do changes in feature.ts file in console repo.
 * setFlag & useDispatch will not be exposed.
 */
// @ts-ignore
import { setFlag } from '@odf/shared/hooks/history';
// @ts-ignore
import { useDispatch } from '@odf/shared/hooks/history';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import {
  WizardFooter,
  Button,
  WizardContext,
  WizardContextType,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import {
  Steps,
  StepsName,
  STORAGE_CLUSTER_SYSTEM_KIND,
} from '../../constants';
import './create-storage-system.scss';
import { MINIMUM_NODES, OCS_EXTERNAL_CR_NAME, OCS_INTERNAL_CR_NAME } from '../../constants';
import { OCS_CONVERGED_FLAG, OCS_INDEPENDENT_FLAG, OCS_FLAG, MCG_STANDALONE } from '../../features';
import { OCSStorageClusterModel } from '../../models';
import { 
  NetworkType,
  BackingStorageType,
  DeploymentType, 
} from '../../types';
import { 
  getStorageSystemKind,
  labelOCSNamespace,
  getExternalSubSystemName
} from '../../utils';
import { createClusterKmsResources } from '../kms-config/utils';
import { getExternalStorage } from '../utils';
import {
  createExternalSubSystem,
  createStorageCluster,
  createStorageSystem,
  labelNodes,
  waitforCRD,
  taintNodes,
} from './payloads';
import { WizardCommonProps, WizardState } from './reducer';

const validateBackingStorageStep = (
  backingStorage: WizardState['backingStorage'],
  sc: WizardState['storageClass'],
) => {
  const { type, externalStorage, deployment } = backingStorage;
  switch (type) {
    case BackingStorageType.EXISTING:
      return !!sc.name && !!deployment;
    case BackingStorageType.EXTERNAL:
      return !!externalStorage;
    case BackingStorageType.LOCAL_DEVICES:
      return !!deployment;
    default:
      return false;
  }
};

const canJumpToNextStep = (name: string, state: WizardState, t: TFunction) => {
  const {
    storageClass,
    backingStorage,
    createStorageClass,
    capacityAndNodes,
    createLocalVolumeSet,
    securityAndNetwork,
    connectionDetails,
    nodes,
  } = state;
  const { externalStorage } = backingStorage;
  const { capacity } = capacityAndNodes;
  const { chartNodes, volumeSetName, isValidDiskSize } = createLocalVolumeSet;
  const { encryption, kms, networkType, publicNetwork, clusterNetwork } = securityAndNetwork;
  const { canGoToNextStep } = getExternalStorage(externalStorage) || {};

  const hasConfiguredNetwork =
    networkType === NetworkType.MULTUS ? !!(publicNetwork || clusterNetwork) : true;

  switch (name) {
    case StepsName(t)[Steps.BackingStorage]:
      return validateBackingStorageStep(backingStorage, storageClass);
    case StepsName(t)[Steps.CreateStorageClass]:
      return (
        !!storageClass.name &&
        canGoToNextStep &&
        canGoToNextStep(createStorageClass, storageClass.name)
      );
    case StepsName(t)[Steps.ConnectionDetails]:
      return canGoToNextStep && canGoToNextStep(connectionDetails, storageClass.name);
    case StepsName(t)[Steps.CreateLocalVolumeSet]:
      return chartNodes.size >= MINIMUM_NODES && volumeSetName.trim().length && isValidDiskSize;
    case StepsName(t)[Steps.CapacityAndNodes]:
      return nodes.length >= MINIMUM_NODES && capacity;
    case StepsName(t)[Steps.SecurityAndNetwork]:
      return encryption.hasHandled && kms[kms.provider].hasHandled && hasConfiguredNetwork;
    case StepsName(t)[Steps.Security]:
      return encryption.hasHandled && kms[kms.provider].hasHandled;
    case StepsName(t)[Steps.ReviewAndCreate]:
      return true;
    default:
      return false;
  }
};

export const setActionFlags = (
  type: WizardState['backingStorage']['type'],
  flagDispatcher: any,
  isRhcs: boolean,
  isMCG: boolean,
) => {
  switch (type) {
    case BackingStorageType.EXISTING:
    case BackingStorageType.LOCAL_DEVICES:
      flagDispatcher(setFlag(OCS_CONVERGED_FLAG, true));
      flagDispatcher(setFlag(OCS_INDEPENDENT_FLAG, false));
      flagDispatcher(setFlag(OCS_FLAG, true));
      break;
    case BackingStorageType.EXTERNAL:
      flagDispatcher(setFlag(OCS_INDEPENDENT_FLAG, isRhcs));
      flagDispatcher(setFlag(OCS_CONVERGED_FLAG, !isRhcs));
      flagDispatcher(setFlag(OCS_FLAG, true));
      break;
    default:
  }
  flagDispatcher(setFlag(MCG_STANDALONE, isMCG));
};

const handleReviewAndCreateNext = async (
  state: WizardState,
  hasOCS: boolean,
  handleError: (err: string, showError: boolean) => void,
  flagDispatcher: any,
  history: RouteComponentProps['history'],
) => {
  const { connectionDetails, createStorageClass, storageClass, nodes, capacityAndNodes } = state;
  const { externalStorage, deployment, type } = state.backingStorage;
  const { encryption, kms } = state.securityAndNetwork;
  const isRhcs: boolean = externalStorage === OCSStorageClusterModel.kind;
  const isMCG: boolean = deployment === DeploymentType.MCG;

  try {
    await labelOCSNamespace();
    if (isMCG) {
      if (encryption.advanced)
        await Promise.all(createClusterKmsResources(kms[kms.provider], kms.provider));
      await createStorageCluster(state);
    } else if (type === BackingStorageType.EXISTING || type === BackingStorageType.LOCAL_DEVICES) {
      await labelNodes(nodes);
      if (capacityAndNodes.enableTaint) await taintNodes(nodes);
      if (encryption.advanced)
        await Promise.all(createClusterKmsResources(kms[kms.provider], kms.provider));
      await createStorageSystem(OCS_INTERNAL_CR_NAME, STORAGE_CLUSTER_SYSTEM_KIND);
      await createStorageCluster(state);
    } else if (type === BackingStorageType.EXTERNAL) {
      const { createPayload, model, displayName } = getExternalStorage(externalStorage) || {};

      const externalSystemName = getExternalSubSystemName(displayName, storageClass.name);

      const subSystemName = isRhcs ? OCS_EXTERNAL_CR_NAME : externalSystemName;
      const subSystemState = isRhcs ? connectionDetails : createStorageClass;
      const subSystemKind = getStorageSystemKind(model);
      const subSystemPayloads = createPayload(
        subSystemName,
        subSystemState,
        model,
        storageClass.name,
      );

      await createStorageSystem(subSystemName, subSystemKind);
      if (!hasOCS && !isRhcs) {
        await labelNodes(nodes);
        if (capacityAndNodes.enableTaint) await taintNodes(nodes);
        if (encryption.advanced)
          await Promise.all(createClusterKmsResources(kms[kms.provider], kms.provider));
        await createStorageCluster(state);
      }
      if (!isRhcs) await waitforCRD(model);
      await createExternalSubSystem(subSystemPayloads);
    }
    // These flags control the enablement of dashboards and other ODF UI components in console
    setActionFlags(type, flagDispatcher, isRhcs, isMCG);
    history.push('/odf/systems');
  } catch (err) {
    handleError(err.message, true);
  }
};

export const CreateStorageSystemFooter: React.FC<CreateStorageSystemFooterProps> = ({
  dispatch,
  state,
  disableNext,
  hasOCS,
  history,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const { activeStep, onNext, onBack } = React.useContext<WizardContextType>(WizardContext);
  const [requestInProgress, setRequestInProgress] = React.useState(false);
  const [requestError, setRequestError] = React.useState('');
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  // (ToDo) Can only access root state via APIs
  const flagDispatcher = useDispatch();

  const stepId = activeStep.id as number;
  const stepName = activeStep.name as string;

  const jumpToNextStep = canJumpToNextStep(stepName, state, t);

  const moveToNextStep = () => {
    dispatch({
      type: 'wizard/setStepIdReached',
      payload: state.stepIdReached <= stepId ? stepId + 1 : state.stepIdReached,
    });
    onNext();
  };

  const handleError = (errorMessage: string, showError: boolean) => {
    setRequestError(errorMessage);
    setShowErrorAlert(showError);
  };

  const handleNext = async () => {
    switch (stepName) {
      case StepsName(t)[Steps.CreateLocalVolumeSet]:
        dispatch({
          type: 'wizard/setCreateLocalVolumeSet',
          payload: { field: 'showConfirmModal', value: true },
        });
        break;
      case StepsName(t)[Steps.ReviewAndCreate]:
        setRequestInProgress(true);
        await handleReviewAndCreateNext(state, hasOCS, handleError, flagDispatcher, history);
        setRequestInProgress(false);
        break;
      default:
        moveToNextStep();
    }
  };

  return (
    <>
      {showErrorAlert && (
        <Alert
          className="odf-create-storage-system-footer__alert"
          variant="danger"
          isInline
          actionClose={<AlertActionCloseButton onClose={() => handleError('', false)} />}
          title={t('An error has occurred')}
        >
          {requestError}
        </Alert>
      )}
      <WizardFooter>
        <Button
          isLoading={requestInProgress || null}
          isDisabled={disableNext || requestInProgress || !jumpToNextStep}
          variant="primary"
          type="submit"
          onClick={handleNext}
        >
          {stepName === StepsName(t)[Steps.ReviewAndCreate]
            ? t('Create StorageSystem')
            : t('Next')}
        </Button>
        {/* Disabling the back button for the first step (Backing storage) in wizard */}
        <Button
          variant="secondary"
          onClick={onBack}
          isDisabled={stepName === StepsName(t)[Steps.BackingStorage] || requestInProgress}
        >
          {t('Back')}
        </Button>
        <Button variant="link" onClick={history.goBack} isDisabled={requestInProgress}>
          {t('Cancel')}
        </Button>
      </WizardFooter>
    </>
  );
};

type CreateStorageSystemFooterProps = WizardCommonProps & {
  disableNext: boolean;
  hasOCS: boolean;
  history: RouteComponentProps['history'];
};

import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { OCSStorageClusterModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGVKLabel } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  WizardFooter,
  Button,
  WizardContext,
  WizardContextType,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { Steps, StepsName, STORAGE_CLUSTER_SYSTEM_KIND } from '../../constants';
import './create-storage-system.scss';
import {
  MINIMUM_NODES,
  OCS_EXTERNAL_CR_NAME,
  OCS_INTERNAL_CR_NAME,
} from '../../constants';
import { NetworkType, BackingStorageType, DeploymentType } from '../../types';
import {
  labelOCSNamespace,
  getExternalSubSystemName,
  isResourceProfileAllowed,
} from '../../utils';
import { createClusterKmsResources } from '../kms-config/utils';
import { getExternalStorage, getTotalCpu, getTotalMemoryInGiB } from '../utils';
import {
  createExternalSubSystem,
  createNoobaaExternalPostgresResources,
  createStorageCluster,
  createStorageSystem,
  labelNodes,
  taintNodes,
} from './payloads';
import { WizardCommonProps, WizardState } from './reducer';

const validateBackingStorageStep = (
  backingStorage: WizardState['backingStorage'],
  sc: WizardState['storageClass']
) => {
  const { type, enableNFS, externalStorage, deployment } = backingStorage;

  const { useExternalPostgres, externalPostgres } = backingStorage;

  const {
    username,
    password,
    serverName,
    port,
    databaseName,
    tls: { enableClientSideCerts, keys },
  } = externalPostgres;

  const hasPGEnabledButNoFields =
    useExternalPostgres &&
    (!username || !password || !serverName || !port || !databaseName);

  const hasClientCertsEnabledButNoKeys =
    enableClientSideCerts && (!keys.private || !keys.public);

  switch (type) {
    case BackingStorageType.EXISTING:
      return (
        !!sc.name &&
        !!deployment &&
        !hasPGEnabledButNoFields &&
        !hasClientCertsEnabledButNoKeys
      );
    case BackingStorageType.EXTERNAL:
      return (
        !!externalStorage &&
        !enableNFS &&
        !hasPGEnabledButNoFields &&
        !hasClientCertsEnabledButNoKeys
      );
    case BackingStorageType.LOCAL_DEVICES:
      return (
        !!deployment &&
        !hasPGEnabledButNoFields &&
        !hasClientCertsEnabledButNoKeys
      );
    default:
      return false;
  }
};

const canJumpToNextStep = (
  name: string,
  state: WizardState,
  t: TFunction,
  supportedExternalStorage: ExternalStorage[]
) => {
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
  const { type, externalStorage } = backingStorage;
  const isExternal: boolean = type === BackingStorageType.EXTERNAL;
  const isRHCS: boolean = externalStorage === OCSStorageClusterModel.kind;
  const { capacity } = capacityAndNodes;
  const { chartNodes, volumeSetName, isValidDiskSize, isValidDeviceType } =
    createLocalVolumeSet;
  const { encryption, kms, networkType, publicNetwork, clusterNetwork } =
    securityAndNetwork;
  const { canGoToNextStep } =
    getExternalStorage(externalStorage, supportedExternalStorage) || {};

  const hasConfiguredNetwork =
    networkType === NetworkType.MULTUS
      ? !!(publicNetwork || clusterNetwork)
      : true;

  switch (name) {
    case StepsName(t)[Steps.BackingStorage]:
      return validateBackingStorageStep(backingStorage, storageClass);
    case StepsName(t)[Steps.CreateStorageClass]:
      return (
        !!storageClass.name &&
        canGoToNextStep &&
        canGoToNextStep(createStorageClass, storageClass.name)
      );
    case StepsName(t)[Steps.CreateLocalVolumeSet]:
      return (
        chartNodes.size >= MINIMUM_NODES &&
        volumeSetName.trim().length &&
        isValidDiskSize &&
        isValidDeviceType
      );
    case StepsName(t)[Steps.CapacityAndNodes]:
      return (
        nodes.length >= MINIMUM_NODES &&
        capacity &&
        isResourceProfileAllowed(
          capacityAndNodes.resourceProfile,
          getTotalCpu(nodes),
          getTotalMemoryInGiB(nodes)
        )
      );
    case StepsName(t)[Steps.SecurityAndNetwork]:
      if (isExternal && isRHCS) {
        return canGoToNextStep(connectionDetails, storageClass.name);
      }
      return (
        encryption.hasHandled &&
        kms.providerState.hasHandled &&
        hasConfiguredNetwork
      );
    case StepsName(t)[Steps.Security]:
      return encryption.hasHandled && kms.providerState.hasHandled;
    case StepsName(t)[Steps.DataProtection]:
      return true;
    case StepsName(t)[Steps.ReviewAndCreate]:
      return true;
    default:
      return false;
  }
};

const handleReviewAndCreateNext = async (
  state: WizardState,
  hasOCS: boolean,
  handleError: (err: string, showError: boolean) => void,
  navigate,
  supportedExternalStorage: ExternalStorage[],
  odfNamespace: string
) => {
  const {
    connectionDetails,
    createStorageClass,
    storageClass,
    nodes,
    capacityAndNodes,
  } = state;
  const {
    externalStorage,
    deployment,
    type,
    useExternalPostgres,
    externalPostgres,
  } = state.backingStorage;
  const inTransitChecked = state.securityAndNetwork.encryption.inTransit;
  const { encryption, kms } = state.securityAndNetwork;
  const isRhcs: boolean = externalStorage === OCSStorageClusterModel.kind;
  const isMCG: boolean = deployment === DeploymentType.MCG;

  const createAdditionalFeatureResources = async () => {
    if (capacityAndNodes.enableTaint && !isMCG) await taintNodes(nodes);

    if (encryption.advanced)
      await Promise.all(
        createClusterKmsResources(
          kms.providerState,
          odfNamespace,
          kms.provider,
          isMCG
        )
      );

    if (useExternalPostgres) {
      let keyTexts = { private: '', public: '' };
      if (externalPostgres.tls.enableClientSideCerts) {
        const keys = externalPostgres.tls.keys;
        const privateKey = await keys.private.text();
        const publicKey = await keys.public.text();
        keyTexts = { private: privateKey, public: publicKey };
      }
      await Promise.all(
        createNoobaaExternalPostgresResources(
          odfNamespace,
          externalPostgres,
          keyTexts
        )
      );
    }
  };

  try {
    await labelOCSNamespace(odfNamespace);
    if (isMCG) {
      await createAdditionalFeatureResources();
      await createStorageCluster(state, odfNamespace);
    } else if (
      type === BackingStorageType.EXISTING ||
      type === BackingStorageType.LOCAL_DEVICES
    ) {
      await labelNodes(nodes, odfNamespace);
      await createAdditionalFeatureResources();
      await createStorageSystem(
        OCS_INTERNAL_CR_NAME,
        STORAGE_CLUSTER_SYSTEM_KIND,
        odfNamespace
      );
      await createStorageCluster(state, odfNamespace);
    } else if (type === BackingStorageType.EXTERNAL) {
      const { createPayload, model, displayName, waitToCreate } =
        getExternalStorage(externalStorage, supportedExternalStorage) || {};

      const externalSystemName = getExternalSubSystemName(
        displayName,
        storageClass.name
      );

      const subSystemName = isRhcs ? OCS_EXTERNAL_CR_NAME : externalSystemName;
      const subSystemState = isRhcs ? connectionDetails : createStorageClass;
      const subSystemKind = getGVKLabel(model);

      const subSystemPayloads = createPayload({
        systemName: subSystemName,
        state: subSystemState,
        model,
        namespace: odfNamespace,
        storageClassName: storageClass.name,
        inTransitStatus: inTransitChecked,
      });

      await createStorageSystem(subSystemName, subSystemKind, odfNamespace);
      if (!hasOCS && !isRhcs) {
        await labelNodes(nodes, odfNamespace);
        await createAdditionalFeatureResources();
        await createStorageCluster(state, odfNamespace);
      }
      if (!isRhcs && !!waitToCreate) await waitToCreate(model);
      await createExternalSubSystem(subSystemPayloads);
    }
    navigate('/odf/systems');
  } catch (err) {
    handleError(err.message, true);
  }
};

export const CreateStorageSystemFooter: React.FC<CreateStorageSystemFooterProps> =
  ({ dispatch, state, disableNext, hasOCS, supportedExternalStorage }) => {
    const { t } = useCustomTranslation();
    const navigate = useNavigate();
    const { activeStep, onNext, onBack } =
      React.useContext<WizardContextType>(WizardContext);

    const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

    const [requestInProgress, setRequestInProgress] = React.useState(false);
    const [requestError, setRequestError] = React.useState('');
    const [showErrorAlert, setShowErrorAlert] = React.useState(false);

    const stepId = activeStep.id as number;
    const stepName = activeStep.name as string;

    const jumpToNextStep = canJumpToNextStep(
      stepName,
      state,
      t,
      supportedExternalStorage
    );

    const moveToNextStep = () => {
      dispatch({
        type: 'wizard/setStepIdReached',
        payload:
          state.stepIdReached <= stepId ? stepId + 1 : state.stepIdReached,
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
          await handleReviewAndCreateNext(
            state,
            hasOCS,
            handleError,
            navigate,
            supportedExternalStorage,
            odfNamespace
          );
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
            actionClose={
              <AlertActionCloseButton onClose={() => handleError('', false)} />
            }
            title={t('An error has occurred')}
          >
            {requestError}
          </Alert>
        )}
        <WizardFooter>
          <Button
            isLoading={requestInProgress || null}
            isDisabled={
              disableNext || requestInProgress || !jumpToNextStep || !isNsSafe
            }
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
            isDisabled={
              stepName === StepsName(t)[Steps.BackingStorage] ||
              requestInProgress ||
              !isNsSafe
            }
          >
            {t('Back')}
          </Button>
          <Button
            variant="link"
            onClick={() => navigate(-1)}
            isDisabled={requestInProgress}
          >
            {t('Cancel')}
          </Button>
        </WizardFooter>
      </>
    );
  };

type CreateStorageSystemFooterProps = WizardCommonProps & {
  disableNext: boolean;
  hasOCS: boolean;
  supportedExternalStorage: ExternalStorage[];
};

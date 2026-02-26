import * as React from 'react';
import {
  getDeviceSetReplica,
  getExternalStorage,
  getTotalCpu,
  getTotalMemoryInGiB,
  getRBDVolumeSnapshotClassName,
} from '@odf/core/components/utils';
import {
  MINIMUM_NODES,
  NO_PROVISIONER,
  Steps,
  StepsName,
} from '@odf/core/constants';
import { useODFNamespaceSelector } from '@odf/core/redux';
import {
  labelOCSNamespace,
  isResourceProfileAllowed,
  isFlexibleScaling,
  getDeviceSetCount,
  getOsdAmount,
  isValidCapacityAutoScalingConfig,
} from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { StorageClusterKind } from '@odf/shared';
import {
  StorageAutoScalerModel,
  StorageClusterModel,
} from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getStorageAutoScalerName, isNotFoundError } from '@odf/shared/utils';
import {
  k8sDelete,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useWizardContext, WizardFooterWrapper } from '@patternfly/react-core';
import { Button, Alert, AlertActionCloseButton } from '@patternfly/react-core';
import './create-storage-system.scss';
import {
  NetworkType,
  BackingStorageType,
  DeploymentType,
  VolumeTypeValidation,
} from '../../types';
import { createClusterKmsResources } from '../kms-config/utils';
import {
  createNoobaaExternalPostgresResources,
  createStorageCluster,
  labelNodes,
  taintNodes,
  createOCSNamespace,
  createStorageAutoScaler,
} from './payloads';
import { WizardCommonProps, WizardState } from './reducer';

// Not to be exposed to other files to make our code name agnostic
const OCS_INTERNAL_CR_NAME = 'ocs-storagecluster';
const NOOBAA_DB_BACKUP_VOLUMESNAPSHOTCLASS =
  getRBDVolumeSnapshotClassName(OCS_INTERNAL_CR_NAME);
const validateBackingStorageStep = (
  backingStorage: WizardState['backingStorage'],
  sc: WizardState['storageClass']
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

const validateAdvancedSettingsStep = (
  advancedSettings: WizardState['advancedSettings'],
  sc: WizardState['storageClass'],
  deployment: DeploymentType,
  type: BackingStorageType
) => {
  const {
    enableNFS,
    useExternalPostgres,
    externalPostgres,
    isDbBackup,
    dbBackup,
    enableForcefulDeployment,
    forcefulDeploymentConfirmation,
  } = advancedSettings;

  const {
    username,
    password,
    serverName,
    port,
    databaseName,
    tls: { enableClientSideCerts, keys },
  } = externalPostgres;

  const isMCG: boolean = deployment === DeploymentType.MCG;

  const hasPGEnabledButNoFields =
    useExternalPostgres &&
    (!username || !password || !serverName || !port || !databaseName);

  const hasClientCertsEnabledButNoKeys =
    enableClientSideCerts && (!keys.private || !keys.public);

  // The Next button is disabled only when no VolumeSnapshotClass is selected for MCG Standalone when automatic backup option enabled.
  const hasDbBackupEnabledButNoFields =
    isDbBackup && !dbBackup.volumeSnapshot?.volumeSnapshotClass && isMCG;

  // The Next button is disabled when forceful deployment is enabled but confirmation text not equals confirm
  const hasForcefulDeploymentEnabledButNoConfirmation =
    enableForcefulDeployment &&
    !(forcefulDeploymentConfirmation?.trim().toLowerCase() === 'confirm');

  switch (type) {
    case BackingStorageType.EXISTING:
      return (
        !!sc.name &&
        !!deployment &&
        !hasPGEnabledButNoFields &&
        !hasClientCertsEnabledButNoKeys &&
        !hasDbBackupEnabledButNoFields
      );
    case BackingStorageType.EXTERNAL:
      return (
        !enableNFS &&
        !hasPGEnabledButNoFields &&
        !hasClientCertsEnabledButNoKeys &&
        !hasDbBackupEnabledButNoFields
      );
    case BackingStorageType.LOCAL_DEVICES:
      return (
        !!deployment &&
        !hasPGEnabledButNoFields &&
        !hasClientCertsEnabledButNoKeys &&
        !hasDbBackupEnabledButNoFields &&
        !hasForcefulDeploymentEnabledButNoConfirmation
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
    advancedSettings,
  } = state;
  const { type, externalStorage } = backingStorage;
  const isExternal: boolean = type === BackingStorageType.EXTERNAL;
  const isRHCS: boolean = externalStorage === StorageClusterModel.kind;
  const {
    capacity,
    enableArbiter,
    pvCount,
    resourceProfile,
    volumeValidationType,
  } = capacityAndNodes;
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

  const isNoProvisioner = storageClass.provisioner === NO_PROVISIONER;
  const flexibleScaling = isFlexibleScaling(
    nodes,
    isNoProvisioner,
    enableArbiter
  );
  const deviceSetReplica: number = getDeviceSetReplica(
    enableArbiter,
    flexibleScaling,
    nodes
  );
  const deviceSetCount = getDeviceSetCount(pvCount, deviceSetReplica);
  const osdAmount = getOsdAmount(deviceSetCount, deviceSetReplica);

  switch (name) {
    case StepsName(t)[Steps.BackingStorage]:
      return validateBackingStorageStep(backingStorage, storageClass);
    case StepsName(t)[Steps.AdvancedSettings]:
      return validateAdvancedSettingsStep(
        advancedSettings,
        storageClass,
        backingStorage.deployment,
        backingStorage.type
      );
    case StepsName(t)[Steps.CreateStorageClass]:
      return (
        !!storageClass.name &&
        canGoToNextStep &&
        canGoToNextStep(createStorageClass, storageClass.name)
      );
    case StepsName(t)[Steps.CreateLocalVolumeSet]:
      return (
        // "chartNodes.size === 0" signify no SSDs are attached, but no need to add that as it's already covered by "chartNodes.size >= MINIMUM_NODES" condition
        chartNodes.size >= MINIMUM_NODES &&
        volumeSetName.trim().length &&
        isValidDiskSize &&
        isValidDeviceType
      );
    case StepsName(t)[Steps.CapacityAndNodes]:
      return (
        nodes.length >= MINIMUM_NODES &&
        capacity &&
        ![VolumeTypeValidation.UNKNOWN, VolumeTypeValidation.ERROR].includes(
          volumeValidationType
        ) &&
        isResourceProfileAllowed(
          resourceProfile,
          getTotalCpu(nodes),
          getTotalMemoryInGiB(nodes),
          osdAmount
        ) &&
        isValidCapacityAutoScalingConfig(
          capacityAndNodes.capacityAutoScaling.enable,
          capacityAndNodes.capacityAutoScaling.capacityLimit
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
    case StepsName(t)[Steps.ReviewAndCreate]:
      return true;
    default:
      return false;
  }
};

const handleReviewAndCreateNext = async (
  state: WizardState,
  handleError: (err: string, showError: boolean) => void,
  navigate,
  odfNamespace: string,
  existingNamespaces: K8sResourceCommon[]
) => {
  const { nodes, capacityAndNodes } = state;
  const { systemNamespace, deployment, type } = state.backingStorage;
  const { useExternalPostgres, externalPostgres } = state.advancedSettings;
  const { encryption, kms } = state.securityAndNetwork;
  const isMCG: boolean = deployment === DeploymentType.MCG;
  const nsAlreadyExists = !!existingNamespaces.find(
    (ns) => getName(ns) === systemNamespace
  );

  const createNooBaaResources = async () => {
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
          systemNamespace,
          externalPostgres,
          keyTexts
        )
      );
    }
  };

  const createAdditionalFeatureResources = async () => {
    if (capacityAndNodes.enableTaint && !isMCG) await taintNodes(nodes);

    /**
     * CSI KMS ConfigMap and Secrets always needs to be created in ODF install namespace (that is, where Rook is deployed),
     * whereas OCS KMS ConfigMap and Secrets needs to be created in the namespace where Ceph is being deployed (StorageSystem namespace).
     * ToDo: External mode do not support KMS and only single Internal mode is allowed, so it should work for now,
     * but in future, if need arises, first check whether CSI ConfigMap already exists or not before creating KMS related resources for multiple clusters.
     * Also, change name of "ceph-csi-kms-token" token Secret (if need to create multiple in Rook namespace).
     */
    if (encryption.advanced)
      // as currently only one internal cluster is allowed, "systemNamespace" (where intenal cluster is being created) and "odfNamespace" (where ODF is installed) will be same
      await Promise.all(
        createClusterKmsResources(
          kms.providerState,
          systemNamespace,
          odfNamespace,
          kms.provider,
          isMCG
        )
      );

    await createNooBaaResources();
  };

  try {
    systemNamespace === odfNamespace || nsAlreadyExists
      ? await labelOCSNamespace(systemNamespace)
      : await createOCSNamespace(systemNamespace);

    let storageCluster: StorageClusterKind;
    if (isMCG) {
      await createAdditionalFeatureResources();
      storageCluster = await createStorageCluster(
        state,
        systemNamespace,
        OCS_INTERNAL_CR_NAME
      );
    } else if (
      type === BackingStorageType.EXISTING ||
      type === BackingStorageType.LOCAL_DEVICES
    ) {
      await labelNodes(nodes, systemNamespace);
      await createAdditionalFeatureResources();
      storageCluster = await createStorageCluster(
        state,
        systemNamespace,
        OCS_INTERNAL_CR_NAME
      );
    }
    if (storageCluster) {
      try {
        // Delete preexisting ui-created autoscaler to avoid a misconfiguration.
        await k8sDelete({
          model: StorageAutoScalerModel,
          resource: {
            metadata: {
              name: getStorageAutoScalerName(storageCluster),
              namespace: getNamespace(storageCluster),
            },
          },
        });
      } catch (error) {
        // It's OK if it didn't exist.
        if (!isNotFoundError(error)) {
          // eslint-disable-next-line no-console
          console.error(
            `Error while deleting preexisting capacity autoscaling: ${error.message}`
          );
        }
      }
      if (state.capacityAndNodes.capacityAutoScaling.enable) {
        // Don't stop the workflow on autoscaler creation error.
        try {
          await createStorageAutoScaler(
            state.capacityAndNodes.capacityAutoScaling.capacityLimit,
            storageCluster
          );
        } catch (error) {
          // TODO: raise a notification once the notification system is implemented.
          // eslint-disable-next-line no-console
          console.error(
            `Error while enabling capacity autoscaling: ${error.message}`
          );
        }
      }
    }
    navigate('/odf/storage-cluster');
  } catch (err) {
    handleError(err.message, true);
  }
};

export const CreateStorageSystemFooter: React.FC<
  CreateStorageSystemFooterProps
> = ({
  dispatch,
  state,
  disableNext,
  supportedExternalStorage,
  existingNamespaces,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

  const [requestInProgress, setRequestInProgress] = React.useState(false);
  const [requestError, setRequestError] = React.useState('');
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);

  const stepName = activeStep.name as string;
  const { deployment } = state.backingStorage;
  const { isDbBackup } = state.advancedSettings;
  const isMCG: boolean = deployment === DeploymentType.MCG;

  const jumpToNextStep = canJumpToNextStep(
    stepName,
    state,
    t,
    supportedExternalStorage
  );

  const moveToNextStep = () => {
    goToNextStep();
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
      case StepsName(t)[Steps.AdvancedSettings]:
        // Auto-select the RBD VolumeSnapshotClass for internal mode when automatic backup is enabled.
        if (isDbBackup && !isMCG) {
          dispatch({
            type: 'advancedSettings/dbBackup/volumeSnapshot/volumeSnapshotClass',
            payload: NOOBAA_DB_BACKUP_VOLUMESNAPSHOTCLASS,
          });
        }
        moveToNextStep();
        break;
      case StepsName(t)[Steps.ReviewAndCreate]:
        setRequestInProgress(true);
        await handleReviewAndCreateNext(
          state,
          handleError,
          navigate,
          odfNamespace,
          existingNamespaces
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
      <WizardFooterWrapper>
        <Button
          isLoading={requestInProgress || null}
          isDisabled={
            disableNext || requestInProgress || !jumpToNextStep || !isNsSafe
          }
          variant="primary"
          onClick={handleNext}
        >
          {stepName === StepsName(t)[Steps.ReviewAndCreate]
            ? t('Create storage system')
            : t('Next')}
        </Button>
        {/* Disabling the back button for the first step (Backing storage) in wizard */}
        <Button
          variant="secondary"
          onClick={goToPrevStep}
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
      </WizardFooterWrapper>
    </>
  );
};

type CreateStorageSystemFooterProps = WizardCommonProps & {
  disableNext: boolean;
  hasOCS: boolean;
  supportedExternalStorage: ExternalStorage[];
  existingNamespaces: K8sResourceCommon[];
};

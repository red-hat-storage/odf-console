import * as React from 'react';
import {
  getDeviceSetReplica,
  getExternalStorage,
  getTotalCpu,
  getTotalMemoryInGiB,
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
  getExternalSubSystemName,
  isResourceProfileAllowed,
  isFlexibleScaling,
  getDeviceSetCount,
  getOsdAmount,
  isValidCapacityAutoScalingConfig,
} from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { StorageClusterKind } from '@odf/shared';
import { StorageClusterModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  WizardFooter,
  WizardContext,
  WizardContextType,
} from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
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
  createExternalSubSystem,
  createNoobaaExternalPostgresResources,
  setCephRBDAsDefault,
  createStorageCluster,
  labelNodes,
  taintNodes,
  createOCSNamespace,
  createStorageAutoScaler,
} from './payloads';
import { WizardCommonProps, WizardState } from './reducer';

const OCS_INTERNAL_CR_NAME = 'ocs-storagecluster';
const OCS_EXTERNAL_CR_NAME = 'ocs-external-storagecluster';

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
  hasOCS: boolean,
  handleError: (err: string, showError: boolean) => void,
  navigate,
  supportedExternalStorage: ExternalStorage[],
  odfNamespace: string,
  existingNamespaces: K8sResourceCommon[]
) => {
  const {
    connectionDetails,
    createStorageClass,
    storageClass,
    nodes,
    capacityAndNodes,
  } = state;
  const {
    systemNamespace,
    isRBDStorageClassDefault,
    externalStorage,
    deployment,
    type,
    useExternalPostgres,
    externalPostgres,
  } = state.backingStorage;
  const inTransitChecked = state.securityAndNetwork.encryption.inTransit;
  const { encryption, kms } = state.securityAndNetwork;
  const isRhcs: boolean = externalStorage === StorageClusterModel.kind;
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
    } else if (type === BackingStorageType.EXTERNAL) {
      const { createPayload, model, displayName, waitToCreate } =
        getExternalStorage(externalStorage, supportedExternalStorage) || {};

      const externalSystemName = getExternalSubSystemName(
        displayName,
        storageClass.name
      );

      const subSystemName = isRhcs ? OCS_EXTERNAL_CR_NAME : externalSystemName;
      const subSystemState = isRhcs ? connectionDetails : createStorageClass;

      const shouldSetCephRBDAsDefault = setCephRBDAsDefault(
        isRBDStorageClassDefault,
        deployment
      );
      const subSystemPayloads = createPayload({
        systemName: subSystemName,
        state: subSystemState,
        model,
        namespace: systemNamespace,
        storageClassName: storageClass.name,
        inTransitStatus: inTransitChecked,
        shouldSetCephRBDAsDefault: shouldSetCephRBDAsDefault,
      });

      // create internal mode cluster along with Non-RHCS StorageSystem (if any Ceph cluster already does not exists)
      if (!hasOCS && !isRhcs) {
        await labelNodes(nodes, systemNamespace);
        await createAdditionalFeatureResources();
        storageCluster = await createStorageCluster(
          state,
          systemNamespace,
          OCS_INTERNAL_CR_NAME
        );
      }
      // create additional NooBaa resources for external RHCS cluster (if opted via checkbox)
      if (!hasOCS && isRhcs) await createNooBaaResources();
      if (!isRhcs && !!waitToCreate) await waitToCreate(model);
      await createExternalSubSystem(subSystemPayloads);
    }
    if (storageCluster && state.capacityAndNodes.capacityAutoScaling.enable) {
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
    navigate('/odf/systems');
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
  hasOCS,
  supportedExternalStorage,
  existingNamespaces,
}) => {
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
        await handleReviewAndCreateNext(
          state,
          hasOCS,
          handleError,
          navigate,
          supportedExternalStorage,
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
  existingNamespaces: K8sResourceCommon[];
};

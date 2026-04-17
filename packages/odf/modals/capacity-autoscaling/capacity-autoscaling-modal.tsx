import * as React from 'react';
import { CapacityAutoScaling } from '@odf/core/components/create-storage-system/create-storage-system-steps/capacity-and-nodes-step/capacity-autoscaling';
import { createStorageAutoScaler } from '@odf/core/components/create-storage-system/payloads';
import { VALIDATIONS } from '@odf/core/components/utils/common-odf-install-el';
import { NO_PROVISIONER } from '@odf/core/constants';
import { scResource } from '@odf/core/resources';
import { ValidationType } from '@odf/core/types';
import {
  getOsdAmount,
  isValidCapacityAutoScalingConfig,
} from '@odf/core/utils/ocs';
import {
  CapacityAutoscalingStatus,
  ColoredIconProps,
  DEFAULT_DEVICECLASS,
  getName,
  getNamespace,
  GrayUnknownIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  RedExclamationTriangleIcon,
  StatusBox,
  StorageAutoScalerKind,
  StorageClassResourceKind,
} from '@odf/shared';
import { dateTimeFormatter } from '@odf/shared/details-page/datetime';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { StorageClusterActionModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import {
  StorageAutoScalerModel,
  StorageClusterModel,
} from '@odf/shared/models';
import { DeviceSet, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getStorageAutoScalerName, referenceForModel } from '@odf/shared/utils';
import {
  k8sDelete,
  k8sPatch,
  Patch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import * as _ from 'lodash-es';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { InProgressIcon, RunningIcon } from '@patternfly/react-icons';
import './capacity-autoscaling-modal.scss';

const getFormattedTime = (timestamp: string) =>
  dateTimeFormatter.format(new Date(timestamp));

type CapacityAutoscalingStatusProps = {
  currentStatus: string;
  error: StorageAutoScalerKind['status']['error'];
  lastExpansion?: StorageAutoScalerKind['status']['lastExpansion'];
};

const CapacityAutoscalingCurrentStatus: React.FC<
  CapacityAutoscalingStatusProps
> = ({ currentStatus, error, lastExpansion }) => {
  const { t } = useCustomTranslation();

  let StatusIcon:
    | React.ComponentClass<SVGIconProps>
    | React.FC<ColoredIconProps>;
  let statusText: string;
  switch (currentStatus) {
    case CapacityAutoscalingStatus.NotStarted:
      StatusIcon = RunningIcon;
      statusText = t('Actively monitoring, waiting for trigger');
      break;
    case CapacityAutoscalingStatus.InProgress:
      StatusIcon = InProgressIcon;
      statusText = t('Scaling is in progress');
      if (lastExpansion?.startTime) {
        statusText += `, ${t('started at ')} ${getFormattedTime(lastExpansion.startTime)}`;
      }
      break;
    case CapacityAutoscalingStatus.Succeeded:
      StatusIcon = GreenCheckCircleIcon;
      statusText = t('Completed');
      if (lastExpansion?.completionTime) {
        statusText += `, ${getFormattedTime(lastExpansion.completionTime)}`;
      }
      break;
    case CapacityAutoscalingStatus.Failed:
      StatusIcon = RedExclamationCircleIcon;
      statusText = t('Failed');
      if (error?.timestamp) {
        statusText += `, ${getFormattedTime(error.timestamp)}`;
      }
      if (error?.message) {
        statusText += `: ${error.message}`;
      }
      break;
    case CapacityAutoscalingStatus.Invalid:
      StatusIcon = RedExclamationTriangleIcon;
      statusText = t('Invalid');
      if (error?.timestamp) {
        statusText += `, ${getFormattedTime(error.timestamp)}`;
      }
      if (error?.message) {
        statusText += `: ${error.message}`;
      }
      break;
    default:
      StatusIcon = GrayUnknownIcon;
      statusText = t('Unknown');
  }

  return (
    <div className="pf-v6-u-mt-sm pf-v6-u-font-size-sm">
      <span className="pf-v6-u-font-family-heading pf-v6-u-mr-sm">
        {t('Current status:')}
      </span>
      <StatusIcon className="pf-v6-u-mr-sm" />
      {statusText}
    </div>
  );
};

const CapacityAutoscalingModal: React.FC<StorageClusterActionModalProps> = ({
  extraProps: { storageCluster: actionStorageCluster },
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const [enable, setEnable] = React.useState(false);
  const [capacityLimit, setCapacityLimit] = React.useState<string>(null);
  const [validation, setValidation] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState<Error>(null);
  const [storageCluster] = useK8sWatchResource<StorageClusterKind>({
    kind: referenceForModel(StorageClusterModel),
    name: getName(actionStorageCluster),
    namespace: getNamespace(actionStorageCluster),
  });
  const [
    storageAutoScalers,
    storageAutoScalerLoaded,
    storageAutoScalerLoadError,
  ] = useK8sWatchResource<StorageAutoScalerKind[]>({
    kind: referenceForModel(StorageAutoScalerModel),
    isList: true,
    namespace: getNamespace(storageCluster),
  });

  // Get no-provisioner storage classes.
  const [storageClasses, scLoaded, scLoadError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);
  const noProvisionerSCNames = storageClasses
    ?.filter((sc) => sc.provisioner === NO_PROVISIONER)
    .map((sc) => getName(sc));

  const isLoaded = storageAutoScalerLoaded && scLoaded;
  const isLoadError = storageAutoScalerLoadError || scLoadError;

  const deviceSets = storageCluster?.spec?.storageDeviceSets?.filter(
    (deviceSet: DeviceSet) =>
      _.isEmpty(deviceSet.deviceClass) ||
      deviceSet.deviceClass.toLowerCase() === DEFAULT_DEVICECLASS
  );
  // Autoscaling is not allowed if any storageDeviceSet is managed by
  // any no-provisioner storage class.
  const isCapacityAutoScalingAllowedInDay2 = _.isEmpty(
    deviceSets?.find((deviceSet: DeviceSet) =>
      noProvisionerSCNames.includes(
        deviceSet.dataPVCTemplate.spec.storageClassName
      )
    )
  );

  const clusterStorageAutoScalers = storageAutoScalers?.filter(
    (autoScaler) =>
      autoScaler.spec.storageCluster.name === getName(storageCluster) &&
      (_.isEmpty(autoScaler.spec.deviceClass) ||
        autoScaler.spec.deviceClass.toLowerCase() === DEFAULT_DEVICECLASS)
  );
  // Pick the ui-created autoscaler if it exists.
  let storageAutoScaler = clusterStorageAutoScalers?.find(
    (autoScaler) =>
      getName(autoScaler) === getStorageAutoScalerName(storageCluster)
  );
  if (!storageAutoScaler && clusterStorageAutoScalers.length > 0) {
    storageAutoScaler = clusterStorageAutoScalers[0];
  }

  const alreadyEnabled = !_.isEmpty(storageAutoScaler);
  let canEdit = isCapacityAutoScalingAllowedInDay2 && isLoaded && !isLoadError;
  const phase = storageAutoScaler?.status?.phase;
  const lastExpansion = storageAutoScaler?.status?.lastExpansion;
  const autoScalerError = storageAutoScaler?.status?.error;

  // Getting the osd size from the 1st device set is enough as we don't support
  // heterogeneous OSD sizes. See: https://access.redhat.com/articles/5001441
  const osdSize =
    storageCluster?.spec?.storageDeviceSets[0].dataPVCTemplate.spec.resources
      .requests.storage;
  const osdAmount = deviceSets
    ?.map((deviceSet: DeviceSet) =>
      getOsdAmount(deviceSet.count, deviceSet.replica)
    )
    .reduce((accumulator: number, current: number) => accumulator + current);

  const validate = React.useCallback(
    (isEnabled: boolean, newCapacityLimit: string) =>
      setValidation(
        isValidCapacityAutoScalingConfig(isEnabled, newCapacityLimit)
          ? ''
          : String(VALIDATIONS(ValidationType.CAPACITY_AUTOSCALING, t).title)
      ),
    [t]
  );

  const onChange = (_ev, checked: boolean) => {
    setEnable(checked);
    validate(checked, capacityLimit);
  };
  const onSelect = (selected: string) => {
    setCapacityLimit(selected);
    validate(enable, selected);
  };

  const save = async (): Promise<void> => {
    setError(null);
    setInProgress(true);

    try {
      if (enable) {
        if (!alreadyEnabled) {
          await createStorageAutoScaler(capacityLimit, storageCluster);
        } else {
          const patch: Patch = {
            op: 'replace',
            path: '/spec/storageCapacityLimit',
            value: capacityLimit,
          };
          await k8sPatch({
            model: StorageAutoScalerModel,
            resource: storageAutoScaler,
            data: [patch],
          });
        }
      } else if (!enable && alreadyEnabled) {
        if (phase === CapacityAutoscalingStatus.InProgress) {
          throw new Error(
            t(
              'Automatic capacity scaling cannot be disabled while scaling is in progress'
            )
          );
        }

        await k8sDelete({
          model: StorageAutoScalerModel,
          resource: {
            metadata: {
              name: getName(storageAutoScaler),
              namespace: getNamespace(storageCluster),
            },
          },
        });
      }

      setInProgress(false);
      closeModal();
    } catch (error) {
      setError(error);
      setInProgress(false);
    }
  };

  React.useEffect(() => {
    if (alreadyEnabled) {
      setEnable(true);
      setCapacityLimit(storageAutoScaler.spec?.storageCapacityLimit);
      validate(true, storageAutoScaler.spec?.storageCapacityLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyEnabled, validate]);
  const Header = <ModalHeader>{t('Automatic capacity scaling')}</ModalHeader>;
  return (
    <Modal
      aria-label={t('Automatic capacity scaling')}
      className="odf-capacity-autoscaling__modal"
      header={Header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
      variant={ModalVariant.large}
    >
      <ModalBody>
        {canEdit ? (
          <>
            <CapacityAutoScaling
              capacityLimit={capacityLimit}
              enable={enable}
              isEditView={true}
              onChange={onChange}
              onLimitSelect={onSelect}
              osdAmount={osdAmount}
              osdSize={osdSize}
            />
            {alreadyEnabled &&
              enable &&
              storageAutoScaler.status?.storageCapacityLimitReached && (
                <Alert
                  className="pf-v6-u-mt-md"
                  isInline
                  variant={AlertVariant.warning}
                  title={t('Cluster has reached its expansion limit.')}
                >
                  {t(
                    'Increasing the expansion limit is recommended to avoid capacity shortages and potential disruptions.'
                  )}
                </Alert>
              )}
            {alreadyEnabled && (
              <CapacityAutoscalingCurrentStatus
                currentStatus={phase}
                error={autoScalerError}
                lastExpansion={lastExpansion}
              />
            )}
            {alreadyEnabled && !enable && (
              <Alert
                className="pf-v6-u-mt-md"
                isInline
                variant={AlertVariant.warning}
                title={t('Disable automatic capacity scaling?')}
              >
                {t(
                  'Disabling Automatic capacity scaling will prevent the cluster from automatically increasing raw capacity when needed. This may lead to capacity shortages and potential disruptions.'
                )}
              </Alert>
            )}
            {validation && (
              <Alert
                className="pf-v6-u-mt-md"
                isInline
                variant={AlertVariant.danger}
                title={validation}
              ></Alert>
            )}
            {errorMessage && (
              <Alert
                className="pf-v6-u-mt-md"
                isInline
                variant={AlertVariant.danger}
                title={t('An error occurred')}
              >
                {errorMessage.message}
              </Alert>
            )}
          </>
        ) : !isLoaded || isLoadError ? (
          <StatusBox loaded={isLoaded} loadError={isLoadError} />
        ) : (
          <Alert
            className="pf-v6-u-mt-md"
            isInline
            variant={AlertVariant.danger}
            title={t(
              'Automatic capacity scaling is available only for dynamic storage.'
            )}
          >
            {t('Local storage is also present in the cluster.')}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          variant={ButtonVariant.secondary}
          onClick={closeModal}
          data-test-id="modal-cancel-action"
        >
          {t('Cancel')}
        </Button>
        {canEdit &&
          (!inProgress ? (
            <Button
              key="save"
              data-test="modal-save-action"
              data-test-id="confirm-action"
              variant={ButtonVariant.primary}
              onClick={save}
              isDisabled={
                (alreadyEnabled &&
                  enable &&
                  capacityLimit ===
                    storageAutoScaler.spec?.storageCapacityLimit) ||
                (!alreadyEnabled && !enable) ||
                !!validation ||
                !!errorMessage
              }
            >
              {t('Save changes')}
            </Button>
          ) : (
            <LoadingInline />
          ))}
      </ModalFooter>
    </Modal>
  );
};

export default CapacityAutoscalingModal;

import * as React from 'react';
import { CapacityAutoScaling } from '@odf/core/components/create-storage-system/create-storage-system-steps/capacity-and-nodes-step/capacity-autoscaling';
import { createStorageAutoScaler } from '@odf/core/components/create-storage-system/payloads';
import { VALIDATIONS } from '@odf/core/components/utils/common-odf-install-el';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { ValidationType } from '@odf/core/types';
import {
  getOsdAmount,
  isValidCapacityAutoScalingConfig,
} from '@odf/core/utils/ocs';
import {
  CapacityAutoscalingStatus,
  ColoredIconProps,
  DEFAULT_DEVICECLASS,
  getNamespace,
  GrayUnknownIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  StatusBox,
  StorageAutoScalerKind,
} from '@odf/shared';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useK8sGet } from '@odf/shared/hooks';
import { CommonModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import {
  StorageAutoScalerModel,
  StorageClusterModel,
} from '@odf/shared/models';
import {
  DeviceSet,
  StorageClusterKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getCapacityAutoScalingDefaultLimit,
  getStorageAutoScalerName,
  referenceForModel,
} from '@odf/shared/utils';
import { k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import * as _ from 'lodash-es';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { InProgressIcon, RunningIcon } from '@patternfly/react-icons';
import './capacity-autoscaling-modal.scss';

type CapacityAutoscalingStatusProps = {
  currentStatus: string;
  lastRunTimeStamp?: string;
};

const CapacityAutoscalingCurrentStatus: React.FC<CapacityAutoscalingStatusProps> =
  ({ currentStatus, lastRunTimeStamp }) => {
    const { t } = useCustomTranslation();

    let StatusIcon:
      | React.ComponentClass<SVGIconProps>
      | React.FC<ColoredIconProps>;
    let statusText: string;
    switch (currentStatus) {
      case CapacityAutoscalingStatus.Waiting:
        StatusIcon = RunningIcon;
        statusText = t('Actively monitoring, waiting for trigger');
        break;
      case CapacityAutoscalingStatus.InProgress:
        StatusIcon = InProgressIcon;
        statusText = t('Scaling is in progress');
        break;
      case CapacityAutoscalingStatus.Completed:
        StatusIcon = GreenCheckCircleIcon;
        statusText = `${t('Completed')}, ${lastRunTimeStamp}`;
        break;
      case CapacityAutoscalingStatus.Failure:
        StatusIcon = RedExclamationCircleIcon;
        statusText = `${t('Failed')}, ${lastRunTimeStamp}`;
        break;
      default:
        StatusIcon = GrayUnknownIcon;
        statusText = t('Unknown');
    }

    return (
      <div className="pf-v5-u-mt-sm">
        <span className="pf-v5-u-font-family-heading pf-v5-u-mr-sm">
          {t('Current status:')}
        </span>
        <StatusIcon className="pf-v5-u-mr-sm" />
        {statusText}
      </div>
    );
  };

type CapacityAutoscalingModalProps = {
  storageCluster: StorageClusterKind;
} & CommonModalProps;

const CapacityAutoscalingModal: React.FC<CapacityAutoscalingModalProps> = ({
  storageCluster,
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const [inProgress, setInProgress] = React.useState(false);
  const [validation, setValidation] = React.useState('');
  const [errorMessage, setError] = React.useState<Error>(null);

  const [storageAutoScaler, storageAutoScalerLoad, storageAutoScalerLoadError] =
    useSafeK8sWatchResource<StorageAutoScalerKind>((ns: string) => ({
      kind: referenceForModel(StorageAutoScalerModel),
      name: getStorageAutoScalerName(storageCluster),
      namespace: ns,
      isList: false,
    }));
  let enabled = false;
  let currentCapacityLimit = getCapacityAutoScalingDefaultLimit();
  let status = '';
  let lastRunTimeStamp = '';
  if (
    storageAutoScaler &&
    storageAutoScalerLoad &&
    !storageAutoScalerLoadError
  ) {
    enabled = true;
    currentCapacityLimit = storageAutoScaler.spec?.capacityLimit;
    status = storageAutoScaler.status?.phase;
    lastRunTimeStamp = storageAutoScaler.status?.lastRunTimeStamp;
  }
  const [enable, setEnable] = React.useState(enabled);
  const [capacityLimit, setCapacityLimit] =
    React.useState<string>(currentCapacityLimit);

  // Getting the osd size from the 1st device set is enough as we don't support
  // heterogeneous OSD sizes. See: https://access.redhat.com/articles/5001441
  const osdSize =
    storageCluster.spec.storageDeviceSets[0].dataPVCTemplate.spec.resources
      .requests.storage;
  const osdAmount = storageCluster.spec.storageDeviceSets
    ?.filter(
      (deviceSet: DeviceSet) =>
        _.isEmpty(deviceSet.deviceClass) ||
        deviceSet.deviceClass.toLowerCase() === DEFAULT_DEVICECLASS
    )
    .map((deviceSet: DeviceSet) =>
      getOsdAmount(deviceSet.count, deviceSet.replica)
    )
    .reduce((accumulator: number, current: number) => accumulator + current);

  const validate = React.useMemo(
    () => (isEnabled: boolean, newCapacityLimit: string) =>
      setValidation(
        isValidCapacityAutoScalingConfig(isEnabled, newCapacityLimit)
          ? ''
          : String(VALIDATIONS(ValidationType.CAPACITY_AUTOSCALING, t).title)
      ),
    [t]
  );

  const onChange = React.useMemo(
    () => (_ev, checked: boolean) => {
      setEnable(checked);
      validate(checked, capacityLimit);
    },
    [capacityLimit, setEnable, validate]
  );
  const onSelect = React.useMemo(
    () => (selected: string) => {
      setCapacityLimit(selected);
      validate(enable, selected);
    },
    [enable, setCapacityLimit, validate]
  );

  const submit = async (event: React.FormEvent<EventTarget>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setInProgress(true);

    try {
      if (enable && !storageAutoScaler) {
        await createStorageAutoScaler(capacityLimit, storageCluster);
      } else if (!enable && storageAutoScaler) {
        if (
          storageAutoScaler.status?.phase ===
          CapacityAutoscalingStatus.InProgress
        ) {
          throw new Error(
            t('Smart scaling cannot be disabled while scaling is in progress')
          );
        }

        await k8sDelete({
          model: StorageAutoScalerModel,
          resource: {
            metadata: {
              name: getStorageAutoScalerName(storageCluster),
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

  const Header = <ModalHeader>{t('Smart capacity scaling')}</ModalHeader>;
  return (
    <Modal
      aria-label={t('Smart capacity scaling')}
      className="odf-capacity-autoscaling__modal"
      header={Header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
      variant={ModalVariant.large}
    >
      <ModalBody>
        {storageAutoScalerLoad && !storageAutoScalerLoadError ? (
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
            {storageAutoScaler && (
              <CapacityAutoscalingCurrentStatus
                currentStatus={status}
                lastRunTimeStamp={lastRunTimeStamp}
              />
            )}
            {storageAutoScaler && !enable && (
              <Alert
                className="pf-v5-u-mt-md"
                isInline
                variant={AlertVariant.warning}
                title={t('Disable smart capacity scaling?')}
              >
                {t(
                  'Disabling Smart Scaling will prevent the cluster from automatically increasing raw capacity when needed. This may lead to capacity shortages and potential disruptions.'
                )}
              </Alert>
            )}
            {validation && (
              <Alert
                className="pf-v5-u-mt-md"
                isInline
                variant={AlertVariant.danger}
                title={validation}
              ></Alert>
            )}
            {errorMessage && (
              <Alert
                className="pf-v5-u-mt-md"
                isInline
                variant={AlertVariant.danger}
                title={t('An error occurred')}
              >
                {errorMessage.message}
              </Alert>
            )}
          </>
        ) : (
          <StatusBox
            loaded={storageAutoScalerLoad}
            loadError={storageAutoScalerLoadError}
          />
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
        {storageAutoScalerLoad &&
          !storageAutoScalerLoadError &&
          (!inProgress ? (
            <Button
              key="save"
              data-test="modal-submit-action"
              data-test-id="confirm-action"
              variant={ButtonVariant.primary}
              onClick={submit}
              isDisabled={
                (storageAutoScaler && enable) ||
                (!storageAutoScaler && !enable) ||
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

type CapacityAutoscalingActionModalProps = CommonModalProps & {
  storageSystem?: StorageSystemKind;
};

const CapacityAutoscalingActionModal: React.FC<CapacityAutoscalingActionModalProps> =
  ({ extraProps: { resource: storageSystem }, ...props }) => {
    const [ocs, ocsLoaded, ocsError] = useK8sGet<StorageClusterKind>(
      StorageClusterModel,
      storageSystem.spec.name,
      storageSystem.spec.namespace
    );
    if (!ocsLoaded || ocsError) {
      return null;
    }

    return <CapacityAutoscalingModal storageCluster={ocs} {...props} />;
  };

export default CapacityAutoscalingActionModal;

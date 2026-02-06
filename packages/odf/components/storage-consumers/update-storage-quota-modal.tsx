import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { DiskSize as QuotaSize } from '@odf/core/constants';
import { useRawCapacity } from '@odf/core/hooks';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { StorageQuota } from '@odf/core/types';
import { getQuotaValueInGiB, isValidQuota } from '@odf/core/utils';
import { StorageConsumerModel } from '@odf/shared';
import {
  GrayInfoCircleIcon,
  ModalFooter,
  Patch,
  StorageConsumerKind,
} from '@odf/shared';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeBinaryBytes,
  humanizeBinaryBytesWithoutB,
  parser,
  units,
} from '@odf/shared/utils';
import {
  BlueInfoCircleIcon,
  k8sPatch,
  StatusIconAndText,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import {
  Button,
  FlexItem,
  Flex,
  Alert,
  ButtonVariant,
  AlertVariant,
} from '@patternfly/react-core';
import './onboarding-modal.scss';
import { StorageQuotaBody } from './onboarding-modal';

const getStorageConsumerQuotaWithoutB = (quotaInGiB: number) => {
  const humanizedQuota = humanizeBinaryBytesWithoutB(
    units.dehumanize(quotaInGiB, 'binaryBytes').value,
    QuotaSize.Gi
  );
  return {
    value: humanizedQuota.value,
    unit: humanizedQuota.unit,
  } as StorageQuota;
};

const updateStorageConsumer = (
  storageConsumer: StorageConsumerKind,
  quotaValue: number
): Promise<StorageConsumerKind> => {
  const patches: Patch[] = [
    {
      op: 'replace',
      path: '/spec/storageQuotaInGiB',
      value: quotaValue,
    },
  ];
  return k8sPatch({
    model: StorageConsumerModel,
    resource: storageConsumer,
    data: patches,
  });
};

type UpdateStorageQuotaModalProps = CommonModalProps<{
  resource: StorageConsumerKind;
}>;

const UpdateStorageQuotaModal: React.FC<UpdateStorageQuotaModalProps> = (
  props
) => {
  const {
    extraProps: { resource },
    isOpen,
    closeModal,
  } = props;
  const { t } = useCustomTranslation();
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<string>(null);
  const initialQuota = getStorageConsumerQuotaWithoutB(
    resource?.spec?.storageQuotaInGiB
  );
  const [quota, setQuota] = React.useState(initialQuota);

  const updateStorageConsumerQuota = async () => {
    try {
      setInProgress(true);
      await updateStorageConsumer(resource, getQuotaValueInGiB(quota));
      closeModal();
    } catch (e) {
      setError(e);
    } finally {
      setInProgress(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalTitle>{t('Edit storage quota')}</ModalTitle>
      <ModalBody>
        {error && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            title={t(
              'Storage quota request failed. Make sure your Data Foundation provider cluster has enough capacity before trying again.'
            )}
          ></Alert>
        )}
        <StorageQuotaBody
          quota={quota}
          setQuota={setQuota}
          initialQuota={initialQuota}
          capacityInfo={<AvailableCapacity />}
        />
      </ModalBody>
      <ModalFooter inProgress={inProgress}>
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <Button
              key="cancel"
              variant={ButtonVariant.secondary}
              onClick={closeModal}
              data-test-id="modal-cancel-action"
            >
              {t('Cancel')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              key="save"
              data-test="modal-submit-action"
              data-test-id="confirm-action"
              variant={ButtonVariant.primary}
              onClick={updateStorageConsumerQuota}
              isDisabled={
                _.isEqual(quota, initialQuota) ||
                !isValidQuota(quota, initialQuota) ||
                inProgress
              }
              isLoading={inProgress}
            >
              {t('Save changes')}
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

const AvailableCapacity: React.FC = () => {
  const { t } = useCustomTranslation();

  const { odfNamespace: clusterNs } = useODFNamespaceSelector();
  const { systemFlags } = useODFSystemFlagsSelector();
  const clusterName = systemFlags[clusterNs]?.ocsClusterName;
  const [totalCapacity, usedCapacity, loading, loadError] =
    useRawCapacity(clusterName);
  const available = parser(totalCapacity) - parser(usedCapacity);

  let title: string;
  let icon: JSX.Element;
  if (loading || loadError) {
    title = t('Cluster capacity not available at this moment.');
    icon = <GrayInfoCircleIcon />;
  } else {
    title = `${t('Available capacity')} (${clusterName}): ${
      humanizeBinaryBytes(available).string
    }`;
    icon = <BlueInfoCircleIcon />;
  }
  return (
    <NamespaceSafetyBox>
      <StatusIconAndText
        title={title}
        icon={icon}
        className="text-muted pf-v6-u-font-size-sm odf-onboarding-modal__info-icon"
      />
    </NamespaceSafetyBox>
  );
};

export default UpdateStorageQuotaModal;

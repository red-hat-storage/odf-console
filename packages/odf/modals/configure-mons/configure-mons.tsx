import * as React from 'react';
import {
  StorageClusterKind,
  StorageClusterModel,
  getName,
  getNamespace,
  useCustomTranslation,
} from '@odf/shared';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useSelector } from 'react-redux';
import { compose } from 'redux';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { useSafeK8sGet } from '../../hooks';
import { getODFSystemFlags } from '../../redux';

const patch = [
  {
    op: 'replace',
    path: '/spec/managedResources/cephCluster/monCount',
    value: 5,
  },
];

const getStorageClusterName = (store: ReturnType<typeof getODFSystemFlags>) =>
  Object.entries(store.systemFlags).find(([, flags]) => flags.isInternalMode);

const getMonitorCount = (cluster: StorageClusterKind) =>
  cluster?.status?.currentMonCount;

const LowMonAlertModal: ModalComponent = ({ closeModal }) => {
  const [namespace, clusterFlags] = useSelector(
    compose(getStorageClusterName, getODFSystemFlags)
  );
  const { t } = useCustomTranslation();

  const [errorMessage, setErrorMessage] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);

  // ToDo (epic 4422) (bipuladh): Update it to use information from the alert.
  const [storageCluster, storageClusterLoaded, storageCluserLoadError] =
    useSafeK8sGet<StorageClusterKind>(
      StorageClusterModel,
      clusterFlags.ocsClusterName,
      namespace
    );

  const failureDomains = storageCluster?.status?.failureDomainValues?.length;
  const Header = <ModalHeader>{t('Configure Ceph Monitor')}</ModalHeader>;

  const monitorCount = getMonitorCount(storageCluster);

  const onSubmit = () => {
    setProgress(true);
    k8sPatch({
      model: StorageClusterModel,
      resource: {
        metadata: {
          name: getName(storageCluster),
          namespace: getNamespace(storageCluster),
        },
      },
      data: patch,
    })
      .then(() => {
        setProgress(false);
        closeModal();
      })
      .catch((err) => {
        setProgress(false);
        setErrorMessage(err);
      });
  };

  return (
    <Modal
      onClose={closeModal}
      isOpen={true}
      variant={ModalVariant.small}
      header={Header}
    >
      <ModalBody>
        <Flex
          direction={{ default: 'column' }}
          spaceItems={{ default: 'spaceItemsXl' }}
        >
          <FlexItem>
            {t(
              'To enhance cluster resilience, align Ceph Monitors with the available node failure domains.'
            )}
          </FlexItem>
          <FlexItem>
            <Flex
              direction={{ default: 'column' }}
              spaceItems={{ default: 'spaceItemsNone' }}
            >
              <FlexItem>
                {storageClusterLoaded ? (
                  t('Node failure domains: {{failureDomains}}', {
                    failureDomains,
                  })
                ) : (
                  <LoadingInline />
                )}
              </FlexItem>
              <FlexItem>
                {storageClusterLoaded ? (
                  t('Ceph Monitor count: {{monitorCount}}', { monitorCount })
                ) : (
                  <LoadingInline />
                )}
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Content component={ContentVariants.h6}>
              {t('Recommended Ceph Monitor count: 5')}
            </Content>
          </FlexItem>
        </Flex>
        {!!errorMessage && (
          <Alert isInline variant="danger" title={t('An error occurred')}>
            {(errorMessage as any)?.message || errorMessage}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          variant="secondary"
          onClick={closeModal}
          data-test-id="modal-cancel-action"
        >
          {t('Cancel')}
        </Button>
        {!inProgress && storageClusterLoaded ? (
          <Button
            key="Add"
            data-test="modal-submit-action"
            data-test-id="confirm-action"
            variant="primary"
            onClick={onSubmit}
            disabled={!!storageCluserLoadError}
          >
            {t('Update count')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

export const launchLowMonAlertModal = async (_alert, launchModal) => {
  try {
    launchModal(LowMonAlertModal, { isOpen: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error launching modal', e);
  }
};

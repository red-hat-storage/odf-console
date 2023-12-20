import * as React from 'react';
import {
  NodeKind,
  NodeModel,
  StorageClusterKind,
  StorageClusterModel,
  getName,
  getNamespace,
  useCustomTranslation,
  useK8sList,
} from '@odf/shared';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { useSelector } from 'react-redux';
import { compose } from 'redux';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalVariant,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { groupNodesByZones } from '../../components/topology/utils';
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
  cluster?.spec?.managedResources?.cephCluster?.monCount;

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

  const [nodes, nodesLoaded, nodesLoadError] = useK8sList<NodeKind>(NodeModel);
  const failureDomains =
    nodesLoaded && !nodesLoadError ? groupNodesByZones(nodes)?.length : [];
  const Header = <ModalHeader>{t('Configure monitor count')}</ModalHeader>;

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
  const allResourcesLoaded = storageClusterLoaded && nodesLoaded;

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
              'To enhance system resilience, align Ceph monitors with the available node failure zones.'
            )}
          </FlexItem>
          <FlexItem>
            <Flex
              direction={{ default: 'column' }}
              spaceItems={{ default: 'spaceItemsNone' }}
            >
              {!nodesLoadError && (
                <FlexItem>
                  {nodesLoaded ? (
                    t('Failure domains: {{failureDomains}}', { failureDomains })
                  ) : (
                    <LoadingInline />
                  )}
                </FlexItem>
              )}
              <FlexItem>
                {storageClusterLoaded ? (
                  t('Monitor count: {{monitorCount}}', { monitorCount })
                ) : (
                  <LoadingInline />
                )}
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Text component={TextVariants.h6}>
              {t('Recommended monitor count: 5')}
            </Text>
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
        {!inProgress && allResourcesLoaded ? (
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

export const launchLowMonAlertModal = async (alert, launchModal) => {
  try {
    launchModal(LowMonAlertModal, { isOpen: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error launching modal', e);
  }
};

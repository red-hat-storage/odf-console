import * as React from 'react';
import { getUID, StorageConsumerModel } from '@odf/shared';
import {
  getName,
  ModalFooter,
  StorageClassModel,
  StorageClassResourceKind,
  StorageConsumerKind,
  useCustomTranslation,
  VolumeSnapshotClassKind,
  VolumeSnapshotClassModel,
} from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import {
  K8sModel,
  k8sPatch,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal } from '@patternfly/react-core/deprecated';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { generatePatchForDistributionOfResources } from '../../components/ResourceDistribution/utils';
import './storageClientAttacherComponent.scss';
import { StorageConsumerTable } from './StorageConsumerTable';

const storageConsumerResource: WatchK8sResource = {
  isList: true,
  groupVersionKind: {
    group: StorageConsumerModel.apiGroup,
    version: StorageConsumerModel.apiVersion,
    kind: StorageConsumerModel.kind,
  },
};

type StorageClientAttacherModalProps = {
  resource: StorageClassResourceKind | VolumeSnapshotClassKind;
  resourceModel: K8sModel;
};

export const StorageClientAttacherModal: ModalComponent<
  CommonModalProps<StorageClientAttacherModalProps>
> = ({ closeModal, isOpen, extraProps: { resource, resourceModel } }) => {
  const resourceName = getName(resource);
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');

  const [selectedResources, setSelectedResources] = React.useState<string[]>(
    []
  );
  const { t } = useCustomTranslation();
  const [storageConsumers, loaded] = useK8sWatchResource<StorageConsumerKind[]>(
    storageConsumerResource
  );
  const isIntialSelection = React.useRef(false);

  const resourceTypeKey: keyof StorageConsumerKind['spec'] =
    resourceModel.kind === StorageClassModel.kind
      ? 'storageClasses'
      : resourceModel.kind === VolumeSnapshotClassModel.kind
        ? 'volumeSnapshotClasses'
        : 'volumeGroupSnapshotClasses';

  React.useEffect(() => {
    if (loaded && !isIntialSelection.current) {
      const storageConsumersWithCurrentResource = storageConsumers?.filter(
        (consumer) => {
          const resourceNames = consumer.spec[resourceTypeKey]?.map(
            (res) => res.name
          );
          return resourceNames?.includes(resourceName);
        }
      );
      setSelectedResources(storageConsumersWithCurrentResource.map(getUID));
      isIntialSelection.current = true;
    }
  }, [
    loaded,
    resourceModel.kind,
    storageConsumers,
    resourceName,
    resourceTypeKey,
  ]);

  const onSubmit = React.useCallback(() => {
    const promises = [];
    setProgress(true);
    storageConsumers?.forEach((storageConsumer) => {
      const isStorageConsumerSelected = selectedResources.includes(
        getUID(storageConsumer)
      );
      const storageClassNames =
        resourceModel.kind === StorageClassModel.kind &&
        isStorageConsumerSelected
          ? [
              resourceName,
              ...(storageConsumer.spec?.storageClasses?.map((sc) => sc.name) ||
                []),
            ]
          : [
              ...(storageConsumer.spec?.storageClasses
                ?.filter((sc) => sc.name !== resourceName)
                ?.map((sc) => sc.name) || []),
            ];
      const volumeSnapshotClassNames =
        resourceModel.kind === VolumeSnapshotClassModel.kind &&
        isStorageConsumerSelected
          ? [
              resourceName,
              ...(storageConsumer.spec?.volumeSnapshotClasses?.map(
                (vsc) => vsc.name
              ) || []),
            ]
          : [
              ...(storageConsumer.spec?.volumeSnapshotClasses
                ?.filter((vsc) => vsc.name !== resourceName)
                .map((vsc) => vsc.name) || []),
            ];
      const patch = generatePatchForDistributionOfResources(
        storageConsumer,
        storageClassNames,
        volumeSnapshotClassNames
      );
      promises.push(
        k8sPatch({
          model: StorageConsumerModel,
          resource: storageConsumer,
          data: patch,
        })
      );
    });
    Promise.all(promises)
      .then(() => {
        setProgress(false);
        closeModal();
      })
      .catch((err) => {
        setProgress(false);
        setError(err?.message);
      });
  }, [
    closeModal,
    resourceModel.kind,
    resourceName,
    selectedResources,
    storageConsumers,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={t('Manage distribution of Storage clients')}
      variant="medium"
    >
      <StorageConsumerTable
        loaded={loaded}
        resources={storageConsumers}
        columns={['Name', 'Cluster name', 'Last heartbeat']}
        selectedResources={selectedResources}
        setSelectedResources={setSelectedResources}
      />
      <ModalFooter inProgress={inProgress} errorMessage={error}>
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <Button key="Cancel" variant="secondary" onClick={closeModal}>
              {t('Cancel')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button key="Confirm" variant="primary" onClick={onSubmit}>
              {t('Save changes')}
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

import * as React from 'react';
import { StorageConsumerModel } from '@odf/core/models';
import {
  getName,
  ModalFooter,
  RowComponentType,
  SelectableTable,
  StorageClassModel,
  StorageClassResourceKind,
  StorageConsumerKind,
  useCustomTranslation,
  VolumeSnapshotClassKind,
  VolumeSnapshotClassModel,
} from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { sortRows } from '@odf/shared/utils';
import {
  K8sModel,
  k8sPatch,
  ListPageFilter,
  useK8sWatchResource,
  useListPageFilter,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Button, Flex, FlexItem, Modal } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import { generatePatchForDistributionOfResources } from '../../components/ResourceDistribution/utils';
import {
  getClusterName,
  LastHeartBeat,
} from '../../components/storage-consumers/client-list';
import './storageClientAttacherComponent.scss';

const RowComponent: React.FC<RowComponentType<StorageConsumerKind>> = ({
  row: client,
}) => {
  const name = getName(client);
  const clusterName = getClusterName(client);
  return (
    <>
      <Td>{name}</Td>
      <Td>{clusterName}</Td>
      <Td>
        <LastHeartBeat heartbeat={client.status?.lastHeartbeat} />{' '}
      </Td>
    </>
  );
};

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

  const [selectedResources, setSelectedResources] = React.useState<
    StorageConsumerKind[]
  >([]);
  const { t } = useCustomTranslation();
  const [storageConsumers, loaded] = useK8sWatchResource<StorageConsumerKind[]>(
    storageConsumerResource
  );
  const [unfilteredData, filteredData, onFilterChange] =
    useListPageFilter(storageConsumers);

  const onSubmit = React.useCallback(() => {
    const promises = [];
    setProgress(true);
    const storageClassNames =
      resourceModel.kind === StorageClassModel.kind ? [resourceName] : [];
    const volumeSnapshotClassNames =
      resourceModel.kind === VolumeSnapshotClassModel.kind
        ? [resourceName]
        : [];
    selectedResources.forEach((storageConsumer) => {
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
  }, [closeModal, resourceModel.kind, resourceName, selectedResources]);

  const columns = [
    {
      columnName: t('Name'),
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
    {
      columnName: t('Cluster name'),
      sortFunction: (a, b, c) => sortRows(a, b, c, 'status.client.clusterName'),
    },
    {
      columnName: t('Last heartbeat'),
      sortFunction: (a, b, c) => sortRows(a, b, c, 'status.lastHeartbeat'),
    },
  ];
  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={t('Manage distribution of Storage clients')}
      variant="medium"
    >
      <ListPageFilter
        data={unfilteredData}
        loaded={loaded}
        onFilterChange={onFilterChange}
        hideColumnManagement={true}
      />
      <SelectableTable<StorageConsumerKind>
        rows={filteredData}
        columns={columns}
        RowComponent={RowComponent}
        selectedRows={selectedResources}
        setSelectedRows={setSelectedResources}
        loaded={loaded}
        loadError={error}
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

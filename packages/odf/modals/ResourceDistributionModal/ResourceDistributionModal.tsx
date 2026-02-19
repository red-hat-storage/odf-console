import * as React from 'react';
import { NOOBAA_PROVISIONER } from '@odf/core/constants';
import {
  getName,
  StorageConsumerModel,
  getProvisioner,
  getUID,
  ModalFooter,
  StorageClassModel,
  StorageClassResourceKind,
  StorageConsumerKind,
  useCustomTranslation,
  VolumeSnapshotClassKind,
  VolumeSnapshotClassModel,
} from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { isCephDriver, isCephProvisioner } from '@odf/shared/utils';
import {
  WatchK8sResources,
  useK8sWatchResources,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  Modal,
  Flex,
  FlexItem,
  Button,
  Tabs,
  Tab,
  TabTitleText,
  Label,
} from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
import {
  ResourceDistributionTable,
  RowGeneratorProps,
  SelectedResources,
} from '../../components/ResourceDistribution/ResourceDistributionTable';
import { generatePatchForDistributionOfResources } from '../../components/ResourceDistribution/utils';

type Resources = {
  storageClasses: StorageClassResourceKind[];
  volumeSnapshotClasses: VolumeSnapshotClassKind[];
};

const resources: WatchK8sResources<Resources> = {
  storageClasses: {
    groupVersionKind: {
      group: StorageClassModel.apiGroup,
      version: StorageClassModel.apiVersion,
      kind: StorageClassModel.kind,
    },
    isList: true,
  },
  volumeSnapshotClasses: {
    groupVersionKind: {
      group: VolumeSnapshotClassModel.apiGroup,
      version: VolumeSnapshotClassModel.apiVersion,
      kind: VolumeSnapshotClassModel.kind,
    },
    isList: true,
  },
};

const isCephOrNooBaaProvisioner = (provisioner: string): boolean =>
  isCephProvisioner(provisioner) || _.endsWith(provisioner, NOOBAA_PROVISIONER);

export const StorageClassRowGenerator: React.FC<
  RowGeneratorProps<StorageClassResourceKind>
> = ({ resource: storageClass, onSelect, isSelected, rowIndex }) => {
  return (
    <Tr key={getUID(storageClass)}>
      <Td
        select={{
          rowIndex,
          onSelect: (_event, isSelecting) => onSelect(isSelecting),
          isSelected,
        }}
      />
      <Td>{getName(storageClass)}</Td>
      <Td>{getProvisioner(storageClass)}</Td>
      <Td>{storageClass?.reclaimPolicy}</Td>
    </Tr>
  );
};

const VolumeSnapshotClassRowGenerator: React.FC<RowGeneratorProps<any>> = ({
  resource: vsc,
  onSelect,
  isSelected,
  rowIndex,
}) => {
  return (
    <Tr key={getUID(vsc)}>
      <Td
        select={{
          rowIndex,
          onSelect: (_event, isSelecting) => onSelect(isSelecting),
          isSelected,
        }}
      />
      <Td>{getName(vsc)}</Td>
      <Td>{vsc?.driver}</Td>
      <Td>{vsc?.deletionPolicy}</Td>
    </Tr>
  );
};

export const DistributeResourceModal: React.FC<
  CommonModalProps<{ resource: StorageConsumerKind }>
> = ({ closeModal, isOpen, extraProps: { resource } }) => {
  const { t } = useCustomTranslation();
  const [selectedResources, setSelectedResources] =
    React.useState<SelectedResources>({
      storageClass: {},
      volumeSnapshotClass: {},
    });
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  const data = useK8sWatchResources<Resources>(resources);
  const filteredStorageClasses = data.storageClasses.data.filter((res) =>
    isCephOrNooBaaProvisioner(getProvisioner(res))
  );
  const filteredVolumeSnapshotClasses = data.volumeSnapshotClasses.data.filter(
    (res) => isCephProvisioner(res?.driver)
  );

  const isStorageClassDataLoaded = data?.storageClasses?.loaded;
  const isVolumeSnapshotClassDataLoaded = data?.volumeSnapshotClasses?.loaded;

  const handleTabClick = (_event, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  const selectedStorageClassesCount = Object.entries(
    selectedResources?.storageClass
  ).filter(([, value]) => !!value).length;
  const selectedVolumeSnapshotClassesCount = Object.entries(
    selectedResources?.volumeSnapshotClass
  ).filter(([, value]) => !!value).length;

  React.useEffect(() => {
    if (
      isStorageClassDataLoaded &&
      isVolumeSnapshotClassDataLoaded &&
      _.isEmpty(selectedResources.storageClass) &&
      _.isEmpty(selectedResources.volumeSnapshotClass)
    ) {
      const preselectedStorageClasses = resource.spec?.storageClasses?.map(
        (sc) => sc?.name
      );
      const preselectedVolumeSnapshotClasses =
        resource.spec?.volumeSnapshotClasses?.map((vsc) => vsc?.name);
      const newSelectedResources: SelectedResources = {
        storageClass: {},
        volumeSnapshotClass: {},
      };
      newSelectedResources.storageClass = data.storageClasses.data
        .filter((sc) => isCephOrNooBaaProvisioner(getProvisioner(sc)))
        .reduce((acc, storageClass) => {
          acc[getName(storageClass)] = preselectedStorageClasses?.includes(
            getName(storageClass)
          );
          return acc;
        }, {});
      newSelectedResources.volumeSnapshotClass = data.volumeSnapshotClasses.data
        .filter((vsc) => isCephDriver(vsc?.driver))
        .reduce((acc, vs) => {
          acc[getName(vs)] = preselectedVolumeSnapshotClasses?.includes(
            getName(vs)
          );
          return acc;
        }, {});
      setSelectedResources(newSelectedResources);
    }
  }, [
    data.storageClasses.data,
    data.storageClasses.loaded,
    data.volumeSnapshotClasses.data,
    isStorageClassDataLoaded,
    isVolumeSnapshotClassDataLoaded,
    resource.spec?.storageClasses,
    resource.spec?.volumeGroupSnapshotClasses,
    resource.spec?.volumeSnapshotClasses,
    selectedResources,
  ]);

  const onConfirm = () => {
    const selectedStorageClasses = Object.entries(
      selectedResources.storageClass
    )
      .filter(([, value]) => value)
      .map(([key]) => key);
    const selectedVolumeSnapshotClasses = Object.entries(
      selectedResources.volumeSnapshotClass
    )
      .filter(([, value]) => value)
      .map(([key]) => key);
    const patch = generatePatchForDistributionOfResources(
      resource,
      selectedStorageClasses,
      selectedVolumeSnapshotClasses
    );
    setProgress(true);
    k8sPatch({ model: StorageConsumerModel, resource, data: patch })
      .then(() => {
        setProgress(false);
        closeModal();
      })
      .catch((err) => {
        setProgress(false);
        setError(err.message);
      });
  };
  return (
    <Modal
      title={t('Manage distribution of resources')}
      isOpen
      onClose={closeModal}
      open={isOpen}
      variant="medium"
    >
      <Tabs activeKey={activeTabKey} onSelect={handleTabClick}>
        <Tab
          eventKey={0}
          title={
            <TabTitleText>
              {t('Storage classes')}{' '}
              <Label>{selectedStorageClassesCount}</Label>
            </TabTitleText>
          }
        >
          <ResourceDistributionTable
            resources={filteredStorageClasses}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            RowGenerator={StorageClassRowGenerator}
            loaded={isStorageClassDataLoaded}
            columns={[t('Name'), t('Provisioner'), t('Deletion policy')]}
            resourceType="storageClass"
          />
        </Tab>
        <Tab
          eventKey={1}
          title={
            <TabTitleText>
              {t('VolumeSnapshot classes')}{' '}
              <Label>{selectedVolumeSnapshotClassesCount}</Label>
            </TabTitleText>
          }
        >
          <ResourceDistributionTable
            resources={filteredVolumeSnapshotClasses}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            RowGenerator={VolumeSnapshotClassRowGenerator}
            loaded={isVolumeSnapshotClassDataLoaded}
            columns={[t('Name'), t('Driver'), t('Deletion policy')]}
            resourceType="volumeSnapshotClass"
          />
        </Tab>
      </Tabs>
      <ModalFooter inProgress={inProgress} errorMessage={error}>
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <Button key="Cancel" variant="secondary" onClick={closeModal}>
              {t('Cancel')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button key="Confirm" variant="primary" onClick={onConfirm}>
              {t('Save changes')}
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

export default DistributeResourceModal;

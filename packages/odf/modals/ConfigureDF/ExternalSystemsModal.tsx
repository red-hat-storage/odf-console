import * as React from 'react';
import { FDF_FLAG } from '@odf/core/redux';
import { useGetExternalClusterDetails } from '@odf/core/redux/utils';
import {
  DEFAULT_INFRASTRUCTURE,
  InfrastructureKind,
  InfrastructureModel,
  RHCS_SUPPORTED_INFRA,
  useCustomTranslation,
  useK8sGet,
} from '@odf/shared';
import { useWatchStorageClusters } from '@odf/shared/hooks/useWatchStorageClusters';
import { getInfrastructurePlatform } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Flex,
  FlexItem,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  TextContent,
  Text,
  Modal,
  Title,
  Button,
  Radio,
  ButtonVariant,
} from '@patternfly/react-core';

type ConfigureDFSelectionsProps = {
  selectedOption: ExternalSystemOption;
  setSelectedOption: (option: ExternalSystemOption) => void;
};

enum ExternalSystemOption {
  RedHatCeph = 'redhat-ceph',
  IBMFlash = 'ibm-flash',
  Scale = 'scale',
  SAN = 'san',
}

const ConfigureExternalSystems: React.FC<ConfigureDFSelectionsProps> = ({
  selectedOption,
  setSelectedOption,
}) => {
  const { t } = useCustomTranslation();

  const isFDF = useFlag(FDF_FLAG);
  const [infrastructure] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );

  const externalClusterDetails = useGetExternalClusterDetails();
  const hasExternalStorageClusters = externalClusterDetails.clusterName !== '';
  const platform = getInfrastructurePlatform(infrastructure);
  const isRHCSSupported = RHCS_SUPPORTED_INFRA.includes(platform);

  // Check if Scale cluster or SAN cluster exists
  const { remoteClusters, sanClusters } = useWatchStorageClusters();
  const hasScaleCluster =
    remoteClusters?.loaded &&
    !remoteClusters?.loadError &&
    remoteClusters?.data?.length > 0;
  const hasSANCluster =
    sanClusters?.loaded &&
    !sanClusters?.loadError &&
    sanClusters?.data?.length > 0;
  const shouldDisableSAN = hasScaleCluster || hasSANCluster;
  const shouldDisableScale = hasSANCluster;
  return (
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsXl', md: 'spaceItemsMd' }}
      className="pf-v5-u-mt-md"
    >
      <FlexItem>
        <Card
          id="setup-ceph-cluster"
          isClickable={isRHCSSupported && !hasExternalStorageClusters}
          isDisabled={!isRHCSSupported || hasExternalStorageClusters}
        >
          <CardHeader
            selectableActions={{
              onClickAction: () =>
                setSelectedOption(ExternalSystemOption.RedHatCeph),
              selectableActionId: 'ceph-cluster',
            }}
          >
            <CardTitle>{t('Red Hat/IBM Ceph Cluster')}</CardTitle>
          </CardHeader>
          <CardBody>
            <Flex direction={{ default: 'row' }}>
              <FlexItem>
                <TextContent>
                  <Text component="small">
                    {t(
                      'Provision a storage cluster using local devices on your OpenShift nodes.'
                    )}
                  </Text>
                </TextContent>
              </FlexItem>
              <FlexItem align={{ default: 'alignRight' }}>
                <Radio
                  isDisabled={!isRHCSSupported || hasExternalStorageClusters}
                  isChecked={selectedOption === ExternalSystemOption.RedHatCeph}
                  onChange={() =>
                    setSelectedOption(ExternalSystemOption.RedHatCeph)
                  }
                  name="setup-ceph-radio"
                  id="setup-ceph-radio"
                />
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </FlexItem>
      <FlexItem>
        <Card isClickable id="connect-flash-system">
          <CardHeader
            selectableActions={{
              onClickAction: () =>
                setSelectedOption(ExternalSystemOption.IBMFlash),
              selectableActionId: 'flash-system',
            }}
          >
            <CardTitle>{t('IBM FlashSystem')}</CardTitle>
          </CardHeader>
          <CardBody>
            <Flex direction={{ default: 'row' }}>
              <FlexItem>
                <TextContent>
                  <Text component="small">
                    {t(
                      'Connect to an IBM FlashSystem to power Data Foundation with fast reliable block storage optimized for enterprise performance.'
                    )}
                  </Text>
                </TextContent>
              </FlexItem>
              <FlexItem align={{ default: 'alignRight' }}>
                <Radio
                  isChecked={selectedOption === ExternalSystemOption.IBMFlash}
                  onChange={() =>
                    setSelectedOption(ExternalSystemOption.IBMFlash)
                  }
                  name="setup-flash-radio"
                  id="setup-flash-radio"
                />
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </FlexItem>
      {isFDF && (
        <>
          <FlexItem>
            <Card
              id="setup-scale-storage"
              isClickable={!shouldDisableScale}
              isDisabled={shouldDisableScale}
            >
              <CardHeader
                selectableActions={{
                  selectableActionId: 'scale-storage',
                  onClickAction: () =>
                    setSelectedOption(ExternalSystemOption.Scale),
                }}
              >
                <CardTitle>{t('IBM Scale')}</CardTitle>
              </CardHeader>
              <CardBody>
                <Flex direction={{ default: 'row' }}>
                  <FlexItem>
                    <TextContent>
                      <Text component="small">
                        {t(
                          'Connect to IBM Storage Scale to deliver fast, scalable file storage for Data Foundation'
                        )}
                      </Text>
                    </TextContent>
                  </FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    <Radio
                      isChecked={selectedOption === ExternalSystemOption.Scale}
                      onChange={() =>
                        setSelectedOption(ExternalSystemOption.Scale)
                      }
                      isDisabled={shouldDisableScale}
                      name="setup-scale-radio"
                      id="setup-scale-radio"
                    />
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </FlexItem>
          <FlexItem>
            <Card
              id="setup-san-storage"
              isClickable={!shouldDisableSAN}
              isDisabled={shouldDisableSAN}
            >
              <CardHeader
                selectableActions={{
                  selectableActionId: 'san-storage',
                  onClickAction: () =>
                    setSelectedOption(ExternalSystemOption.SAN),
                }}
              >
                <CardTitle>{t('Storage Area Network')}</CardTitle>
              </CardHeader>
              <CardBody>
                <Flex direction={{ default: 'row' }}>
                  <FlexItem>
                    <TextContent>
                      <Text component="small">
                        {t(
                          'Use groups of shared LUNs from local cluster nodes to create StorageClases with Fusion Data Foundation Access for SAN.'
                        )}
                      </Text>
                    </TextContent>
                  </FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    <Radio
                      isDisabled={shouldDisableSAN}
                      isChecked={selectedOption === ExternalSystemOption.SAN}
                      onChange={() =>
                        setSelectedOption(ExternalSystemOption.SAN)
                      }
                      name="setup-scale-radio"
                      id="setup-scale-radio"
                    />
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </FlexItem>
        </>
      )}
    </Flex>
  );
};

const ModalHeader: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <>
      <Title headingLevel="h1" id="welcome-df-modal-title">
        {t('Connect to external storage')}
      </Title>
      <TextContent>
        <Text component="small">
          {t(
            'Data Foundation simplifies persistent storage and data services across your cloud-native infrastructure'
          )}
        </Text>
      </TextContent>
    </>
  );
};

export const ExternalSystemsSelectModal: ModalComponent = ({ closeModal }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] =
    React.useState<ExternalSystemOption>(null);

  const handleNext = () => {
    if (selectedOption === ExternalSystemOption.RedHatCeph) {
      navigate('/odf/external-systems/ceph/~create');
    } else if (selectedOption === ExternalSystemOption.IBMFlash) {
      navigate('/odf/external-systems/flash/~create');
    } else if (selectedOption === ExternalSystemOption.Scale) {
      navigate('/odf/external-systems/scale/~create');
    } else if (selectedOption === ExternalSystemOption.SAN) {
      navigate('/odf/external-systems/san/~create');
    }
    closeModal();
  };

  return (
    <Modal
      aria-label={t('Connect external system')}
      width="auto"
      isOpen={true}
      title={t('Connect external system')}
      header={<ModalHeader />}
      onClose={closeModal}
      actions={[
        <Button
          key="create-storage-cluster"
          variant={ButtonVariant.primary}
          onClick={handleNext}
          isDisabled={!selectedOption}
        >
          {t('Next')}
        </Button>,
        <Button
          key="create-storage-cluster"
          variant="link"
          onClick={closeModal}
        >
          {t('Cancel')}
        </Button>,
      ]}
    >
      <TextContent>
        <Text component="h4">
          {t('Select a platform to connect an external storage')}
        </Text>
        <Text component="small">
          {t(
            'This selection determines the storage capabilities of your cluster. Once configured it cannot be changed.'
          )}
        </Text>
      </TextContent>
      <ConfigureExternalSystems
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
    </Modal>
  );
};

import * as React from 'react';
import { CREATE_SS_PAGE_URL } from '@odf/core/constants';
import { StartingPoint } from '@odf/core/types/install-ui';
import { useCustomTranslation } from '@odf/shared';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { Modal } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Flex,
  FlexItem,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Content,
  Title,
  Button,
} from '@patternfly/react-core';
import { ExternalSystemsSelectModal } from './ExternalSystemsModal';
import './StorageClusterCreateModal.scss';

type ConfigureDFSelectionsProps = {
  closeModal: () => void;
};

export const ConfigureDFSelections: React.FC<ConfigureDFSelectionsProps> = ({
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const launchModal = useModal();

  const redirectTo = (installationFlow: StartingPoint) => () => {
    const urlParams = new URLSearchParams({ mode: installationFlow });
    navigate(`${CREATE_SS_PAGE_URL}?${urlParams.toString()}`);
    closeModal();
  };

  const showExternalSystems = () => {
    closeModal();
    launchModal(ExternalSystemsSelectModal, {});
  };

  return (
    <Flex
      direction={{ default: 'row' }}
      spaceItems={{ default: 'spaceItemsXl', md: 'spaceItemsMd' }}
      className="odf-storage-cluster-create-modal__cards-container"
    >
      <FlexItem>
        <Card
          id="setup-storage-cluster"
          isClickable
          className="odf-storage-cluster-create-modal__setup-card"
          data-test="create-storage-cluster"
        >
          <CardHeader
            selectableActions={{
              onClickAction: redirectTo(StartingPoint.STORAGE_CLUSTER),
              selectableActionId: StartingPoint.STORAGE_CLUSTER,
            }}
          >
            <CardTitle>{t('Create Storage Cluster')}</CardTitle>
          </CardHeader>
          <CardBody>
            <Content>
              <Content component="small">
                {t(
                  'Provision a storage cluster using local devices on your OpenShift nodes.'
                )}
              </Content>
            </Content>
          </CardBody>
        </Card>
      </FlexItem>
      <FlexItem>
        <Card
          isClickable
          id="connect-external-system"
          className="odf-storage-cluster-create-modal__setup-card"
        >
          <CardHeader
            selectableActions={{
              onClickAction: showExternalSystems,
              selectableActionId: 'external-system',
            }}
          >
            <CardTitle>{t('Connect to an external system')}</CardTitle>
          </CardHeader>
          <CardBody>
            <Content>
              <Content component="small">
                {t(
                  'Integrate Data Foundation with an existing storage backend such as external Ceph cluster or IBM FlashSystem.'
                )}
              </Content>
            </Content>
          </CardBody>
        </Card>
      </FlexItem>
      <FlexItem>
        <Card
          id="setup-object-storage"
          className="odf-storage-cluster-create-modal__setup-card"
          isClickable
        >
          <CardHeader
            selectableActions={{
              onClickAction: redirectTo(StartingPoint.OBJECT_STORAGE),
              selectableActionId: StartingPoint.OBJECT_STORAGE,
            }}
          >
            <CardTitle>{t('Setup Multicloud Object Gateway')}</CardTitle>
          </CardHeader>
          <CardBody>
            <Content>
              <Content component="small">
                {t(
                  'Enable S3-compatible object storage that spans across multiple cloud providers or hybrid environments'
                )}
              </Content>
            </Content>
          </CardBody>
        </Card>
      </FlexItem>
    </Flex>
  );
};

const ModalHeader: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <>
      <Title headingLevel="h1" id="welcome-df-modal-title">
        {t('Welcome to Data Foundation')}
      </Title>
      <Content>
        <Content component="small">
          {t(
            'Data Foundation simplifies persistent storage and data services across your infrastructure.'
          )}
        </Content>
      </Content>
    </>
  );
};

type DataFoundationInitialCreateModalProps = {
  closeModal: () => void;
};

export const StorageClusterCreateModal: React.FC<
  DataFoundationInitialCreateModalProps
> = ({ closeModal }) => {
  const { t } = useCustomTranslation();

  return (
    <Modal
      aria-label="Welcome to Data Foundation"
      width="auto"
      isOpen={true}
      title={t('Welcome to Data Foundation')}
      header={<ModalHeader />}
      onClose={closeModal}
      className="odf-storage-cluster-create-modal"
      actions={[
        <Button
          key="create-storage-cluster"
          variant="link"
          onClick={closeModal}
        >
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Content className="odf-storage-cluster-create-modal__body-text">
        <Content component="h4">
          {t('Choose how to set your Data Foundation cluster')}
        </Content>
        <Content component="small">
          {t(
            'This selection determines the storage capabilities of your cluster. Once configured it cannot be changed.'
          )}
        </Content>
      </Content>
      <ConfigureDFSelections closeModal={closeModal} />
    </Modal>
  );
};

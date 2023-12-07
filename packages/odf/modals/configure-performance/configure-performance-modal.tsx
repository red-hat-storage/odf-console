import * as React from 'react';
import ConfigurePerformance from '@odf/core/components/create-storage-system/create-storage-system-steps/capacity-and-nodes-step/configure-performance';
import { labelNodes } from '@odf/core/components/create-storage-system/payloads';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import {
  createWizardNodeState,
  getTotalCpu,
  getTotalMemoryInGiB,
} from '@odf/core/components/utils';
import { ValidationMessage } from '@odf/core/components/utils/common-odf-install-el';
import {
  RESOURCE_PROFILE_REQUIREMENTS_MAP,
  resourceRequirementsTooltip,
} from '@odf/core/constants';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { ResourceProfile, ValidationType } from '@odf/core/types';
import { isResourceProfileAllowed } from '@odf/core/utils';
import { FieldLevelHelp } from '@odf/shared/generic';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useK8sGet } from '@odf/shared/hooks';
import { CommonModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { OCSStorageClusterModel } from '@odf/shared/models';
import {
  NodeKind,
  StorageClusterKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Patch, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Button,
  Modal,
  ModalVariant,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { SelectNodesTable } from '../../components/create-storage-system/select-nodes-table/select-nodes-table';
import './configure-performance-modal.scss';

const getValidation = (
  profile: ResourceProfile,
  nodes: WizardNodeState[]
): ValidationType => {
  if (!profile) {
    return null;
  }

  return isResourceProfileAllowed(
    profile,
    getTotalCpu(nodes),
    getTotalMemoryInGiB(nodes)
  )
    ? null
    : ValidationType.RESOURCE_PROFILE;
};

type ProfileRequirementsModalTextProps = {
  selectedProfile: ResourceProfile;
};

const ProfileRequirementsModalText: React.FC<ProfileRequirementsModalTextProps> =
  ({ selectedProfile }) => {
    const { t } = useCustomTranslation();
    const { minCpu, minMem } =
      RESOURCE_PROFILE_REQUIREMENTS_MAP[selectedProfile];
    return (
      <TextContent>
        <Text id="resource-requirements" className="pf-u-font-size-md">
          <span className="pf-u-mr-sm">
            {t(
              `The aggregate resource requirements for ${selectedProfile} mode is`
            )}
          </span>
          <span className="pf-u-font-weight-bold pf-u-font-size-md">
            {minCpu} {t('CPUs')}
          </span>{' '}
          {t('and')}{' '}
          <span className="pf-u-font-weight-bold pf-u-font-size-md pf-u-mr-xs">
            {minMem} {t('GiB RAM')}
          </span>
          {selectedProfile === ResourceProfile.Performance && (
            <FieldLevelHelp>{resourceRequirementsTooltip(t)}</FieldLevelHelp>
          )}
        </Text>
      </TextContent>
    );
  };

type ConfigurePerformanceModalProps = {
  storageCluster: StorageClusterKind;
} & CommonModalProps;

const ConfigurePerformanceModal: React.FC<ConfigurePerformanceModalProps> = ({
  storageCluster,
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState<Error>(null);

  const [resourceProfile, setResourceProfile] = React.useState<ResourceProfile>(
    storageCluster.spec.resourceProfile
  );
  const [selectedNodes, setSelectedNodes] = React.useState<WizardNodeState[]>(
    []
  );
  const [validation, setValidation] = React.useState<ValidationType>(null);
  const onProfileChange = React.useCallback(
    (newProfile: ResourceProfile): void => {
      setResourceProfile(newProfile);
      setValidation(getValidation(newProfile, selectedNodes));
    },
    [selectedNodes]
  );
  const onRowSelected = React.useCallback(
    (newNodes: NodeKind[]) => {
      const nodes = createWizardNodeState(newNodes);
      setSelectedNodes(nodes);
      setValidation(getValidation(resourceProfile, nodes));
    },
    [resourceProfile]
  );

  const submit = async (event: React.FormEvent<EventTarget>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setProgress(true);
    if (validation) {
      setProgress(false);
      return;
    }
    try {
      await labelNodes(selectedNodes, odfNamespace);

      const patch: Patch = {
        op: 'replace',
        path: '/spec/resourceProfile',
        value: resourceProfile,
      };
      await k8sPatch({
        model: OCSStorageClusterModel,
        resource: storageCluster,
        data: [patch],
      });
      setProgress(false);
      closeModal();
    } catch (error) {
      setError(error);
      setProgress(false);
    }
  };
  const Header = <ModalHeader>{t('Configure Performance')}</ModalHeader>;
  return (
    <Modal
      header={Header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
      variant={ModalVariant.small}
      className="configure-performance-modal--overflow"
      aria-label={t('Add Capacity')}
      width={950}
    >
      <ModalBody className="configure-performance-modal--overflow">
        <ConfigurePerformance
          onResourceProfileChange={onProfileChange}
          resourceProfile={resourceProfile}
          profileRequirementsText={ProfileRequirementsModalText}
          selectedNodes={selectedNodes}
        />
        <SelectNodesTable
          nodes={selectedNodes}
          onRowSelected={onRowSelected}
          disableLabeledNodes={true}
        />
        {validation && (
          <ValidationMessage
            key={validation}
            validation={validation}
            className="pf-u-mt-md"
          />
        )}
        {errorMessage && (
          <Alert
            className="pf-u-mt-md"
            isInline
            variant="danger"
            title={t('An error occurred')}
          >
            {errorMessage.message}
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
        {!inProgress ? (
          <Button
            key="save"
            data-test="modal-submit-action"
            data-test-id="confirm-action"
            variant="primary"
            onClick={submit}
            isDisabled={!resourceProfile || !isNsSafe || !!validation}
          >
            {t('Save changes')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

type ConfigureSSPerformanceModalProps = CommonModalProps & {
  storageSystem?: StorageSystemKind;
};

const ConfigureSSPerformanceModal: React.FC<ConfigureSSPerformanceModalProps> =
  ({ extraProps: { resource: storageSystem }, ...props }) => {
    const [ocs, ocsLoaded, ocsError] = useK8sGet<StorageClusterKind>(
      OCSStorageClusterModel,
      storageSystem.spec.name,
      storageSystem.spec.namespace
    );
    if (!ocsLoaded || ocsError) {
      return null;
    }

    return <ConfigurePerformanceModal storageCluster={ocs} {...props} />;
  };

export default ConfigureSSPerformanceModal;

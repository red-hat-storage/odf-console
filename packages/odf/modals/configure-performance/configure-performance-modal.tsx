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
import { resourceRequirementsTooltip } from '@odf/core/constants';
import { NodeData, ResourceProfile, ValidationType } from '@odf/core/types';
import {
  getOsdAmount,
  getResourceProfileRequirements,
  isResourceProfileAllowed,
} from '@odf/core/utils';
import { FieldLevelHelp } from '@odf/shared/generic';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useK8sGet } from '@odf/shared/hooks';
import { CommonModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { StorageClusterModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import {
  DeviceSet,
  StorageClusterKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Patch, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Modal,
  ModalVariant,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { SelectNodesTable } from '../../components/create-storage-system/select-nodes-table/select-nodes-table';
import './configure-performance-modal.scss';

const getValidation = (
  profile: ResourceProfile,
  nodes: WizardNodeState[],
  osdAmount: number
): ValidationType => {
  if (!profile) {
    return null;
  }

  return isResourceProfileAllowed(
    profile,
    getTotalCpu(nodes),
    getTotalMemoryInGiB(nodes),
    osdAmount
  )
    ? null
    : ValidationType.RESOURCE_PROFILE;
};

type ProfileRequirementsModalTextProps = {
  selectedProfile: ResourceProfile;
  osdAmount: number;
};

const ProfileRequirementsModalText: React.FC<
  ProfileRequirementsModalTextProps
> = ({ selectedProfile, osdAmount }) => {
  const { t } = useCustomTranslation();
  const { minCpu, minMem } = getResourceProfileRequirements(
    selectedProfile,
    osdAmount
  );
  return (
    <TextContent>
      <Text id="resource-requirements" className="pf-v5-u-font-size-md">
        <span className="pf-v5-u-mr-sm">
          {t(
            'The aggregate resource requirements for {{selectedProfile}} mode is',
            {
              selectedProfile,
            }
          )}
        </span>
        <span className="pf-v5-u-font-weight-bold pf-v5-u-font-size-md">
          {minCpu} {t('CPUs')}
        </span>{' '}
        {t('and')}{' '}
        <span className="pf-v5-u-font-weight-bold pf-v5-u-font-size-md pf-v5-u-mr-xs">
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
  const systemNs = getNamespace(storageCluster);

  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState<Error>(null);

  const [resourceProfile, setResourceProfile] = React.useState<ResourceProfile>(
    storageCluster.spec.resourceProfile
  );
  const [selectedNodes, setSelectedNodes] = React.useState<WizardNodeState[]>(
    []
  );
  const [validation, setValidation] = React.useState<ValidationType>(null);
  const osdAmount = storageCluster.spec.storageDeviceSets
    ?.map((deviceSet: DeviceSet) =>
      getOsdAmount(deviceSet.count, deviceSet.replica)
    )
    .reduce((accumulator: number, current: number) => accumulator + current);

  const onProfileChange = React.useCallback(
    (newProfile: ResourceProfile): void => {
      setResourceProfile(newProfile);
      setValidation(getValidation(newProfile, selectedNodes, osdAmount));
    },
    [selectedNodes, osdAmount]
  );
  const onRowSelected = React.useCallback(
    (newNodes: NodeData[]) => {
      const nodes = createWizardNodeState(newNodes);
      setSelectedNodes(nodes);
      setValidation(getValidation(resourceProfile, nodes, osdAmount));
    },
    [resourceProfile, osdAmount]
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
      await labelNodes(selectedNodes, systemNs);

      const patch: Patch = {
        op: 'replace',
        path: '/spec/resourceProfile',
        value: resourceProfile,
      };
      await k8sPatch({
        model: StorageClusterModel,
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
      aria-label={t('Configure performance')}
      width={950}
    >
      <ModalBody className="configure-performance-modal--overflow">
        <ConfigurePerformance
          onResourceProfileChange={onProfileChange}
          resourceProfile={resourceProfile}
          profileRequirementsText={ProfileRequirementsModalText}
          selectedNodes={selectedNodes}
          osdAmount={osdAmount}
        />
        <SelectNodesTable
          nodes={selectedNodes}
          onRowSelected={onRowSelected}
          disableLabeledNodes={true}
          systemNamespace={systemNs}
        />
        {validation && (
          <ValidationMessage
            resourceProfile={resourceProfile}
            osdAmount={osdAmount}
            key={validation}
            validation={validation}
            className="pf-v5-u-mt-md"
          />
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
        {!inProgress ? (
          <Button
            key="save"
            data-test="modal-submit-action"
            data-test-id="confirm-action"
            variant={ButtonVariant.primary}
            onClick={submit}
            isDisabled={!resourceProfile || !!validation}
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

const ConfigureSSPerformanceModal: React.FC<
  ConfigureSSPerformanceModalProps
> = ({ extraProps: { resource: storageSystem }, ...props }) => {
  const [ocs, ocsLoaded, ocsError] = useK8sGet<StorageClusterKind>(
    StorageClusterModel,
    storageSystem.spec.name,
    storageSystem.spec.namespace
  );
  if (!ocsLoaded || ocsError) {
    return null;
  }

  return <ConfigurePerformanceModal storageCluster={ocs} {...props} />;
};

export default ConfigureSSPerformanceModal;

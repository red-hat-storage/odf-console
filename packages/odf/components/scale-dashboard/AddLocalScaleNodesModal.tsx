import * as React from 'react';
import { labelNodesSettled } from '@odf/core/components/create-storage-system/external-systems/common/payload';
import { useKernelDevelEligibility } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility';
import { createWizardNodeState } from '@odf/core/components/utils';
import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  getNodeCPUCapacity,
  getNodeTotalMemory,
  getZone,
  nodesWithoutTaints,
} from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared';
import { NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getName } from '@odf/shared/selectors';
import {
  SelectableTable,
  TableColumnProps,
  TableVariant,
} from '@odf/shared/table';
import {
  getConvertedUnits,
  getNodeRoles,
  humanizeCpuCores,
  resourcePathFromModel,
} from '@odf/shared/utils';
import {
  Button,
  Alert,
  EmptyState,
  EmptyStateVariant,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  HelperText,
  HelperTextItem,
  Spinner,
} from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';

type AddLocalScaleNodesModalProps = {
  closeModal: () => void;
  isOpen: boolean;
  systemName: string;
};

const isExpansionCandidate = (node: NodeData): boolean => {
  const labels = node.metadata?.labels ?? {};
  return (
    Object.prototype.hasOwnProperty.call(
      labels,
      'node-role.kubernetes.io/worker'
    ) &&
    !Object.prototype.hasOwnProperty.call(
      labels,
      'node-role.kubernetes.io/control-plane'
    ) &&
    !Object.prototype.hasOwnProperty.call(
      labels,
      'node-role.kubernetes.io/master'
    ) &&
    !Object.prototype.hasOwnProperty.call(labels, SCALE_DAEMON_NODE_LABEL)
  );
};

const ExpansionNodeRow: React.FC<{ row: NodeData }> = ({ row: node }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Td dataLabel={t('Node')}>
        <ResourceLink
          link={resourcePathFromModel(NodeModel, getName(node))}
          resourceModel={NodeModel}
          resourceName={getName(node)}
        />
      </Td>
      <Td dataLabel={t('Role')}>{getNodeRoles(node).sort().join(', ')}</Td>
      <Td dataLabel={t('CPU')}>
        {humanizeCpuCores(getNodeCPUCapacity(node)).string || '-'}
      </Td>
      <Td dataLabel={t('Memory')}>
        {getConvertedUnits(getNodeTotalMemory(node))}
      </Td>
      <Td dataLabel={t('Zone')}>{getZone(node) || '-'}</Td>
    </>
  );
};

const AddLocalScaleNodesModal: React.FC<AddLocalScaleNodesModalProps> = ({
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const [nodes, nodesLoaded, nodesLoadError] = useNodesData(true);
  const [selectedNodes, setSelectedNodes] = React.useState<NodeData[]>([]);
  const [successfulNames, setSuccessfulNames] = React.useState<string[]>([]);
  const [failedNames, setFailedNames] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const selectedNodeState = React.useMemo(
    () => createWizardNodeState(selectedNodes),
    [selectedNodes]
  );
  const kernelDevelEligibility = useKernelDevelEligibility(selectedNodeState);

  const candidates = React.useMemo(
    () =>
      nodesWithoutTaints(nodes).filter(
        (node) =>
          isExpansionCandidate(node) && !successfulNames.includes(getName(node))
      ),
    [nodes, successfulNames]
  );

  const addNodes = React.useCallback(async () => {
    setIsSubmitting(true);
    setFailedNames([]);
    const result = await labelNodesSettled(selectedNodeState);
    setSuccessfulNames((current) => [
      ...current,
      ...result.successfulNames.filter((name) => !current.includes(name)),
    ]);
    setSelectedNodes((current) =>
      current.filter((node) => result.failedNames.includes(getName(node)))
    );
    setFailedNames(result.failedNames);
    setIsSubmitting(false);
    if (result.failedNames.length === 0) {
      closeModal();
    }
  }, [closeModal, selectedNodeState]);

  const kernelDevelStatus = React.useMemo(() => {
    if (selectedNodes.length === 0) return null;
    if (kernelDevelEligibility.error) {
      return {
        variant: 'error' as const,
        message: `${t('Unable to verify kernel-devel package status')} ${
          kernelDevelEligibility.error
        }`,
      };
    }
    if (kernelDevelEligibility.isLoading) {
      return {
        variant: 'default' as const,
        message: t('Checking kernel-devel packages on selected nodes'),
        icon: <Spinner size="sm" />,
      };
    }
    if (kernelDevelEligibility.nodesWithoutKernelDevel.length > 0) {
      return {
        variant: 'warning' as const,
        message: t(
          'Kernel-devel packages are not installed on all the selected nodes. Apply the MCO before creating the connection to CNSA'
        ),
      };
    }
    return {
      variant: 'success' as const,
      message: t('Kernel-devel packages verified'),
    };
  }, [kernelDevelEligibility, selectedNodes.length, t]);

  const columns = React.useMemo<TableColumnProps[]>(
    () => [
      { columnName: t('Node') },
      { columnName: t('Role') },
      { columnName: t('CPU') },
      { columnName: t('Memory') },
      { columnName: t('Zone') },
    ],
    [t]
  );

  const NoCandidates = React.useCallback(
    () => (
      <EmptyState
        headingLevel="h5"
        titleText={t('No nodes available to add')}
        variant={EmptyStateVariant.sm}
      />
    ),
    [t]
  );

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalHeader title={t('Add nodes to local cluster')} />
      <ModalBody>
        <p>
          {t(
            'Select nodes to add them to the local cluster that handle requests to IBM Scale remote cluster.'
          )}
        </p>
        <SelectableTable<NodeData>
          columns={columns}
          rows={candidates}
          RowComponent={ExpansionNodeRow}
          selectedRows={selectedNodes}
          setSelectedRows={setSelectedNodes}
          loaded={nodesLoaded}
          loadError={nodesLoadError}
          emptyRowMessage={NoCandidates}
          variant={TableVariant.COMPACT}
        />
        {kernelDevelStatus && (
          <HelperText className="pf-v6-u-mt-md">
            <HelperTextItem
              variant={kernelDevelStatus.variant}
              icon={kernelDevelStatus.icon}
            >
              {kernelDevelStatus.message}
            </HelperTextItem>
          </HelperText>
        )}
        {failedNames.length > 0 && (
          <Alert
            isInline
            variant="danger"
            title={t('Unable to add selected nodes')}
            className="pf-v6-u-mt-md"
          >
            {failedNames.join(', ')}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={
            selectedNodes.length === 0 ||
            !kernelDevelEligibility.areSelectedNodesEligible ||
            isSubmitting
          }
          isLoading={isSubmitting}
          onClick={addNodes}
        >
          {t('Add')}
        </Button>
        <Button variant="link" onClick={closeModal}>
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddLocalScaleNodesModal;

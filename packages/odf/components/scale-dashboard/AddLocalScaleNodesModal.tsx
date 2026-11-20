import * as React from 'react';
import { ScaleNodesSection } from '@odf/core/components/create-storage-system/external-systems/common/NodesSection';
import {
  labelNodes,
  patchScaleLocalClusterTolerations,
} from '@odf/core/components/create-storage-system/external-systems/common/payload';
import { useKernelDevelEligibility } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { NodeData } from '@odf/core/types';
import { ClusterKind } from '@odf/core/types/scale';
import { useCustomTranslation } from '@odf/shared';
import {
  Button,
  Alert,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';

type AddLocalScaleNodesModalProps = {
  closeModal: () => void;
  isOpen: boolean;
  cluster: ClusterKind;
};

const AddLocalScaleNodesModal: React.FC<AddLocalScaleNodesModalProps> = ({
  closeModal,
  isOpen,
  cluster,
}) => {
  const { t } = useCustomTranslation();
  const [selectedNodes, setSelectedNodes] = React.useState<WizardNodeState[]>(
    []
  );
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const kernelDevelEligibility = useKernelDevelEligibility(selectedNodes);
  const isNodeFixed = React.useCallback(
    (node: NodeData) =>
      Object.prototype.hasOwnProperty.call(
        node.metadata?.labels ?? {},
        SCALE_DAEMON_NODE_LABEL
      ),
    []
  );

  const addNodes = React.useCallback(async () => {
    setIsSubmitting(true);
    setError('');
    try {
      // Expand the Cluster's tolerations BEFORE labeling the nodes (no-op when
      // the nodes add no new taints). Ordering matters: labeling a node makes the
      // daemon schedule a pod there, so the matching toleration must already be in
      // place. If this order were reversed and the toleration patch failed, the
      // node would be left labeled-but-untolerated (daemon pod stuck Pending) and
      // its row would become a fixed/disabled entry that can never be re-selected
      // to retry. Patching tolerations first keeps a partial failure recoverable:
      // labeling can simply be retried, and any extra tolerations are harmless.
      await patchScaleLocalClusterTolerations(cluster, selectedNodes)();
      await labelNodes(selectedNodes)();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [closeModal, cluster, selectedNodes]);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalHeader
        title={t('Add nodes to local cluster')}
        description={t(
          'Select nodes to add them to the local cluster that handle requests to IBM Storage Scale remote cluster.'
        )}
      />
      <ModalBody>
        <ScaleNodesSection
          selectedNodes={selectedNodes}
          setSelectedNodes={setSelectedNodes}
          kernelDevelEligibility={kernelDevelEligibility}
          isNodeFixed={isNodeFixed}
        />
        {error && (
          <Alert
            isInline
            variant="danger"
            title={t('Unable to add selected nodes')}
            className="pf-v6-u-mt-md"
          >
            {error}
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

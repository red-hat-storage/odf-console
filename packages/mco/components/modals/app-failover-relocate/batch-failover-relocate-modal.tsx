import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import {
  CommonModalProps,
  ModalBody,
  ModalFooter,
} from '@odf/shared/modals/Modal';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { chunk } from 'lodash-es';
import {
  Button,
  ButtonType,
  ButtonVariant,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Gallery,
  Progress,
  ProgressMeasureLocation,
} from '@patternfly/react-core';
import { DRActionType } from '../../../constants';
import { DRPlacementControlKind } from '../../../types';
import { getPrimaryClusterName } from '../../../utils';

const BATCH_SIZE = 6;

export type BatchFailureResult = {
  action: DRActionType;
  failedDRPCs: DRPlacementControlKind[];
  totalCount: number;
};

export type BatchFailoverRelocateExtraProps = {
  selectedDRPCs: DRPlacementControlKind[];
  onComplete: () => void;
  onPartialFailure: (result: BatchFailureResult) => void;
  initialAction?: DRActionType;
};

const buildDRPCPatch = (drpc: DRPlacementControlKind, action: DRActionType) => {
  const primaryCluster = getPrimaryClusterName(drpc);
  const targetCluster =
    [drpc.spec.preferredCluster, drpc.spec.failoverCluster].find(
      (c) => c && c !== primaryCluster
    ) || '';

  return [
    { op: 'replace', path: '/spec/action', value: action },
    {
      op: 'replace',
      path: '/spec/failoverCluster',
      value: action === DRActionType.FAILOVER ? targetCluster : primaryCluster,
    },
    {
      op: 'replace',
      path: '/spec/preferredCluster',
      value: action === DRActionType.FAILOVER ? primaryCluster : targetCluster,
    },
  ];
};

export const BatchFailoverRelocateModal: React.FC<
  CommonModalProps<BatchFailoverRelocateExtraProps>
> = ({ isOpen, closeModal, extraProps }) => {
  const { selectedDRPCs, onComplete, onPartialFailure, initialAction } =
    extraProps;
  const { t } = useCustomTranslation();

  const [selectedAction, setSelectedAction] =
    React.useState<DRActionType | null>(initialAction ?? null);
  const [showProgress, setShowProgress] = React.useState(false);
  const [completedCount, setCompletedCount] = React.useState(0);

  const totalCount = selectedDRPCs.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const onInitiate = async () => {
    if (!selectedAction) return;
    setShowProgress(true);
    setCompletedCount(0);

    const failedDRPCs: DRPlacementControlKind[] = [];
    const batches = chunk(selectedDRPCs, BATCH_SIZE);

    for (const batch of batches) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        batch.map((drpc) =>
          k8sPatch({
            model: DRPlacementControlModel,
            resource: {
              metadata: {
                name: getName(drpc),
                namespace: getNamespace(drpc),
              },
            },
            data: buildDRPCPatch(drpc, selectedAction),
          })
            .catch(() => {
              failedDRPCs.push(drpc);
            })
            .finally(() => {
              setCompletedCount((prev) => prev + 1);
            })
        )
      );
    }

    if (failedDRPCs.length > 0) {
      onPartialFailure({
        action: selectedAction,
        failedDRPCs,
        totalCount,
      });
    }

    onComplete();
    closeModal();
  };

  const actionLabels = {
    [DRActionType.FAILOVER]: {
      label: t('Failing over'),
      request: t('Sending failover requests...'),
    },
    [DRActionType.RELOCATE]: {
      label: t('Relocating'),
      request: t('Sending relocate requests...'),
    },
  };

  const actionCards = [
    {
      type: DRActionType.FAILOVER,
      title: t('Failover'),
      body: t('Move selected workloads to their target clusters.'),
    },
    {
      type: DRActionType.RELOCATE,
      title: t('Relocate'),
      body: t('Fallback workloads to their primary clusters.'),
    },
  ];

  if (showProgress) {
    const { label, request } = actionLabels[selectedAction];
    return (
      <Modal
        title={t('{{action}} {{count}} applications', {
          action: label,
          count: totalCount,
        })}
        isOpen={isOpen}
        showClose={false}
        variant={ModalVariant.medium}
        hasNoBodyWrapper={false}
      >
        <ModalBody>
          <p>{request}</p>
          <Progress
            value={progressPercent}
            measureLocation={ProgressMeasureLocation.none}
            aria-label={t('Batch operation progress')}
          />
        </ModalBody>
      </Modal>
    );
  }

  return (
    <Modal
      title={t('Failover or relocate selected applications')}
      description={t(
        'Select whether to failover or relocate selected applications.'
      )}
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
    >
      <ModalBody>
        <Gallery hasGutter minWidths={{ default: '200px' }}>
          {actionCards.map(({ type, title, body }) => {
            const id = `selectable-action-${type.toLowerCase()}`;
            return (
              <Card
                key={type}
                id={id}
                isSelectable
                isSelected={selectedAction === type}
                onClick={() => setSelectedAction(type)}
              >
                <CardHeader
                  selectableActions={{
                    selectableActionId: id,
                    selectableActionAriaLabelledby: id,
                    name: 'batch-dr-action',
                    variant: 'single',
                    onChange: () => setSelectedAction(type),
                    hasNoOffset: true,
                  }}
                >
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardBody>{body}</CardBody>
              </Card>
            );
          })}
        </Gallery>
      </ModalBody>
      <ModalFooter>
        <Button
          key="modal-initiate-action"
          data-test-id="modal-initiate-action"
          type={ButtonType.button}
          variant={ButtonVariant.primary}
          isDisabled={!selectedAction}
          onClick={onInitiate}
        >
          {t('Initiate')}
        </Button>
        <Button
          key="modal-cancel-action"
          data-test-id="modal-cancel-action"
          type={ButtonType.button}
          variant={ButtonVariant.link}
          onClick={closeModal}
        >
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

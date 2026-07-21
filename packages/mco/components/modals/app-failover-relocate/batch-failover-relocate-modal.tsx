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
import { ModalFooterStatus } from './failover-relocate-modal';

export type BatchFailureResult = {
  action: DRActionType;
  failedDRPCs: DRPlacementControlKind[];
  totalCount: number;
};

type BatchFailoverRelocateExtraProps = {
  selectedDRPCs: DRPlacementControlKind[];
  onComplete: () => void;
  onPartialFailure: (result: BatchFailureResult) => void;
};

enum ModalView {
  ACTION_SELECTION = 'ACTION_SELECTION',
  PROGRESS = 'PROGRESS',
}

const buildDRPCPatch = (drpc: DRPlacementControlKind, action: DRActionType) => {
  const primaryCluster = getPrimaryClusterName(drpc);
  const targetCluster =
    [drpc.spec.preferredCluster, drpc.spec.failoverCluster].find(
      (c) => c && c !== primaryCluster
    ) || '';

  return [
    { op: 'replace' as const, path: '/spec/action', value: action },
    {
      op: 'replace' as const,
      path: '/spec/failoverCluster',
      value: action === DRActionType.FAILOVER ? targetCluster : primaryCluster,
    },
    {
      op: 'replace' as const,
      path: '/spec/preferredCluster',
      value: action === DRActionType.FAILOVER ? primaryCluster : targetCluster,
    },
  ];
};

export const BatchFailoverRelocateModal: React.FC<
  CommonModalProps<BatchFailoverRelocateExtraProps>
> = ({ isOpen, closeModal, extraProps }) => {
  const { selectedDRPCs, onComplete, onPartialFailure } = extraProps;
  const { t } = useCustomTranslation();

  const [selectedAction, setSelectedAction] =
    React.useState<DRActionType | null>(null);
  const [footerStatus, setFooterStatus] = React.useState(
    ModalFooterStatus.INITIAL
  );
  const [modalView, setModalView] = React.useState(ModalView.ACTION_SELECTION);
  const [completedCount, setCompletedCount] = React.useState(0);

  const totalCount = selectedDRPCs.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const onInitiate = async () => {
    setFooterStatus(ModalFooterStatus.INPROGRESS);
    setModalView(ModalView.PROGRESS);
    setCompletedCount(0);

    const failedDRPCs: DRPlacementControlKind[] = [];

    await Promise.all(
      selectedDRPCs.map((drpc) =>
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

  const actionLabel =
    selectedAction === DRActionType.FAILOVER
      ? t('Failing over')
      : t('Relocating');
  const actionRequestLabel =
    selectedAction === DRActionType.FAILOVER
      ? t('Sending failover requests...')
      : t('Sending relocate requests...');

  if (modalView === ModalView.PROGRESS) {
    return (
      <Modal
        title={t('{{action}} {{count}} applications', {
          action: actionLabel,
          count: totalCount,
        })}
        isOpen={isOpen}
        showClose={false}
        variant={ModalVariant.medium}
        hasNoBodyWrapper={false}
      >
        <ModalBody>
          <p>{actionRequestLabel}</p>
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
          <Card
            id="selectable-action-failover"
            isSelectable
            isSelected={selectedAction === DRActionType.FAILOVER}
            onClick={() => setSelectedAction(DRActionType.FAILOVER)}
          >
            <CardHeader
              selectableActions={{
                selectableActionId: 'selectable-action-failover',
                selectableActionAriaLabelledby: 'selectable-action-failover',
                name: 'batch-dr-action',
                variant: 'single',
                onChange: () => setSelectedAction(DRActionType.FAILOVER),
                hasNoOffset: true,
              }}
            >
              <CardTitle>{t('Failover')}</CardTitle>
            </CardHeader>
            <CardBody>
              {t('Move selected workloads to their target clusters.')}
            </CardBody>
          </Card>
          <Card
            id="selectable-action-relocate"
            isSelectable
            isSelected={selectedAction === DRActionType.RELOCATE}
            onClick={() => setSelectedAction(DRActionType.RELOCATE)}
          >
            <CardHeader
              selectableActions={{
                selectableActionId: 'selectable-action-relocate',
                selectableActionAriaLabelledby: 'selectable-action-relocate',
                name: 'batch-dr-action',
                variant: 'single',
                onChange: () => setSelectedAction(DRActionType.RELOCATE),
                hasNoOffset: true,
              }}
            >
              <CardTitle>{t('Relocate')}</CardTitle>
            </CardHeader>
            <CardBody>
              {t('Fallback workloads to their primary clusters.')}
            </CardBody>
          </Card>
        </Gallery>
      </ModalBody>
      <ModalFooter>
        <Button
          key="modal-initiate-action"
          data-test-id="modal-initiate-action"
          type={ButtonType.button}
          variant={ButtonVariant.primary}
          isDisabled={
            !selectedAction || footerStatus === ModalFooterStatus.INPROGRESS
          }
          isLoading={footerStatus === ModalFooterStatus.INPROGRESS}
          onClick={onInitiate}
        >
          {footerStatus === ModalFooterStatus.INITIAL
            ? t('Initiate')
            : t('Initiating')}
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

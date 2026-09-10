import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import {
  CommonModalProps,
  ModalBody,
  ModalFooter,
} from '@odf/shared/modals/Modal';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { chunk } from 'lodash-es';
import {
  Alert,
  AlertVariant,
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
import { DRPCClusterInfo } from '../../../utils/pav';

const BATCH_SIZE = 6;

export type FailedDRPCItem = {
  drpc: DRPlacementControlKind;
  errorMessage: string;
};

export type BatchFailureResult = {
  action: DRActionType;
  failedItems: FailedDRPCItem[];
  totalCount: number;
};

export type BatchFailoverRelocateExtraProps = {
  selectedDRPCs: DRPlacementControlKind[];
  clusterInfoMap: Map<string, DRPCClusterInfo>;
  onComplete: () => void;
  onPartialFailure: (result: BatchFailureResult) => void;
  initialAction?: DRActionType;
};

const isDRActionReady = (
  clusterInfo: DRPCClusterInfo,
  action: DRActionType
): boolean =>
  !!clusterInfo.primaryCluster &&
  !!clusterInfo.targetCluster &&
  clusterInfo.isPeerReady &&
  (action === DRActionType.RELOCATE ? clusterInfo.isAvailable : true);

const buildDRPCPatch = (action: DRActionType, clusterInfo: DRPCClusterInfo) => {
  const { primaryCluster, targetCluster } = clusterInfo;

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
  const {
    selectedDRPCs,
    clusterInfoMap,
    onComplete,
    onPartialFailure,
    initialAction,
  } = extraProps;
  const { t } = useCustomTranslation();

  const [selectedAction, setSelectedAction] =
    React.useState<DRActionType | null>(initialAction ?? null);
  const [showProgress, setShowProgress] = React.useState(false);
  const [completedCount, setCompletedCount] = React.useState(0);

  const totalCount = selectedDRPCs.length;

  const ineligibleCount = React.useMemo(() => {
    if (!selectedAction) return 0;
    return selectedDRPCs.filter((drpc) => {
      const key = `${getNamespace(drpc)}/${getName(drpc)}`;
      const clusterInfo = clusterInfoMap.get(key);
      return !clusterInfo || !isDRActionReady(clusterInfo, selectedAction);
    }).length;
  }, [selectedAction, selectedDRPCs, clusterInfoMap]);

  const eligibleCount = totalCount - ineligibleCount;
  const progressPercent =
    eligibleCount > 0 ? Math.round((completedCount / eligibleCount) * 100) : 0;

  const onInitiate = async () => {
    if (!selectedAction) return;
    setShowProgress(true);
    setCompletedCount(0);

    const failedItems: FailedDRPCItem[] = [];
    const eligible: Array<{
      drpc: DRPlacementControlKind;
      clusterInfo: DRPCClusterInfo;
    }> = [];

    selectedDRPCs.forEach((drpc) => {
      const key = `${getNamespace(drpc)}/${getName(drpc)}`;
      const clusterInfo = clusterInfoMap.get(key);
      if (!clusterInfo || !isDRActionReady(clusterInfo, selectedAction)) {
        failedItems.push({
          drpc,
          errorMessage: !clusterInfo
            ? t('Missing cluster information')
            : selectedAction === DRActionType.RELOCATE
              ? t('Peer is not ready or application is not available')
              : t('Peer is not ready'),
        });
      } else {
        eligible.push({ drpc, clusterInfo });
      }
    });

    const batches = chunk(eligible, BATCH_SIZE);

    for (const batch of batches) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        batch.map(({ drpc, clusterInfo }) =>
          k8sPatch({
            model: DRPlacementControlModel,
            resource: {
              metadata: {
                name: getName(drpc),
                namespace: getNamespace(drpc),
              },
            },
            data: buildDRPCPatch(selectedAction, clusterInfo),
          })
            .catch((error) => {
              failedItems.push({
                drpc,
                errorMessage: getErrorMessage(error) || t('Unknown error'),
              });
            })
            .finally(() => {
              setCompletedCount((prev) => prev + 1);
            })
        )
      );
    }

    if (failedItems.length > 0) {
      onPartialFailure({
        action: selectedAction,
        failedItems,
        totalCount,
      });
    }

    if (failedItems.length < totalCount) {
      onComplete();
    }
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

  if (showProgress && selectedAction) {
    const { label, request } = actionLabels[selectedAction];
    return (
      <Modal
        title={t('{{action}} {{count}} applications', {
          action: label,
          count: eligibleCount,
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
        {selectedAction && ineligibleCount > 0 && (
          <Alert
            variant={AlertVariant.warning}
            title={t(
              '{{count}} of {{total}} selected applications are not ready for {{action}}.',
              {
                count: ineligibleCount,
                total: totalCount,
                action:
                  selectedAction === DRActionType.FAILOVER
                    ? t('failover')
                    : t('relocate'),
              }
            )}
            isInline
            className="pf-v6-u-mb-md"
          >
            {t('These applications will be skipped and reported as failures.')}
          </Alert>
        )}
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

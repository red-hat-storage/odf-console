import * as React from 'react';
import { DRPolicyKind } from '@odf/mco/types';
import { getReplicationHealth, getReplicationType } from '@odf/mco/utils';
import { useK8sList } from '@odf/shared';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Modal,
  Button,
  ModalVariant,
  ButtonProps,
  ButtonType,
  ButtonVariant,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { DRActionType, VOLUME_REPLICATION_HEALTH } from '../../../../constants';
import { DRPlacementControlModel, DRPolicyModel } from '../../../../models';
import {
  FailoverRelocateModalBody,
  findErrorMessage,
} from './failover-relocate-modal-body';
import {
  failoverAndRelocateReducer,
  failoverAndRelocateState,
  ModalFooterStatus,
  FailoverAndRelocateType,
} from './reducer';
import './failover-relocate-modal-body.scss';

const generatefooterButtons = (props: ModalFooterProps): FooterButtonProps => ({
  [ModalFooterStatus.INITIAL]: [
    {
      id: 'modal-cancel-action',
      label: props.t('Cancel'),
      type: ButtonType.button,
      variant: ButtonVariant.link,
      onClick: props.close,
    },
    {
      id: 'modal-intiate-action',
      label: props.t('Initiate'),
      type: ButtonType.button,
      variant: ButtonVariant.primary,
      isDisabled: props?.isDisable,
      onClick: props?.Onclick,
    },
  ],
  [ModalFooterStatus.INPROGRESS]: [
    {
      id: 'modal-cancel-action',
      label: props.t('Cancel'),
      type: ButtonType.button,
      variant: ButtonVariant.link,
      onClick: props.close,
    },
    {
      id: 'modal-intiating-action',
      label: props.t('Intiating'),
      type: ButtonType.button,
      variant: ButtonVariant.primary,
      isLoading: true,
      isDisabled: true,
    },
  ],
  [ModalFooterStatus.FINISHED]: [
    {
      id: 'modal-close-action',
      label: props.t('Close'),
      type: ButtonType.button,
      variant: ButtonVariant.secondary,
      onClick: props.close,
    },
  ],
});

const getModalText = (t: TFunction) => ({
  [DRActionType.FAILOVER]: {
    title: t('Failover application'),
    description: t(
      'Failing over force stops active replication and deploys your application on the selected target cluster. Recommended only when the primary cluster is down.'
    ),
  },
  [DRActionType.RELOCATE]: {
    title: t('Relocate application'),
    description: t(
      'Relocating terminates your application on its current cluster, syncs its most recent snapshot to the selected target cluster, and then brings up your application.'
    ),
  },
});

export const SubscriptionFailoverRelocateModal: React.FC<FailoverRelocateModalProps> =
  (props) => {
    const { t } = useCustomTranslation();
    const { action, isOpen, resource, close } = props;
    const modalText = getModalText(t)[action];

    const [state, dispatch] = React.useReducer(
      failoverAndRelocateReducer,
      failoverAndRelocateState(action)
    );

    const [drPolicies, loaded] = useK8sList<DRPolicyKind>(DRPolicyModel);

    const checkSyncDelayed = (drPolicyControlStates) => {
      if (!loaded || !drPolicies?.length) return false;

      return drPolicyControlStates.some((stateItem) => {
        const drPlacementControl = stateItem?.drPlacementControl;
        const selectedDrPolicyName =
          drPlacementControl?.spec?.drPolicyRef?.name;

        const drPolicy = drPolicies.find(
          (policy) => getName(policy) === selectedDrPolicyName
        );
        const volumesSchedulingInterval = drPolicy?.spec?.schedulingInterval;

        if (!volumesSchedulingInterval) return true; // Show warning alert for unknown state also

        const replicationType = getReplicationType(volumesSchedulingInterval);
        if (!replicationType) return false;

        return (
          getReplicationHealth(
            drPlacementControl?.status?.lastGroupSyncTime,
            volumesSchedulingInterval,
            replicationType
          ) === VOLUME_REPLICATION_HEALTH.CRITICAL
        );
      });
    };

    const isSyncDelayed = checkSyncDelayed(state.drPolicyControlState);

    const updateModalStatus = (modalFooterStatus: ModalFooterStatus) =>
      dispatch({
        type: FailoverAndRelocateType.SET_MODAL_FOOTER_STATUS,
        payload: modalFooterStatus,
      });

    const canInitiate = () =>
      !findErrorMessage(state.errorMessage) &&
      !!state.selectedSubsGroups.length;

    const onClick = () => {
      updateModalStatus(ModalFooterStatus.INPROGRESS);
      const promises: Promise<K8sResourceKind>[] = [];
      const targetClusterName =
        state.selectedTargetCluster.clusterInfo.clusterName;
      const primaryClusterName = state.selectedDRPolicy.drClusters.find(
        (drCluster) => drCluster !== targetClusterName
      );
      state.drPolicyControlState.forEach((acmToDRState) => {
        if (
          state.selectedSubsGroups.includes(
            getName(acmToDRState?.drPlacementControl)
          )
        ) {
          const patch = [
            {
              op: 'replace',
              path: '/spec/action',
              value: action,
            },
            {
              op: 'replace',
              path: '/spec/failoverCluster',
              value:
                action === DRActionType.FAILOVER
                  ? targetClusterName
                  : primaryClusterName,
            },
            {
              op: 'replace',
              path: '/spec/preferredCluster',
              value:
                action === DRActionType.FAILOVER
                  ? primaryClusterName
                  : targetClusterName,
            },
          ];
          promises.push(
            k8sPatch({
              model: DRPlacementControlModel,
              resource: acmToDRState?.drPlacementControl,
              data: patch,
            })
          );
        }
      });
      Promise.all(promises)
        .then(() => {
          updateModalStatus(ModalFooterStatus.FINISHED);
        })
        .catch((error) => {
          updateModalStatus(ModalFooterStatus.INITIAL);
          dispatch({
            type: FailoverAndRelocateType.SET_ACTION_ERROR_MESSAGE,
            payload: {
              title: getErrorMessage(error),
              variant: AlertVariant.danger,
            },
          });
        });
    };

    return (
      <Modal
        title={modalText?.title}
        description={modalText?.description}
        isOpen={isOpen}
        onClose={close}
        variant={ModalVariant.medium}
      >
        <ModalBody>
          {isSyncDelayed && (
            <Alert
              variant={AlertVariant.warning}
              title={t('Inconsistent data on target cluster')}
              isInline
            >
              {t(
                "The target cluster's volumes contain data inconsistencies caused by synchronization delays. Performing the failover could lead to data loss. Refer to the corresponding VolumeSynchronizationDelay OpenShift alert(s) for more information."
              )}
            </Alert>
          )}

          <FailoverRelocateModalBody
            application={resource}
            action={action}
            state={state}
            dispatch={dispatch}
          />
        </ModalBody>
        <ModalFooter>
          {generatefooterButtons({
            t,
            close,
            isDisable: !canInitiate(),
            Onclick: onClick,
          })[state.modalFooterStatus].map((buttonProp) => (
            <Button
              key={buttonProp.id}
              data-test={buttonProp.id}
              type={buttonProp.type}
              variant={buttonProp.variant}
              isDisabled={buttonProp.isDisabled}
              id={buttonProp.id}
              data-test-id={buttonProp.id}
              onClick={buttonProp.onClick}
              isLoading={buttonProp.isLoading}
            >
              {buttonProp.label}
            </Button>
          ))}
        </ModalFooter>
      </Modal>
    );
  };

type ModalFooterProps = {
  isDisable?: boolean;
  t: TFunction;
  Onclick?: () => void;
  close?: () => void;
};

type FooterButtonProps = {
  [status in ModalFooterStatus]?: ButtonProps[];
};

type FailoverRelocateModalProps = {
  action: DRActionType;
  isOpen: boolean;
  resource?: ApplicationKind;
  close?: () => void;
};

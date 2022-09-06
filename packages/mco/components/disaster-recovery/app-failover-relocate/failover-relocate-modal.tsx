import * as React from 'react';
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
} from '@patternfly/react-core';
import { DRPlacementControlModel } from '../../../models';
import {
  FailoverRelocateModalBody,
  findErrorMessage,
} from './failover-relocate-modal-body';
import {
  failoverAndRelocateReducer,
  failoverAndRelocateState,
  ModalFooterStatus,
  FailoverAndRelocateType,
  ACTION_TYPE,
} from './reducer';

const generatefooterButtons = (props: ModalFooterProps): FooterButtonProps => ({
  [ModalFooterStatus.INITIAL]: [
    {
      id: 'modal-intiate-action',
      label: props.t('Initiate'),
      type: ButtonType.button,
      variant: ButtonVariant.primary,
      isDisabled: props?.isDisable,
      onClick: props?.Onclick,
    },
    {
      id: 'modal-cancel-action',
      label: props.t('Cancel'),
      type: ButtonType.button,
      variant: ButtonVariant.link,
      onClick: props.close,
    },
  ],
  [ModalFooterStatus.INPROGRESS]: [
    {
      id: 'modal-intiating-action',
      label: props.t('Intiating'),
      type: ButtonType.button,
      variant: ButtonVariant.primary,
      isLoading: true,
      isDisabled: true,
      onClick: () => {},
    },
    {
      id: 'modal-cancel-action',
      label: props.t('Cancel'),
      type: ButtonType.button,
      variant: ButtonVariant.link,
      onClick: props.close,
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

const FailoverRelocateModal: React.FC<FailoverRelocateModalProps> = (props) => {
  const { t } = useCustomTranslation();
  const { title, description, action, isOpen, resource, close } = props;

  const [state, dispatch] = React.useReducer(
    failoverAndRelocateReducer,
    failoverAndRelocateState(action)
  );

  const updateModalStatus = (modalFooterStatus: ModalFooterStatus) =>
    dispatch({
      type: FailoverAndRelocateType.SET_MODAL_FOOTER_STATUS,
      payload: modalFooterStatus,
    });

  const canInitiate = () =>
    !findErrorMessage(state.errorMessage, false) &&
    !!state.selectedSubsGroups.length;

  const onClick = () => {
    updateModalStatus(ModalFooterStatus.INPROGRESS);
    const promises: Promise<K8sResourceKind>[] = [];
    state.drPolicyControlState.forEach((acmToDRState) => {
      if (
        state.selectedSubsGroups.includes(
          getName(acmToDRState?.drPolicyControl)
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
            path:
              state.actionType === ACTION_TYPE.FAILOVER
                ? '/spec/failoverCluster'
                : '/spec/preferredCluster',
            value: state.selectedTargetCluster.clusterName,
          },
        ];
        promises.push(
          k8sPatch({
            model: DRPlacementControlModel,
            resource: acmToDRState?.drPolicyControl,
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
          type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
          payload: {
            failoverAndRelocateActionErrorMessage: getErrorMessage(error),
          },
        });
      });
  };

  return (
    <Modal
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={close}
      variant={ModalVariant.medium}
      hasNoBodyWrapper
      actions={generatefooterButtons({
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
    >
      <FailoverRelocateModalBody
        application={resource}
        action={action}
        state={state}
        dispatch={dispatch}
      />
    </Modal>
  );
};

// Invoked from ACM using plugin extension
export const FailoverModal: React.FC<ModalProps> = (props) => {
  const { t } = useCustomTranslation();

  return (
    <FailoverRelocateModal
      {...props}
      title={t('Failover application')}
      description={t(
        'All system workloads and their available resources will be transferred to the recovery (failover) cluster.'
      )}
      action={ACTION_TYPE.FAILOVER}
    />
  );
};

// Invoked from ACM using plugin extension
export const RelocateModal: React.FC<ModalProps> = (props) => {
  const { t } = useCustomTranslation();

  return (
    <FailoverRelocateModal
      {...props}
      title={t('Relocate application')}
      description={t(
        'All changes in system workloads and their available resources will be transferred back to the origin (primary) cluster.'
      )}
      action={ACTION_TYPE.RELOCATE}
    />
  );
};

// ACM application action props
type ModalProps = {
  isOpen: boolean;
  resource?: ApplicationKind;
  close?: () => void;
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
  title: string;
  description: React.ReactNode;
  action: ACTION_TYPE;
} & ModalProps;

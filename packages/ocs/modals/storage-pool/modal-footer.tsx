import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  ActionGroup,
  Button,
  ButtonType,
  ButtonVariant,
} from '@patternfly/react-core';
import { PoolProgress } from '../../constants';
import { checkRequiredValues } from '../../storage-pool/footer';
import {
  StoragePoolAction,
  StoragePoolActionType,
  StoragePoolState,
} from '../../storage-pool/reducer';

export const StoragePoolModalFooter = (props: StoragePoolModalFooterProps) => {
  const { state, dispatch, onSubmit, primaryAction, cancel, close } = props;
  const { t } = useCustomTranslation();

  const handleFinishButton = (e: React.FormEvent<EventTarget>) => {
    e.preventDefault();
    close();
  };

  const navigate = useNavigate();

  const footerButtonsFactory: FooterButtonFactory = {
    [PoolProgress.FAILED]: [
      {
        id: 'modal-try-again-action',
        label: t('Try Again'),
        type: ButtonType.button,
        variant: ButtonVariant.secondary,
        onClick: () => {
          dispatch({
            type: StoragePoolActionType.SET_POOL_STATUS,
            payload: '',
          });
        },
      },
      {
        id: 'modal-finish-action',
        label: t('Finish'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
      },
    ],
    [PoolProgress.NOTALLOWED]: [
      {
        id: 'modal-close-action',
        label: t('Close'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
      },
    ],
    [PoolProgress.BOUNDED]: [
      {
        id: 'modal-close-action',
        label: t('Close'),
        type: ButtonType.button,
        variant: ButtonVariant.secondary,
        onClick: handleFinishButton,
      },
      {
        id: 'modal-go-to-pvc-list-action',
        label: t('Go To PVC List'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: () => {
          navigate('/k8s/all-namespaces/persistentvolumeclaims');
          close();
        },
      },
    ],
    [PoolProgress.CREATED]: [
      {
        id: 'modal-finish-action',
        label: t('Finish'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
        disable: state.poolStatus === PoolProgress.PROGRESS,
      },
    ],
    [PoolProgress.CLUSTERNOTREADY]: [
      {
        id: 'modal-finish-action',
        label: t('Finish'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
        disable: state.poolStatus === PoolProgress.PROGRESS,
      },
    ],
    [PoolProgress.PROGRESS]: [
      {
        id: 'modal-finish-action',
        label: t('Finish'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
        disable: state.poolStatus === PoolProgress.PROGRESS,
      },
    ],
    [PoolProgress.TIMEOUT]: [
      {
        id: 'modal-finish-action',
        label: t('Finish'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
        disable: state.poolStatus === PoolProgress.PROGRESS,
      },
    ],
    [PoolProgress.NOTREADY]: [
      {
        id: 'modal-finish-action',
        label: t('Finish'),
        type: ButtonType.submit,
        variant: ButtonVariant.primary,
        onClick: handleFinishButton,
      },
    ],
    default: [
      {
        id: 'modal-cancel-action',
        label: t('Cancel'),
        type: ButtonType.button,
        variant: ButtonVariant.secondary,
        onClick: cancel,
      },
      {
        id: 'confirm-action',
        label: primaryAction,
        type: ButtonType.submit,
        variant:
          primaryAction === FooterPrimaryActions(t).DELETE
            ? ButtonVariant.danger
            : ButtonVariant.primary,
        onClick: onSubmit,
        disable:
          primaryAction !== FooterPrimaryActions(t).DELETE &&
          checkRequiredValues(state.poolName, state.replicaSize),
      },
    ],
  };

  return (
    <ActionGroup className="pf-v6-c-form pf-v6-c-form__actions--right pf-v6-c-form__group--no-top-margin">
      {footerButtonsFactory[state.poolStatus || 'default'].map((buttonProp) => {
        return (
          <Button
            key={buttonProp.id}
            type={buttonProp.type}
            variant={buttonProp.variant}
            isDisabled={buttonProp.disable}
            id={buttonProp.id}
            data-test-id={buttonProp.id}
            onClick={buttonProp.onClick}
          >
            {buttonProp.label}
          </Button>
        );
      })}
    </ActionGroup>
  );
};

type StoragePoolModalFooterProps = {
  state: StoragePoolState;
  dispatch: React.Dispatch<StoragePoolAction>;
  primaryAction: string;
  onSubmit: () => void;
  cancel: () => void;
  close: () => void;
};

type ButtonProps = {
  id: string;
  label: string;
  type: ButtonType;
  variant: ButtonVariant;
  onClick: (e?: React.FormEvent<EventTarget>) => void;
  disable?: boolean;
};

type FooterButtonFactory = {
  [status in PoolProgress | 'default']?: ButtonProps[];
};

export const FooterPrimaryActions = (t: TFunction) => ({
  CREATE: t('Create'),
  DELETE: t('Delete'),
  UPDATE: t('Save'),
});

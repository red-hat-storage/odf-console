import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { ModalActionContext, PolicyListViewState } from '../utils/reducer';
import '../../../../style.scss';

const hasActionFailedOrSuceeded = (modalActionContext: ModalActionContext) =>
  [
    ModalActionContext.UN_ASSIGN_POLICIES_SUCCEEDED,
    ModalActionContext.UN_ASSIGN_POLICIES_FAILED,
  ].includes(modalActionContext);

const AlertMessage: React.FC<AlertMessageType> = ({
  title,
  variant,
  children,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Alert
      area-label={t('Manage list view alert')}
      title={title}
      variant={variant}
      isInline
      className="odf-alert"
    >
      {children}
    </Alert>
  );
};

export const ListViewMessages: React.FC<ListViewMessagesProps> = ({
  state,
  OnCancel,
  OnConfirm,
}) => {
  const { t } = useCustomTranslation();
  const { message, modalActionContext } = state;
  return (
    <>
      {(modalActionContext === ModalActionContext.UN_ASSIGNING_POLICIES && (
        <AlertMessage
          title={message.title}
          variant={message?.variant || AlertVariant.warning}
        >
          <Button variant={ButtonVariant.link} onClick={OnConfirm}>
            {t('Confirm unassign')}
          </Button>
          <Button variant={ButtonVariant.link} onClick={OnCancel}>
            {t('Cancel')}
          </Button>
        </AlertMessage>
      )) ||
        (hasActionFailedOrSuceeded(modalActionContext) && (
          <AlertMessage
            title={message.title}
            variant={message?.variant || AlertVariant.info}
          >
            {message?.description}
          </AlertMessage>
        ))}
    </>
  );
};

export type ListViewMessagesProps = {
  state: PolicyListViewState;
  OnCancel: () => void;
  OnConfirm: () => void;
};

type AlertMessageType = {
  title: string;
  variant: AlertVariant;
  children?: React.ReactNode;
};

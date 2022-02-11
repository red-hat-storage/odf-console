import * as React from 'react';
import i18next from 'i18next';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ActionGroup, Button } from '@patternfly/react-core';
import { ButtonBar } from './ButtonBar';
import CloseButton from './CloseButton';

export const ModalTitle: React.FC<ModalTitleProps> = ({
  children,
  className = 'modal-header',
  close,
}) => (
  <div className={className}>
    <h1 className="pf-c-title pf-m-2xl" data-test-id="modal-title">
      {children}
      {close && (
        <CloseButton
          onClick={(e) => {
            e.stopPropagation();
            close(e);
          }}
          additionalClassName="co-close-button--float-right"
        />
      )}
    </h1>
  </div>
);

export const ModalBody: React.SFC<ModalBodyProps> = ({ children }) => (
  <div className="modal-body">
    <div className="modal-body-content">
      <div className="modal-body-inner-shadow-covers">{children}</div>
    </div>
  </div>
);

export const ModalFooter: React.SFC<ModalFooterProps> = ({
  message,
  errorMessage,
  inProgress,
  children,
}) => {
  return (
    <ButtonBar
      className="modal-footer"
      errorMessage={errorMessage}
      infoMessage={message}
      inProgress={inProgress}
    >
      {children as React.ReactChild}
    </ButtonBar>
  );
};

export const ModalSubmitFooter: React.SFC<ModalSubmitFooterProps> = ({
  message,
  errorMessage,
  inProgress,
  cancel,
  submitText,
  cancelText,
  submitDisabled,
  submitDanger,
  resetText = i18next.t('plugin__odf-console~Reset'),
  reset,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const onCancelClick = (e) => {
    e.stopPropagation();
    cancel(e);
  };

  const onResetClick = (e) => {
    e.stopPropagation();
    reset(e);
  };

  return (
    <ModalFooter
      inProgress={inProgress}
      errorMessage={errorMessage}
      message={message}
    >
      <ActionGroup className="pf-c-form pf-c-form__actions--right pf-c-form__group--no-top-margin">
        {reset && (
          <Button
            variant="link"
            isInline
            onClick={onResetClick}
            id="reset-action"
          >
            {resetText}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          data-test-id="modal-cancel-action"
          onClick={onCancelClick}
          aria-label={t('Cancel')}
        >
          {cancelText || t('Cancel')}
        </Button>
        {submitDanger ? (
          <Button
            type="submit"
            variant="danger"
            isDisabled={submitDisabled}
            data-test="confirm-action"
            id="confirm-action"
          >
            {submitText}
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            isDisabled={submitDisabled}
            data-test="confirm-action"
            id="confirm-action"
          >
            {submitText}
          </Button>
        )}
      </ActionGroup>
    </ModalFooter>
  );
};

export type ModalTitleProps = {
  className?: string;
  close?: (e: React.SyntheticEvent<any, Event>) => void;
};

export type ModalBodyProps = {
  className?: string;
};

export type ModalFooterProps = {
  message?: string;
  errorMessage?: React.ReactNode;
  inProgress: boolean;
};

export type ModalSubmitFooterProps = {
  message?: string;
  errorMessage?: string;
  inProgress: boolean;
  cancel: (e: React.SyntheticEvent<any, Event>) => void;
  cancelText?: React.ReactNode;
  resetText?: React.ReactNode;
  reset?: (e: React.SyntheticEvent<any, Event>) => void;
  submitText: React.ReactNode;
  submitDisabled?: boolean;
  submitDanger?: boolean;
};

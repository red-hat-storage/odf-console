import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ActionGroup, Button } from '@patternfly/react-core';
import { StoragePoolState } from './reducer';
import './create-storage-pool.scss';

export const checkRequiredValues = (state: StoragePoolState): boolean => {
  if (!state.poolName) return true;
  if (state.dataProtectionPolicy === 'erasure-coding') {
    return !state.erasureCodingSchema;
  }
  return !state.replicaSize;
};

export const StoragePoolFooter = (props: StoragePoolFooterProps) => {
  const { state, cancel, onConfirm } = props;
  const { t } = useCustomTranslation();

  return (
    <ButtonBar errorMessage={state.errorMessage} inProgress={state.inProgress}>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__actions--left">
        <Button
          type="button"
          variant="primary"
          data-test-id="confirm-action"
          onClick={onConfirm}
          isDisabled={checkRequiredValues(state)}
        >
          {t('Create')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-test-id="cancel-action"
          onClick={cancel}
        >
          {t('Cancel')}
        </Button>
      </ActionGroup>
    </ButtonBar>
  );
};

type StoragePoolFooterProps = {
  state: StoragePoolState;
  cancel: () => void;
  onConfirm: () => void;
};

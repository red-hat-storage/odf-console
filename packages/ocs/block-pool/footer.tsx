import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ActionGroup, Button } from '@patternfly/react-core';
import { BlockPoolState } from './reducer';
import './create-block-pool.scss';

export const checkRequiredValues = (
  poolName: string,
  replicaSize: string
): boolean => !poolName || !replicaSize;

export const BlockPoolFooter = (props: BlockPoolFooterProps) => {
  const { state, cancel, onConfirm } = props;
  const { t } = useCustomTranslation();

  return (
    <ButtonBar errorMessage={state.errorMessage} inProgress={state.inProgress}>
      <ActionGroup className="pf-c-form pf-c-form__actions--left">
        <Button
          type="button"
          variant="primary"
          data-test-id="confirm-action"
          onClick={onConfirm}
          isDisabled={checkRequiredValues(state.poolName, state.replicaSize)}
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

type BlockPoolFooterProps = {
  state: BlockPoolState;
  cancel: () => void;
  onConfirm: () => void;
};

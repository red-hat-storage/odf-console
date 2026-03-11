import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ActionGroup,
  Button,
  ButtonType,
  ButtonVariant,
} from '@patternfly/react-core';
import { AttachStorageFormState } from './state';
import { checkRequiredValues } from './utils';

export const AttachStorageFormFooter = (
  props: AttachStorageFormFooterProps
) => {
  const { state, cancel, onConfirm } = props;
  const { t } = useCustomTranslation();
  const {
    poolName,
    replicaSize,
    lsoStorageClassName,
    inProgress,
    errorMessage,
    storageClassDetails,
    deviceClass,
  } = state;
  const { name, enableStorageClassEncryption, encryptionKMSID } =
    storageClassDetails;
  const isDisabled =
    checkRequiredValues(
      poolName,
      replicaSize,
      lsoStorageClassName,
      name,
      enableStorageClassEncryption,
      encryptionKMSID,
      deviceClass
    ) ||
    inProgress ||
    !!errorMessage;

  return (
    <ButtonBar errorMessage={state.errorMessage} inProgress={state.inProgress}>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__actions--left pf-v6-u-pb-xl">
        <Button
          type={ButtonType.button}
          variant={ButtonVariant.primary}
          data-test-id="confirm-action"
          onClick={onConfirm}
          isDisabled={isDisabled}
        >
          {t('Attach')}
        </Button>
        <Button
          type={ButtonType.button}
          variant={ButtonVariant.secondary}
          data-test-id="cancel-action"
          onClick={cancel}
        >
          {t('Cancel')}
        </Button>
      </ActionGroup>
    </ButtonBar>
  );
};

type AttachStorageFormFooterProps = {
  state: AttachStorageFormState;
  cancel: () => void;
  onConfirm: () => void;
};

import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ActionGroup,
  Button,
  ButtonType,
  ButtonVariant,
} from '@patternfly/react-core';
import { ConfigurePerformanceProfileFormState } from './state';
import { checkRequiredValues } from './utils';

export const ConfigurePerformanceProfileFormFooter = (
  props: ConfigurePerformanceProfileFormFooterProps
) => {
  const { state, cancel, onConfirm, showCoreStorage, showMcgPerformance } =
    props;
  const { t } = useCustomTranslation();
  const { inProgress, errorMessage } = state;
  const isDisabled =
    checkRequiredValues(state, showCoreStorage, showMcgPerformance) ||
    inProgress ||
    !!errorMessage;

  return (
    <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__actions--left pf-v6-u-pb-xl">
        <Button
          type={ButtonType.button}
          variant={ButtonVariant.primary}
          data-test-id="confirm-action"
          onClick={onConfirm}
          isDisabled={isDisabled}
        >
          {t('Save')}
        </Button>
        <Button
          type={ButtonType.button}
          variant={ButtonVariant.tertiary}
          data-test-id="cancel-action"
          onClick={cancel}
        >
          {t('Cancel')}
        </Button>
      </ActionGroup>
    </ButtonBar>
  );
};

type ConfigurePerformanceProfileFormFooterProps = {
  state: ConfigurePerformanceProfileFormState;
  showCoreStorage: boolean;
  showMcgPerformance: boolean;
  cancel: () => void;
  onConfirm: () => void;
};

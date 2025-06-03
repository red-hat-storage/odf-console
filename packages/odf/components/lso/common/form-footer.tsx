import * as React from 'react';
import { ButtonBar, useCustomTranslation } from '@odf/shared';
import { useNavigate } from 'react-router-dom-v5-compat';
import { ActionGroup, Button } from '@patternfly/react-core';

export const FormFooter: React.FC<FormFooterProps> = ({
  errorMessage,
  inProgress,
  disableNext,
  cancelUrl,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  return (
    <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
      <ActionGroup>
        <Button type="submit" variant="primary" isDisabled={disableNext}>
          {t('Create')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(cancelUrl)}
        >
          {t('Cancel')}
        </Button>
      </ActionGroup>
    </ButtonBar>
  );
};

type FormFooterProps = {
  errorMessage: any;
  inProgress: boolean;
  disableNext: boolean;
  cancelUrl: string;
};

import * as React from 'react';
import { GreenCheckCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Bullseye,
  Button,
  ButtonVariant,
  Content,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import '../create-dr-policy.scss';

export type PairingSuccessProps = {
  onViewPolicy: () => void;
  onClose: () => void;
};

export const PairingSuccess: React.FC<PairingSuccessProps> = ({
  onViewPolicy,
  onClose,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="mco-create-data-policy__pairing pf-v6-u-p-xl">
      <Stack hasGutter className="pf-v6-u-text-align-center">
        <StackItem>
          <GreenCheckCircleIcon className="mco-create-data-policy__pairing-status-icon" />
        </StackItem>
        <StackItem>
          <Title headingLevel="h2" size="lg">
            {t('Clusters paired successfully')}
          </Title>
        </StackItem>
        <StackItem>
          <Content>
            {t(
              'Disaster recovery cluster pairing is complete. You can view the DRPolicy or close this page.'
            )}
          </Content>
        </StackItem>
        <StackItem>
          <Button variant={ButtonVariant.primary} onClick={onViewPolicy}>
            {t('View policy')}
          </Button>
        </StackItem>
        <StackItem>
          <Button variant={ButtonVariant.link} onClick={onClose}>
            {t('Close')}
          </Button>
        </StackItem>
      </Stack>
    </Bullseye>
  );
};

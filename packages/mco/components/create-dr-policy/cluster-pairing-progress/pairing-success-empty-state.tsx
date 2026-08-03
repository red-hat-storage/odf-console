import * as React from 'react';
import { GreenCheckCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import '../create-dr-policy.scss';

export type PairingSuccessProps = {
  onViewPolicy: () => void;
  onClose: () => void;
};

export const PairingSuccessEmptyState: React.FC<PairingSuccessProps> = ({
  onViewPolicy,
  onClose,
}) => {
  const { t } = useCustomTranslation();
  return (
    <div className="mco-create-data-policy__pairing">
      <EmptyState
        headingLevel="h2"
        icon={GreenCheckCircleIcon}
        titleText={t('Clusters paired successfully')}
        variant={EmptyStateVariant.lg}
        className="mco-create-data-policy__pairing-empty-state"
      >
        <EmptyStateBody>
          {t(
            'Disaster recovery cluster pairing is complete. You can view the DRPolicy or close this page.'
          )}
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant={ButtonVariant.primary} onClick={onViewPolicy}>
              {t('View policy')}
            </Button>
          </EmptyStateActions>
          <EmptyStateActions>
            <Button variant={ButtonVariant.link} onClick={onClose}>
              {t('Close')}
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </div>
  );
};

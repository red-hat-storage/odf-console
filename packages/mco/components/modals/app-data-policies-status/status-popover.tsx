import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Popover } from '@patternfly/react-core';
import { DRStatus, DRStatusProps } from './dr-status';

export const StatusPopover: React.FC<StatusPopoverProps> = ({
  disasterRecoveryStatus,
}) => {
  const { t } = useCustomTranslation();
  const drPolicies = new Set(
    disasterRecoveryStatus?.map((drStatus) => drStatus?.policyName)
  );
  const count = drPolicies?.size || 0;
  const headerText = pluralize(
    count,
    t('Data policy ({{count}})', { count }),
    t('Data policies ({{count}})', { count }),
    false
  );
  const linkText = pluralize(count, t('policy'), t('policies'), true);
  return (
    <Popover
      aria-label={t('Data policies popover')}
      position="bottom"
      headerContent={headerText}
      hasAutoWidth
      bodyContent={<DRStatus {...disasterRecoveryStatus} />}
    >
      {!!count && <a data-test="popover-link">{linkText}</a>}
    </Popover>
  );
};

type StatusPopoverProps = {
  disasterRecoveryStatus: DRStatusProps[];
};

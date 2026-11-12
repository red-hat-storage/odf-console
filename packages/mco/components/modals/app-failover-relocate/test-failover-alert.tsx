import * as React from 'react';
import {
  SYNC_SCHEDULE_DISPLAY_TEXT,
  THRESHOLD,
  VM_RECIPE_NAME,
} from '@odf/mco/constants';
import { DRPlacementControlKind, VRGConditionReason } from '@odf/mco/types';
import { isDiscoveredDRPC, parseSyncInterval } from '@odf/mco/utils';
import { TFunction } from 'i18next';
import { AlertProps, AlertVariant } from '@patternfly/react-core';

export const requiresManualCleanup = (
  drpc: DRPlacementControlKind
): boolean => {
  if (drpc?.spec?.kubeObjectProtection?.recipeRef?.name !== VM_RECIPE_NAME) {
    return true;
  }
  return (
    drpc.status?.resourceConditions?.conditions?.find(
      (condition) => condition.type === 'AutoCleanup'
    )?.reason === VRGConditionReason.NotFeasible
  );
};

export const showManualTestCleanup = (drpc?: DRPlacementControlKind): boolean =>
  !!drpc && isDiscoveredDRPC(drpc) && requiresManualCleanup(drpc);

export const getTestFailoverModalText = (t: TFunction) => ({
  title: t('Test Disaster Recovery (DR)'),
  description: t('Test failover simulates failover to the DR cluster'),
});

export const getTestFailoverAlertMessage = (
  t: TFunction,
  showManualCleanup: boolean,
  schedulingInterval: string
): AlertProps => {
  const [unit, interval] = parseSyncInterval(schedulingInterval);
  return {
    title: t('Attention'),
    variant: AlertVariant.info,
    isInline: true,
    children: (
      <>
        <li>
          {t(
            'Testing simulates failover for all namespaces currently under this DRPC.'
          )}
        </li>
        <li>
          {t(
            'Your production workload will continue running on the source cluster.'
          )}
        </li>
        <li>
          {interval
            ? t(
                'Testing resumes automatically when sync lag falls to {{lagLimit}} or less.',
                {
                  lagLimit: `${THRESHOLD * interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unit]}`,
                }
              )
            : t(
                'Testing resumes automatically when sync lag falls to 3 times the replication interval or less.'
              )}
        </li>
        {showManualCleanup && (
          <li>
            {t(
              'Test requires manual clean up or you can convert test to real failover.'
            )}
          </li>
        )}
      </>
    ),
  };
};

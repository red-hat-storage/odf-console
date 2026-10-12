import * as React from 'react';
import { VM_RECIPE_NAME } from '@odf/mco/constants';
import { DRPlacementControlKind, VRGConditionReason } from '@odf/mco/types';
import { isDiscoveredDRPC } from '@odf/mco/utils';
import { TFunction } from 'i18next';
import { AlertProps, AlertVariant } from '@patternfly/react-core';

export const requiresManualCleanup = (
  drpc: DRPlacementControlKind
): boolean => {
  if (drpc?.spec?.kubeObjectProtection?.recipeRef?.name !== VM_RECIPE_NAME) {
    return true;
  }
  const autoCleanup = drpc.status?.resourceConditions?.conditions?.find(
    (condition) => condition.type === 'AutoCleanup'
  );
  return autoCleanup?.reason === VRGConditionReason.NotFeasible;
};

export const showManualTestCleanup = (drpc?: DRPlacementControlKind): boolean =>
  !!drpc && isDiscoveredDRPC(drpc) && requiresManualCleanup(drpc);

export const getTestFailoverAlertMessage = (
  t: TFunction,
  showManualCleanup: boolean
): AlertProps => ({
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
        {t(
          'Testing resumes automatically when sync lag falls to 3 times the replication interval or less.'
        )}
      </li>
      {showManualCleanup && (
        <li>
          {t(
            'Test requires manual clean up, or you can convert the test to a real failover.'
          )}
        </li>
      )}
    </>
  ),
});

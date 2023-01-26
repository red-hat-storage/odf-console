import * as React from 'react';
import { ModalMap } from '@odf/shared/modals/modalLauncher';
import { TFunction } from 'i18next';
import { Actions } from '../../../constants/disaster-recovery';

export const DRPolicyActions = (t: TFunction): ModalMap => ({
  [Actions(t).MANAGE_DR_POLICY]: React.lazy(
    () => import('../../modals/drpolicy-apps-apply/apply-policy-modal')
  ),
  [Actions(t).APPLY_DR_POLICY]: React.lazy(
    () =>
      import(
        '../../modals/drpolicy-apps-apply/subscriptions/apply-policy-modal'
      )
  ),
});

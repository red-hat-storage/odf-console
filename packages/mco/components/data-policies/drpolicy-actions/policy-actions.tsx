import * as React from 'react';
import { ModalMap } from '@odf/shared/modals/modalLauncher';
import { TFunction } from 'i18next';
import { Actions } from '../../../constants/dr-policy';

export const DRPolicyActions = (t: TFunction): ModalMap => ({
  [Actions(t).APPLY_DR_POLICY]: React.lazy(
    () => import('./apply-policy/apply-policy-modal')
  ),
});

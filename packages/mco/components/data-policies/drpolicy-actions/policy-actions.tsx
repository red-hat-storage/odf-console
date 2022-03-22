import * as React from 'react';
import { ModalMap } from '@odf/shared/modals/modalLauncher';


export enum Actions {
    APPLY_DR_POLICY = 'Apply DRPolicy',
    DELETE_DR_POLICY = 'Delete DRPolicy',
};

export const DRPolicyActions: ModalMap = {
    [Actions.APPLY_DR_POLICY]: React.lazy(() => import('./apply-policy/apply-policy-modal')),
    [Actions.DELETE_DR_POLICY]: React.lazy(() => import('@odf/shared/modals/DeleteModal'))
}

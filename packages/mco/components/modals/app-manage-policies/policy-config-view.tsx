import * as React from 'react';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button, ButtonVariant } from '@patternfly/react-core';
import {
  PolicyConfigViewer,
  PlacementControlMap,
} from './helper/policy-config-viewer';
import { ModalViewContext, PolicyConfigViewState } from './utils/reducer';
import { DRPlacementControlType } from './utils/types';

const getPlacementControlMap = (
  placementControls: DRPlacementControlType[]
): PlacementControlMap =>
  placementControls?.reduce(
    (acc, drpc) => ({
      ...acc,
      [getName(drpc.placementInfo)]: {
        pvcSelector: drpc.pvcSelector,
        lastGroupSyncTime: drpc.lastGroupSyncTime,
      },
    }),
    {}
  ) || {};

export const PolicyConfigView: React.FC<PolicyConfigViewProps> = ({
  state,
  setModalContext,
}) => {
  const { t } = useCustomTranslation();
  const { policy } = state;

  return (
    <>
      <ModalBody>
        <PolicyConfigViewer
          policyName={getName(policy)}
          replicationType={policy.replicationType}
          schedulingInterval={policy.schedulingInterval}
          clusters={policy.drClusters}
          isValidated={policy.isValidated}
          placementControlMap={getPlacementControlMap(
            policy.placementControlInfo
          )}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          id="modal-back-action"
          variant={ButtonVariant.secondary}
          onClick={() => setModalContext(ModalViewContext.POLICY_LIST_VIEW)}
        >
          {t('Back')}
        </Button>
      </ModalFooter>
    </>
  );
};

type PolicyConfigViewProps = {
  state: PolicyConfigViewState;
  setModalContext: (modalViewContext: ModalViewContext) => void;
};

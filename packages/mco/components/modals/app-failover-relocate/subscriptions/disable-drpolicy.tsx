import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { CommonModalProps } from '@odf/shared/modals/common';
import { getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Modal, Button, ModalVariant } from '@patternfly/react-core';
import {
  ACMSubscriptionModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
} from '../../../../models';
import {
  DRPlacementControlKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
} from '../../../../types';
import {
  filterDRPlacementRuleNames,
  filterDRSubscriptions,
  SubscriptionMap,
  getDRPolicyName,
  getDRPoliciesCount,
  PlacementRuleMap,
  getAppDRInfo,
  ApplicationDRInfo,
  DRPolicyMap,
} from '../../../../utils';

const getDRPolicies = (appDRInfoList: ApplicationDRInfo[]): DRPolicyMap =>
  appDRInfoList.reduce((obj, appDRInfo) => {
    const drPolicyName = getDRPolicyName(appDRInfo?.drPolicyControl);
    const drpc = appDRInfo?.drPolicyControl;
    return {
      ...obj,
      [drPolicyName]: obj.hasOwnProperty(drPolicyName)
        ? [...obj[drPolicyName], drpc]
        : [drpc],
    };
  }, {});

const drResources = (namespace: string) => ({
  subscriptions: {
    kind: referenceForModel(ACMSubscriptionModel),
    namespaced: true,
    namespace,
    isList: true,
  },
  placementRules: {
    kind: referenceForModel(ACMPlacementRuleModel),
    namespaced: true,
    namespace,
    isList: true,
  },
  drPlacementControls: {
    kind: referenceForModel(DRPlacementControlModel),
    namespaced: true,
    namespace,
    isList: true,
  },
});

export const DisableDrPolicyModal: React.FC<CommonModalProps> = ({
  isOpen,
  extraProps,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { resource } = extraProps;
  const application = resource as ApplicationKind;
  const response = useK8sWatchResources<DataPoliciesResourceType>(
    drResources(getNamespace(application))
  );
  const memoizedPlacementRule = useDeepCompareMemoize(
    response.placementRules,
    true
  );
  const memoizedSubscriptions = useDeepCompareMemoize(
    response.subscriptions,
    true
  );
  const memoizedDRPlacementControls = useDeepCompareMemoize(
    response.drPlacementControls,
    true
  );

  const {
    data: placementRules,
    loaded: placementRulesLoaded,
    loadError: placementRulesLoadError,
  } = memoizedPlacementRule;

  const {
    data: subscriptions,
    loaded: subscriptionsLoaded,
    loadError: subscriptionsLoadError,
  } = memoizedSubscriptions;

  const {
    data: drPlacementControls,
    // loaded: drPlacementControlsLoaded,
    // loadError: drPlacementControlsLoadError,
  } = memoizedDRPlacementControls;

  const plsRuleLoaded = placementRulesLoaded && !placementRulesLoadError;
  const subsLoaded = subscriptionsLoaded && !subscriptionsLoadError;
  // const drpcLoaded =
  //   drPlacementControlsLoaded && !drPlacementControlsLoadError;

  // alert(drpcLoaded);
  const placementRuleMap: PlacementRuleMap = React.useMemo(
    () => (plsRuleLoaded && filterDRPlacementRuleNames(placementRules)) || {},
    [placementRules, plsRuleLoaded]
  );

  const subscriptionMap: SubscriptionMap = React.useMemo(
    () =>
      (subsLoaded &&
        !_.isEmpty(placementRuleMap) &&
        filterDRSubscriptions(application, subscriptions, placementRuleMap)) ||
      {},
    [subscriptions, subsLoaded, placementRuleMap, application]
  );

  const appDRInfoList: ApplicationDRInfo[] = getAppDRInfo(
    drPlacementControls,
    subscriptionMap,
    placementRuleMap
  );
  const drPolicies = getDRPolicies(appDRInfoList);
  //alert(drPolicies);
  const count = getDRPoliciesCount(drPolicies);
  const title = pluralize(
    count,
    t('Permanently disable policy ({{count}})', { count }),
    t('Permanently disable policies ({{count}})', { count }),
    false
  );

  const handleModalToggle = () => {
    setIsModalOpen(!isModalOpen);
    return true;
  };

  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.small}
      actions={[
        <Button key="confirm" variant="primary" onClick={handleModalToggle}>
          Yes, disable
        </Button>,
        <Button key="cancel" variant="link" onClick={close}>
          Cancel
        </Button>,
      ]}
    >
      The underlying DR resources for all policies will be deleted, use will be
      required to apply policy again to enable DR protection.
    </Modal>
  );
};

export type DataPoliciesStatusType = {
  drPolicies: DRPolicyMap;
};

type DataPoliciesResourceType = {
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

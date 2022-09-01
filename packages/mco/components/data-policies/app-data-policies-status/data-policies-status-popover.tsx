import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import {
  Popover,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  ACMSubscriptionModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
} from '../../../models';
import {
  DRPlacementControlKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
} from '../../../types';
import {
  getFilteredDRPlacementRuleNames,
  getFilterDRSubscriptions,
  SubscriptionMap,
  isObjectRefMatching,
  getDRPolicyName,
  getDRPoliciesCount,
} from '../../../utils';
import { DRStatusCard } from '../../disaster-recovery/application-dr-status/dr-status-card';
import { DataPoliciesStatusType } from './data-policies-status-modal';
import './data-policies-status-popover.scss';

const filterDRPlacementControls = (
  drPlacementControls: DRPlacementControlKind[],
  subscriptionMap: SubscriptionMap
): DRPlacementControlKind[] =>
  drPlacementControls?.filter((drPlacementControl) =>
    isObjectRefMatching(
      drPlacementControl?.spec?.placementRef,
      Object.keys(subscriptionMap)
    )
  );

const getDRPolicies = (drPlacementControls: DRPlacementControlKind[]) =>
  drPlacementControls.reduce((obj, drpc) => {
    const drPolicyName = getDRPolicyName(drpc);
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

export const STATUS_MODAL = 'STATUS_MODAL';

const modalMap = {
  [STATUS_MODAL]: React.lazy(() => import('./data-policies-status-modal')),
};

export const DataPoliciesStatusPopover: React.FC<DataPoliciesStatusPopoverProps> =
  ({ resource }) => {
    const { t } = useCustomTranslation();
    const response = useK8sWatchResources<DataPoliciesResourceType>(
      drResources(resource?.metadata?.namespace)
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
      loaded: drPlacementControlsLoaded,
      loadError: drPlacementControlsLoadError,
    } = memoizedDRPlacementControls;

    const drPlacementRules: string[] = React.useMemo(
      () =>
        (placementRulesLoaded &&
          !placementRulesLoadError &&
          getFilteredDRPlacementRuleNames(placementRules)) ||
        [],
      [placementRules, placementRulesLoaded, placementRulesLoadError]
    );

    const subscriptionMap: SubscriptionMap = React.useMemo(
      () =>
        (subscriptionsLoaded &&
          !subscriptionsLoadError &&
          getFilterDRSubscriptions(
            resource,
            subscriptions,
            drPlacementRules
          )) ||
        {},
      [
        subscriptions,
        subscriptionsLoaded,
        subscriptionsLoadError,
        drPlacementRules,
        resource,
      ]
    );

    const [dataPoliciesStatus, count]: [DataPoliciesStatusType, number] =
      React.useMemo(() => {
        const activeDRPC: DRPlacementControlKind[] =
          (drPlacementControlsLoaded &&
            !drPlacementControlsLoadError &&
            filterDRPlacementControls(drPlacementControls, subscriptionMap)) ||
          [];
        const drPolicies = getDRPolicies(activeDRPC);
        return [
          {
            drPolicies,
          },
          getDRPoliciesCount(drPolicies),
        ];
      }, [
        drPlacementControls,
        drPlacementControlsLoaded,
        drPlacementControlsLoadError,
        subscriptionMap,
      ]);

    const [Modal, modalProps, launcher] = useModalLauncher(modalMap);
    const launchModal = React.useCallback(
      () => launcher(STATUS_MODAL, dataPoliciesStatus),
      [launcher, dataPoliciesStatus]
    );

    const onClick = (hide: any) => {
      launchModal();
      hide();
    };

    return (
      <>
        <Modal {...modalProps} />
        <Popover
          aria-label={t('Data policies popover')}
          position="bottom"
          headerContent={
            <h4
              className="mco-data-policies-status-popover__header"
              data-test="popover-header"
            >
              {t('Data policies ({{count}})', { count })}
            </h4>
          }
          bodyContent={
            <Flex
              direction={{ default: 'column' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <DRStatusCard drPolicies={dataPoliciesStatus?.drPolicies} />
            </Flex>
          }
          footerContent={(hide) => (
            <Flex>
              <FlexItem align={{ default: 'alignRight' }}>
                <Button
                  data-test="status-modal-link"
                  variant={ButtonVariant.link}
                  onClick={() => onClick(hide)}
                >
                  {t('View more details')}
                </Button>
              </FlexItem>
            </Flex>
          )}
        >
          {!!count && (
            <Button variant={ButtonVariant.link} data-test="popover-link">
              {t('{{count}} policies', { count })}
            </Button>
          )}
        </Popover>
      </>
    );
  };

type DataPoliciesStatusPopoverProps = {
  resource?: ApplicationKind;
};

type DataPoliciesResourceType = {
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

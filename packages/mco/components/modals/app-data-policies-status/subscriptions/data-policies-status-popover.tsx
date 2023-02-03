import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
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
import { DataPoliciesStatusType } from './data-policies-status-modal';
import { DRStatusCard } from './dr-status-card';
import './data-policies-status-popover.scss';

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

export const STATUS_MODAL = 'STATUS_MODAL';

const modalMap = {
  [STATUS_MODAL]: React.lazy(() => import('./data-policies-status-modal')),
};

export const DataPoliciesStatusPopover: React.FC<DataPoliciesStatusPopoverProps> =
  ({ application }) => {
    const { t } = useCustomTranslation();
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
      loaded: drPlacementControlsLoaded,
      loadError: drPlacementControlsLoadError,
    } = memoizedDRPlacementControls;

    const plsRuleLoaded = placementRulesLoaded && !placementRulesLoadError;
    const subsLoaded = subscriptionsLoaded && !subscriptionsLoadError;
    const drpcLoaded =
      drPlacementControlsLoaded && !drPlacementControlsLoadError;

    const placementRuleMap: PlacementRuleMap = React.useMemo(
      () => (plsRuleLoaded && filterDRPlacementRuleNames(placementRules)) || {},
      [placementRules, plsRuleLoaded]
    );

    const subscriptionMap: SubscriptionMap = React.useMemo(
      () =>
        (subsLoaded &&
          !_.isEmpty(placementRuleMap) &&
          filterDRSubscriptions(
            application,
            subscriptions,
            placementRuleMap
          )) ||
        {},
      [subscriptions, subsLoaded, placementRuleMap, application]
    );

    const [dataPoliciesStatus, count]: [DataPoliciesStatusType, number] =
      React.useMemo(() => {
        if (
          drpcLoaded &&
          !_.isEmpty(placementRuleMap) &&
          !_.isEmpty(subscriptionMap)
        ) {
          const appDRInfoList: ApplicationDRInfo[] = getAppDRInfo(
            drPlacementControls,
            subscriptionMap,
            placementRuleMap
          );
          const drPolicies = getDRPolicies(appDRInfoList);
          return [
            {
              drPolicies,
            },
            getDRPoliciesCount(drPolicies),
          ];
        }
        return [{ drPolicies: {} }, 0];
      }, [drPlacementControls, drpcLoaded, subscriptionMap, placementRuleMap]);

    const [Modal, modalProps, launcher] = useModalLauncher(modalMap);
    const launchModal = React.useCallback(
      () => launcher(STATUS_MODAL, dataPoliciesStatus),
      [launcher, dataPoliciesStatus]
    );

    const onClick = (hide: any) => {
      launchModal();
      hide();
    };

    const headerText = pluralize(
      count,
      t('Data policy ({{count}})', { count }),
      t('Data policies ({{count}})', { count }),
      false
    );
    const linkText = pluralize(count, t('policy'), t('policies'), true);

    return (
      <>
        <Modal {...modalProps} />
        <Popover
          aria-label={t('Data policies popover')}
          position="bottom"
          headerContent={
            <h4
              className="mco-data-policies-subs-status-popover__header"
              data-test="popover-header"
            >
              {headerText}
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
          {!!count && <a data-test="subs-popover-link">{linkText}</a>}
        </Popover>
      </>
    );
  };

type DataPoliciesStatusPopoverProps = {
  application?: ApplicationKind;
};

type DataPoliciesResourceType = {
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

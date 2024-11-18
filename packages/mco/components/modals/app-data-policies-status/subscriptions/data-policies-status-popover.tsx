import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  useK8sWatchResources,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  Popover,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  getDRPlacementControlResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  getPlacementRuleResourceObj,
  getSubscriptionResourceObj,
} from '../../../../hooks';
import {
  DRPlacementControlKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
  ACMPlacementKind,
  ACMPlacementDecisionKind,
} from '../../../../types';
import {
  generateUniquePlacementMap,
  filterDRSubscriptions,
  SubscriptionMap,
  getDRPolicyName,
  getDRPoliciesCount,
  PlacementMap,
  getAppDRInfo,
  ApplicationDRInfo,
  DRPolicyMap,
} from '../../../../utils';
import { DataPoliciesStatusType } from './data-policies-status-modal';
import { DRStatusCard } from './dr-status-card';
import './data-policies-status-popover.scss';

const getDRPolicies = (appDRInfoList: ApplicationDRInfo[]): DRPolicyMap =>
  appDRInfoList.reduce((obj, appDRInfo) => {
    const drPolicyName = getDRPolicyName(appDRInfo?.drPlacementControl);
    const drpc = appDRInfo?.drPlacementControl;
    return {
      ...obj,
      [drPolicyName]: obj.hasOwnProperty(drPolicyName)
        ? [...obj[drPolicyName], drpc]
        : [drpc],
    };
  }, {});

const drResources = (namespace: string) => ({
  subscriptions: getSubscriptionResourceObj({ namespace }),
  placementRules: getPlacementRuleResourceObj({ namespace }),
  placements: getPlacementResourceObj({ namespace }),
  placementDecisions: getPlacementDecisionsResourceObj({ namespace }),
  drPlacementControls: getDRPlacementControlResourceObj({ namespace }),
});

export const STATUS_MODAL = 'STATUS_MODAL';

const DataPoliciesStatusModal = React.lazy(
  () => import('./data-policies-status-modal')
);

export const DataPoliciesStatusPopover: React.FC<DataPoliciesStatusPopoverProps> =
  ({ application }) => {
    const { t } = useCustomTranslation();
    const [isVisible, setIsVisible] = React.useState(false);
    const launcher = useModal();
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

    const {
      data: placements,
      loaded: placementsLoaded,
      loadError: placementsLoadError,
    } = response?.placements;

    const {
      data: placementDecisions,
      loaded: placementDecisionsLoaded,
      loadError: placementDecisionsLoadError,
    } = response?.placementDecisions;

    const placementLoaded =
      placementRulesLoaded &&
      placementDecisionsLoaded &&
      placementsLoaded &&
      !(
        placementRulesLoadError ||
        placementsLoadError ||
        placementDecisionsLoadError
      );
    const subsLoaded = subscriptionsLoaded && !subscriptionsLoadError;
    const drpcLoaded =
      drPlacementControlsLoaded && !drPlacementControlsLoadError;

    const placementMap: PlacementMap = React.useMemo(
      () =>
        placementLoaded
          ? generateUniquePlacementMap(
              placementRules,
              placements,
              placementDecisions
            )
          : {},
      [placementRules, placements, placementDecisions, placementLoaded]
    );

    const subscriptionMap: SubscriptionMap = React.useMemo(
      () =>
        (subsLoaded &&
          !_.isEmpty(placementMap) &&
          filterDRSubscriptions(application, subscriptions, placementMap)) ||
        {},
      [subscriptions, subsLoaded, placementMap, application]
    );

    const [dataPoliciesStatus, count]: [DataPoliciesStatusType, number] =
      React.useMemo(() => {
        if (
          drpcLoaded &&
          !_.isEmpty(placementMap) &&
          !_.isEmpty(subscriptionMap)
        ) {
          const appDRInfoList: ApplicationDRInfo[] = getAppDRInfo(
            drPlacementControls,
            subscriptionMap,
            placementMap
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
      }, [drPlacementControls, drpcLoaded, subscriptionMap, placementMap]);

    const launchModal = React.useCallback(
      () =>
        launcher(DataPoliciesStatusModal, {
          extraProps: dataPoliciesStatus,
          isOpen: true,
        }),
      [launcher, dataPoliciesStatus]
    );

    const onClick = () => {
      launchModal();
      setIsVisible(false);
    };

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
        isVisible={isVisible}
        shouldClose={() => setIsVisible(false)}
        shouldOpen={() => setIsVisible(true)}
        footerContent={
          <Flex>
            <FlexItem align={{ default: 'alignRight' }}>
              <Button
                data-test="status-modal-link"
                variant={ButtonVariant.link}
                onClick={onClick}
              >
                {t('View more details')}
              </Button>
            </FlexItem>
          </Flex>
        }
      >
        {!!count && <a data-test="subs-popover-link">{linkText}</a>}
      </Popover>
    );
  };

type DataPoliciesStatusPopoverProps = {
  application?: ApplicationKind;
};

type DataPoliciesResourceType = {
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
};

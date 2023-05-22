import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { ApplicationModel } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Flex, FlexItem, Alert, AlertVariant } from '@patternfly/react-core';
import { DRActionType } from '../../../../constants';
import {
  ACMPlacementRuleModel,
  ACMSubscriptionModel,
  DRPlacementControlModel,
} from '../../../../models';
import {
  ACMSubscriptionKind,
  ACMPlacementRuleKind,
  DRPlacementControlKind,
} from '../../../../types';
import {
  filterDRSubscriptions,
  filterDRPlacementRuleNames,
  SubscriptionMap,
  getAppDRInfo,
  PlacementRuleMap,
} from '../../../../utils';
import { DRPolicySelector } from './dr-policy-selector';
import { ErrorMessages, ErrorMessageType, MessageKind } from './error-messages';
import { PeerClusterStatus } from './peer-cluster-status';
import {
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  FailoverAndRelocateType,
  DRPolicyControlState,
  ErrorMessage,
  ModalFooterStatus,
} from './reducer';
import { SubscriptionGroupSelector } from './subscription-group-selector';
import { TargetClusterSelector } from './target-cluster-selector';

export const findErrorMessage = (errorMessage: ErrorMessage) =>
  [
    errorMessage.drPolicyControlStateErrorMessage,
    errorMessage.managedClustersErrorMessage,
    errorMessage.targetClusterErrorMessage,
    errorMessage.subscriptionGroupErrorMessage,
    errorMessage.peerStatusErrorMessage,
  ]
    .filter(Boolean)
    .find((errorMessageItem) => errorMessageItem);

const resources = (namespace: string) => ({
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

const MessageStatus: React.FC<MessageKind> = ({ title, variant, message }) => (
  <Flex>
    <FlexItem fullWidth={{ default: 'fullWidth' }}>
      <Alert
        className="mco-subs-dr-action-body__alert"
        title={title}
        variant={variant}
        isInline
      >
        {message}
      </Alert>
    </FlexItem>
  </Flex>
);

export const FailoverRelocateModalBody: React.FC<FailoverRelocateModalBodyProps> =
  (props) => {
    const { application, action, state, dispatch } = props;
    const { t } = useCustomTranslation();

    const response = useK8sWatchResources<DRActionWatchResourceType>(
      resources(application?.metadata?.namespace)
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
      () => (plsRuleLoaded ? filterDRPlacementRuleNames(placementRules) : {}),
      [placementRules, plsRuleLoaded]
    );

    const subscriptionMap: SubscriptionMap = React.useMemo(
      () =>
        // Filtering subscription using DR placementRules and application selectors
        subsLoaded && !_.isEmpty(placementRuleMap)
          ? filterDRSubscriptions(application, subscriptions, placementRuleMap)
          : {},
      [subscriptions, subsLoaded, placementRuleMap, application]
    );

    React.useEffect(() => {
      // Grouping ACM subscriptions using DR placement controls
      if (drpcLoaded) {
        const drPolicyControlState: DRPolicyControlState[] = getAppDRInfo(
          drPlacementControls,
          subscriptionMap,
          placementRuleMap
        );
        !!drPolicyControlState.length
          ? dispatch({
              type: FailoverAndRelocateType.SET_DR_POLICY_CONTROL_STATE,
              payload: drPolicyControlState,
            })
          : dispatch({
              type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
              payload: {
                drPolicyControlStateErrorMessage:
                  action === DRActionType.FAILOVER
                    ? ErrorMessageType.DR_IS_NOT_ENABLED_FAILOVER
                    : ErrorMessageType.DR_IS_NOT_ENABLED_RELOCATE,
              },
            });
      }
    }, [
      drpcLoaded,
      drPlacementControls,
      subscriptionMap,
      placementRuleMap,
      action,
      dispatch,
      t,
    ]);

    return (
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsSm' }}
      >
        <Flex>
          <FlexItem>
            <strong> {t('Application name:')} </strong>
          </FlexItem>
          <FlexItem data-test="app-name">
            <ResourceIcon resourceModel={ApplicationModel} />
            {application?.metadata?.name || '-'}
          </FlexItem>
        </Flex>
        <Flex
          direction={{ default: 'column' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem>
            <strong> {t('Select policy')} </strong>
          </FlexItem>
          <FlexItem>
            <DRPolicySelector state={state} dispatch={dispatch} />
          </FlexItem>
        </Flex>
        <Flex
          direction={{ default: 'column' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem>
            <strong> {t('Target cluster')} </strong>
          </FlexItem>
          <FlexItem>
            <TargetClusterSelector state={state} dispatch={dispatch} />
          </FlexItem>
        </Flex>
        <PeerClusterStatus state={state} dispatch={dispatch} />
        <Flex
          grow={{ default: 'grow' }}
          direction={{ default: 'column' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem>
            <strong> {t('Select subscriptions group')} </strong>
          </FlexItem>
          <FlexItem className="mco-subs-dr-action-body__dropdown--width">
            <SubscriptionGroupSelector state={state} dispatch={dispatch} />
          </FlexItem>
        </Flex>
        {(state.modalFooterStatus === ModalFooterStatus.FINISHED && (
          <MessageStatus
            {...(action === DRActionType.FAILOVER
              ? {
                  title: t('Failover initiated'),
                  variant: AlertVariant.success,
                }
              : {
                  title: t('Relocate initiated'),
                  variant: AlertVariant.success,
                })}
          />
        )) ||
          ((!!findErrorMessage(state.errorMessage) ||
            !_.isEmpty(state.actionErrorMessage)) && (
            <MessageStatus
              {...(ErrorMessages(t)[findErrorMessage(state.errorMessage)] ||
                state.actionErrorMessage)}
            />
          ))}
      </Flex>
    );
  };

type FailoverRelocateModalBodyProps = {
  application: ApplicationKind;
  action: DRActionType;
  state: FailoverAndRelocateState;
  dispatch: React.Dispatch<FailoverAndRelocateAction>;
};

type DRActionWatchResourceType = {
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

import * as React from 'react';
import { ACM_DEFAULT_DOC_VERSION } from '@odf/shared/constants';
import { StatusBox } from '@odf/shared/generic';
import { useDocVersion, DOC_VERSION as mcoDocVersion } from '@odf/shared/hooks';
import { ApplicationModel } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Flex, FlexItem, Alert, AlertVariant } from '@patternfly/react-core';
import { DRActionType, ACM_OPERATOR_SPEC_NAME } from '../../../../constants';
import {
  getDRPlacementControlResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  getPlacementRuleResourceObj,
  getSubscriptionResourceObj,
} from '../../../../hooks';
import {
  ACMSubscriptionKind,
  ACMPlacementRuleKind,
  DRPlacementControlKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
} from '../../../../types';
import {
  filterDRSubscriptions,
  generateUniquePlacementMap,
  SubscriptionMap,
  getAppDRInfo,
  PlacementMap,
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
  subscriptions: getSubscriptionResourceObj({ namespace }),
  placementRules: getPlacementRuleResourceObj({ namespace }),
  placements: getPlacementResourceObj({ namespace }),
  placementDecisions: getPlacementDecisionsResourceObj({ namespace }),
  drPlacementControls: getDRPlacementControlResourceObj({ namespace }),
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

    const acmDocVersion = useDocVersion({
      defaultDocVersion: ACM_DEFAULT_DOC_VERSION,
      specName: ACM_OPERATOR_SPEC_NAME,
    });

    const {
      data: placementRules,
      loaded: placementRulesLoaded,
      loadError: placementRulesLoadError,
    } = response?.placementRules;

    const {
      data: subscriptions,
      loaded: subscriptionsLoaded,
      loadError: subscriptionsLoadError,
    } = response?.subscriptions;

    const {
      data: drPlacementControls,
      loaded: drPlacementControlsLoaded,
      loadError: drPlacementControlsLoadError,
    } = response?.drPlacementControls;

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
      placementRulesLoaded && placementDecisionsLoaded && placementsLoaded;

    const placementLoadError =
      placementRulesLoadError ||
      placementsLoadError ||
      placementDecisionsLoadError;

    const loaded =
      subscriptionsLoaded && placementLoaded && drPlacementControlsLoaded;
    const loadError =
      subscriptionsLoadError ||
      placementLoadError ||
      drPlacementControlsLoadError;

    React.useEffect(() => {
      if (loaded && !loadError) {
        // Creating unique placement map using name, namespace and kind of placementRule/placement
        const placementMap: PlacementMap = generateUniquePlacementMap(
          placementRules,
          placements,
          placementDecisions
        );

        const subscriptionMap: SubscriptionMap =
          // Filtering subscription using DR placementRules/placements and application selectors
          !_.isEmpty(placementMap)
            ? filterDRSubscriptions(application, subscriptions, placementMap)
            : {};

        // Grouping ACM subscriptions using DR placement controls
        const drPolicyControlState: DRPolicyControlState[] = !_.isEmpty(
          subscriptionMap
        )
          ? getAppDRInfo(drPlacementControls, subscriptionMap, placementMap)
          : [];
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
      loaded,
      loadError,
      application,
      drPlacementControls,
      subscriptions,
      placementRules,
      placements,
      placementDecisions,
      action,
      dispatch,
      t,
    ]);

    return loaded && !loadError ? (
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
              {...(ErrorMessages(t, mcoDocVersion, acmDocVersion)[
                findErrorMessage(state.errorMessage)
              ] || state.actionErrorMessage)}
            />
          ))}
      </Flex>
    ) : (
      <StatusBox loaded={loaded} loadError={loadError} />
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
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
};

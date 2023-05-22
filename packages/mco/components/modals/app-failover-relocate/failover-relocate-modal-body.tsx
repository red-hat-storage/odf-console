import * as React from 'react';
import { ApplicationModel } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Alert,
} from '@patternfly/react-core';
import { UnknownIcon } from '@patternfly/react-icons';
import { DRActionType, REPLICATION_TYPE } from '../../../constants';
import { formatDateTime } from '../../../utils';
import {
  ErrorMessageType,
  evaluateErrorMessage,
  ErrorMessages,
  MessageKind,
} from './error-messages';
import './failover-relocate-modal-body.scss';

const failoverPreCheck = (placement: PlacementProps) => {
  // Failover pre-check
  if (placement?.isTargetClusterAvailable) {
    if (placement?.replicationType === REPLICATION_TYPE.SYNC) {
      if (!placement?.isPrimaryClusterFenced) {
        // Primary cluster is unfenced
        return ErrorMessageType.PRIMARY_CLUSTER_IS_NOT_FENCED;
      }
      if (placement?.isTargetClusterFenced) {
        // Target cluster is fenced
        return ErrorMessageType.TARGET_CLUSTER_IS_FENCED;
      }
    }
  } else {
    // Target cluster is down
    return ErrorMessageType.TARGET_CLUSTER_IS_NOT_AVAILABLE;
  }
};

const relocatePreCheck = (placement: PlacementProps) => {
  // Relocate pre-check
  if (
    placement?.isTargetClusterAvailable &&
    placement?.isPrimaryClusterAvailable
  ) {
    if (placement?.replicationType === REPLICATION_TYPE.SYNC) {
      if (
        placement?.isPrimaryClusterFenced ||
        placement?.isTargetClusterFenced
      ) {
        // Either Primary cluster or target cluster is fenced
        return ErrorMessageType.SOME_CLUSTERS_ARE_FENCED;
      }
    }
  } else {
    // Either target cluster or Primary cluster is down
    return ErrorMessageType.MANAGED_CLUSTERS_ARE_DOWN;
  }
};

const validatePlacement = (
  placement: PlacementProps,
  action: DRActionType
): ErrorMessageType => {
  const isFailoverAction = action === DRActionType.FAILOVER;
  if (!placement?.drPlacementControlName) {
    // DR is disabled
    return isFailoverAction
      ? ErrorMessageType.DR_IS_NOT_ENABLED_FAILOVER
      : ErrorMessageType.DR_IS_NOT_ENABLED_RELOCATE;
  } else if (!placement?.isDRActionReady) {
    // Either Peer is not ready for DR failover
    // Or, Peer is not ready/available for DR relocate
    return isFailoverAction
      ? ErrorMessageType.FAILOVER_READINESS_CHECK_FAILED
      : ErrorMessageType.RELOCATE_READINESS_CHECK_FAILED;
  } else {
    const errorMessage = isFailoverAction
      ? failoverPreCheck(placement)
      : relocatePreCheck(placement);
    if (!errorMessage) {
      if (placement?.areSiblingApplicationsFound) {
        return isFailoverAction
          ? ErrorMessageType.SIBLING_APPLICATIONS_FOUND_FAILOVER
          : ErrorMessageType.SIBLING_APPLICATIONS_FOUND_RELOCATE;
      }
    }
    return errorMessage;
  }
};

const MessageStatus = ({ message }: { message: MessageKind }) => (
  <Flex>
    <FlexItem fullWidth={{ default: 'fullWidth' }}>
      <Alert
        data-test="dr-message-status"
        className="mco-dr-action-body__alert"
        title={message?.title}
        variant={message?.variant}
        isInline
      >
        {message?.message}
      </Alert>
    </FlexItem>
  </Flex>
);

const TargetClusterStatus = ({
  targetClusterName,
  isClusterAvailable,
}: {
  targetClusterName: string;
  isClusterAvailable: boolean;
}) => {
  return (
    <StatusIconAndText
      title={targetClusterName}
      icon={
        isClusterAvailable ? (
          <GreenCheckCircleIcon />
        ) : (
          <RedExclamationCircleIcon />
        )
      }
    />
  );
};

const DateTimeFormat = ({
  dateTime,
  className,
}: {
  dateTime: string;
  className: string;
}) => {
  const { t } = useCustomTranslation();
  return (
    <>
      {!!dateTime ? (
        formatDateTime(dateTime)
      ) : (
        <StatusIconAndText
          title={t('Unknown')}
          icon={<UnknownIcon />}
          className={className}
        />
      )}
    </>
  );
};

const DRActionReadiness = ({
  isDRActionReady,
}: {
  isDRActionReady: boolean;
}) => {
  const { t } = useCustomTranslation();
  return (
    <>
      {isDRActionReady !== undefined ? (
        isDRActionReady ? (
          <StatusIconAndText
            title={t('Ready')}
            icon={<GreenCheckCircleIcon />}
          />
        ) : (
          <StatusIconAndText
            title={t('Not ready')}
            icon={<RedExclamationCircleIcon />}
          />
        )
      ) : (
        <StatusIconAndText title={t('Unknown')} icon={<UnknownIcon />} />
      )}
    </>
  );
};

export const FailoverRelocateModalBody: React.FC<FailoverRelocateModalBodyProps> =
  (props) => {
    const { t } = useCustomTranslation();
    const {
      action,
      applicationName,
      setCanInitiate,
      setPlacement,
      placements,
      loadError,
      loaded,
    } = props;
    const [errorMessage, setErrorMessage] = React.useState<ErrorMessageType>();
    const placement = placements?.[0];

    React.useEffect(() => {
      if (loaded && !loadError) {
        const placementErrorMessage = validatePlacement(placement, action);
        setErrorMessage(placementErrorMessage);
        setPlacement(placement);
        setCanInitiate(evaluateErrorMessage(placementErrorMessage) < 0);
      }
    }, [
      placement,
      action,
      loadError,
      loaded,
      setCanInitiate,
      setPlacement,
      setErrorMessage,
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
            {applicationName || (
              <StatusIconAndText title={t('Unknown')} icon={<UnknownIcon />} />
            )}
          </FlexItem>
        </Flex>
        <Flex>
          <FlexItem>
            <strong> {t('DR policy:')} </strong>
          </FlexItem>
          <FlexItem data-test="dr-policy">
            {placement?.drPolicyName || (
              <StatusIconAndText title={t('Unknown')} icon={<UnknownIcon />} />
            )}
          </FlexItem>
        </Flex>
        <Flex justifyContent={{ default: 'justifyContentFlexStart' }}>
          <FlexItem>
            <strong> {t('Target cluster:')} </strong>
          </FlexItem>
          <FlexItem className="mco-dr-action-body__target-cluster--width">
            {!!placement?.targetClusterName ? (
              <TargetClusterStatus
                targetClusterName={placement?.targetClusterName}
                isClusterAvailable={placement?.isTargetClusterAvailable}
              />
            ) : (
              <StatusIconAndText title={t('Unknown')} icon={<UnknownIcon />} />
            )}
          </FlexItem>
          <FlexItem>
            <HelperText>
              <HelperTextItem variant="indeterminate">
                {t('Last available: ')}
                <DateTimeFormat
                  dateTime={placement?.targetClusterAvailableTime}
                  className="pf-u-display-inline-block pf-u-ml-sm"
                />
              </HelperTextItem>
            </HelperText>
          </FlexItem>
        </Flex>
        <Flex>
          <FlexItem>
            <strong>
              {t('{{actionType}} readiness:', {
                actionType: action,
              })}
            </strong>
          </FlexItem>
          <FlexItem>
            <DRActionReadiness isDRActionReady={placement?.isDRActionReady} />
          </FlexItem>
        </Flex>
        {placement?.replicationType === REPLICATION_TYPE.ASYNC && (
          <Flex>
            <FlexItem>
              <strong>
                {t('Data last synced on:', {
                  actionType: action,
                })}
              </strong>
            </FlexItem>
            <FlexItem>
              <DateTimeFormat
                dateTime={placement?.snapshotTakenTime}
                className=""
              />
            </FlexItem>
          </Flex>
        )}
        {evaluateErrorMessage(errorMessage, true) > -1 && (
          <MessageStatus message={ErrorMessages(t)[errorMessage]} />
        )}
      </Flex>
    );
  };

export type PlacementProps = Partial<{
  placementName: string;
  drPolicyName: string;
  drPlacementControlName: string;
  targetClusterName: string;
  targetClusterAvailableTime: string;
  snapshotTakenTime: string;
  failoverCluster: string;
  preferredCluster: string;
  isTargetClusterAvailable: boolean;
  isPrimaryClusterAvailable: boolean;
  isDRActionReady: boolean;
  replicationType: REPLICATION_TYPE;
  isTargetClusterFenced: boolean;
  isPrimaryClusterFenced: boolean;
  areSiblingApplicationsFound: boolean;
}>;

export type ApplicationProps = {
  applicationName: string;
  applicationNamespace: string;
  placements: PlacementProps[];
  action: DRActionType;
  loadError: any;
  loaded: boolean;
};

export type FailoverRelocateModalBodyProps = ApplicationProps & {
  setCanInitiate: React.Dispatch<React.SetStateAction<boolean>>;
  setPlacement: React.Dispatch<React.SetStateAction<PlacementProps>>;
};

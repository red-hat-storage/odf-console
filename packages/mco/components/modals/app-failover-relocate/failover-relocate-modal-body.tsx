import * as React from 'react';
import { getReplicationHealth } from '@odf/mco/utils';
import { ACM_DEFAULT_DOC_VERSION } from '@odf/shared/constants';
import { utcDateTimeFormatter } from '@odf/shared/details-page/datetime';
import { useDocVersion, DOC_VERSION as mcoDocVersion } from '@odf/shared/hooks';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import {
  RedExclamationCircleIcon,
  GreenCheckCircleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  K8sModel,
  K8sResourceCondition,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Alert,
  AlertProps,
} from '@patternfly/react-core';
import { UnknownIcon } from '@patternfly/react-icons';
import {
  DRActionType,
  ReplicationType,
  ACM_OPERATOR_SPEC_NAME,
  VolumeReplicationHealth,
} from '../../../constants';
import {
  ErrorMessageType,
  evaluateErrorMessage,
  ErrorMessages,
  MessageKind,
} from './helper/error-messages';
import './failover-relocate-modal-body.scss';

const failoverPreCheck = (placementControl: PlacementControlProps) => {
  // Failover pre-check
  if (placementControl?.isTargetClusterAvailable) {
    if (placementControl?.replicationType === ReplicationType.SYNC) {
      if (!placementControl?.isPrimaryClusterFenced) {
        // Primary cluster is unfenced
        return ErrorMessageType.PRIMARY_CLUSTER_IS_NOT_FENCED;
      }
      if (placementControl?.isTargetClusterFenced) {
        // Target cluster is fenced
        return ErrorMessageType.TARGET_CLUSTER_IS_FENCED;
      }
    }
  } else {
    // Target cluster is down
    return ErrorMessageType.TARGET_CLUSTER_IS_NOT_AVAILABLE;
  }
};

const relocatePreCheck = (placementControl: PlacementControlProps) => {
  // Relocate pre-check
  if (
    placementControl?.isTargetClusterAvailable &&
    placementControl?.isPrimaryClusterAvailable
  ) {
    if (placementControl?.replicationType === ReplicationType.SYNC) {
      if (
        placementControl?.isPrimaryClusterFenced ||
        placementControl?.isTargetClusterFenced
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
  placementControl: PlacementControlProps,
  action: DRActionType
): ErrorMessageType => {
  const isFailoverAction = action === DRActionType.FAILOVER;

  // Check if DR is invalid
  if (placementControl?.invalidDRPolicy) {
    return ErrorMessageType.DR_IS_INVALID;
  }
  // Check if DR is disabled
  if (!placementControl?.drPlacementControlName) {
    return isFailoverAction
      ? ErrorMessageType.DR_IS_NOT_ENABLED_FAILOVER
      : ErrorMessageType.DR_IS_NOT_ENABLED_RELOCATE;
  }

  // Check if DR action is ready
  // Either Peer is not ready for DR failover
  // Or, Peer is not ready/available for DR relocate
  if (!placementControl?.isDRActionReady) {
    return isFailoverAction
      ? ErrorMessageType.FAILOVER_READINESS_CHECK_FAILED
      : ErrorMessageType.RELOCATE_READINESS_CHECK_FAILED;
  }

  // Perform failover or relocate pre-check
  const preCheckError = isFailoverAction
    ? failoverPreCheck(placementControl)
    : relocatePreCheck(placementControl);

  if (preCheckError) {
    return preCheckError;
  }

  // Check volume replication health
  if (
    [
      VolumeReplicationHealth.CRITICAL,
      VolumeReplicationHealth.WARNING,
    ].includes(
      getReplicationHealth(
        placementControl?.snapshotTakenTime,
        placementControl?.schedulingInterval,
        placementControl?.replicationType
      )
    )
  ) {
    return isFailoverAction
      ? ErrorMessageType.VOLUME_SYNC_DELAY_FAILOVER
      : ErrorMessageType.VOLUME_SYNC_DELAY_RELOCATE;
  }

  // Check if sibling applications are found
  if (placementControl?.areSiblingApplicationsFound) {
    return isFailoverAction
      ? ErrorMessageType.SIBLING_APPLICATIONS_FOUND_FAILOVER
      : ErrorMessageType.SIBLING_APPLICATIONS_FOUND_RELOCATE;
  }

  return null;
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

export const DateTimeFormat: React.FC<{
  dateTime: string;
  className?: string;
}> = ({ dateTime, className }) => {
  const { t } = useCustomTranslation();
  return !!dateTime ? (
    <>{utcDateTimeFormatter.format(new Date(dateTime))}</>
  ) : (
    <StatusIconAndText
      title={t('Unknown')}
      icon={<UnknownIcon />}
      className={className}
    />
  );
};

const DRActionReadiness = ({ canInitiate }: { canInitiate: boolean }) => {
  const { t } = useCustomTranslation();
  return canInitiate ? (
    <StatusIconAndText title={t('Ready')} icon={<GreenCheckCircleIcon />} />
  ) : (
    <StatusIconAndText
      title={t('Not ready')}
      icon={<RedExclamationCircleIcon />}
    />
  );
};

export const FailoverRelocateModalBody: React.FC<
  FailoverRelocateModalBodyProps
> = (props) => {
  const { t } = useCustomTranslation();
  const {
    action,
    applicationName,
    canInitiate,
    setCanInitiate,
    setPlacement,
    placementControls,
    loadError,
    loaded,
    applicationModel,
    message,
  } = props;
  const [errorMessage, setErrorMessage] = React.useState<ErrorMessageType>();
  const placement = placementControls?.[0];

  const acmDocVersion = useDocVersion({
    defaultDocVersion: ACM_DEFAULT_DOC_VERSION,
    specName: ACM_OPERATOR_SPEC_NAME,
  });

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
    <>
      {!!message && <Alert {...message} className="pf-v6-u-mb-md" />}
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsMd' }}
      >
        <Flex>
          <FlexItem>
            <strong> {t('Application:')} </strong>
          </FlexItem>
          <FlexItem data-test="app-name">
            <ResourceIcon resourceModel={applicationModel} />
            {applicationName || (
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
                  className="pf-v6-u-display-inline-block pf-v6-u-ml-sm"
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
            <DRActionReadiness canInitiate={canInitiate} />
          </FlexItem>
        </Flex>
        {placement?.replicationType === ReplicationType.ASYNC && (
          <Flex>
            <FlexItem>
              <strong>{t('Volume last synced on:')}</strong>
            </FlexItem>
            <FlexItem>
              <DateTimeFormat dateTime={placement?.snapshotTakenTime} />
            </FlexItem>
          </Flex>
        )}

        {
          // ToDo: Enable this once DRPC has kube object last sync time.
          /*applicationModel.kind === DRPlacementControlModel.kind && (
            <Flex>
              <FlexItem>
                <strong>{t('Kubernetes object last synced on:')}</strong>
              </FlexItem>
              <FlexItem>
                <DateTimeFormat dateTime={placement?.kubeObjectLastSyncTime} />
              </FlexItem>
            </Flex>
          )*/
        }
        {evaluateErrorMessage(errorMessage, true) > -1 && (
          <MessageStatus
            message={
              ErrorMessages(
                t,
                mcoDocVersion,
                acmDocVersion,
                placement?.invalidDRPolicy
              )[errorMessage]
            }
          />
        )}
      </Flex>
    </>
  );
};

export type PlacementControlProps = Partial<{
  placementName: string;
  drPlacementControlName: string;
  targetClusterName: string;
  targetClusterAvailableTime: string;
  primaryClusterName: string;
  snapshotTakenTime: string;
  isTargetClusterAvailable: boolean;
  isPrimaryClusterAvailable: boolean;
  isDRActionReady: boolean;
  replicationType: ReplicationType;
  isTargetClusterFenced: boolean;
  isPrimaryClusterFenced: boolean;
  areSiblingApplicationsFound: boolean;
  kubeObjectLastSyncTime: string;
  schedulingInterval: string;
  invalidDRPolicy: K8sResourceCondition;
}>;

export type ApplicationProps = {
  applicationName: string;
  applicationNamespace: string;
  applicationModel: K8sModel;
  placementControls: PlacementControlProps[];
  action: DRActionType;
  message?: AlertProps;
  loadError: any;
  loaded: boolean;
};

export type FailoverRelocateModalBodyProps = ApplicationProps & {
  canInitiate: boolean;
  setCanInitiate: React.Dispatch<React.SetStateAction<boolean>>;
  setPlacement: React.Dispatch<React.SetStateAction<PlacementControlProps>>;
};

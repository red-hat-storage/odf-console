import * as React from 'react';
import { DRPolicyKind, DRPlacementControlKind } from '@odf/mco/types';
import { getDRPolicyStatus, parseSyncInterval } from '@odf/mco/utils';
import { formatTime, getLatestDate } from '@odf/shared/details-page/datetime';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { StatusBox } from '@odf/shared/generic/status-box';
import { Labels } from '@odf/shared/labels';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { BlueInfoCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import {
  StatusIconAndText,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TFunction, Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Divider,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { PencilAltIcon, UnknownIcon } from '@patternfly/react-icons';
import {
  DISCOVERED_APP_NS,
  ReplicationType,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '../../../constants';
import { getDRPlacementControlResourceObj } from '../../../hooks';
import {
  doNotDeletePVCAnnotationPromises,
  unAssignPromises,
} from './utils/k8s-utils';
import {
  ModalActionContext,
  ModalViewContext,
  ManagePolicyStateType,
} from './utils/reducer';
import { ManagePolicyStateAction } from './utils/reducer';
import {
  DRInfoType,
  DRPlacementControlType,
  DRPolicyType,
} from './utils/types';
import './style.scss';

const isDRProtectionRemoved = (drpcs: DRPlacementControlType[]) =>
  drpcs.every((drpc) => _.has(drpc.metadata, 'deletionTimestamp'));

const checkNamespaceProtected = (
  workloadNamespace: string,
  eligiblePolicies: DRPolicyKind[],
  drpcs: DRPlacementControlKind[]
): boolean =>
  drpcs?.some((drpc) => {
    const isNamespaceProtected =
      drpc.spec?.protectedNamespaces?.includes(workloadNamespace);
    const isPolicyMatching = eligiblePolicies?.some(
      (policy) => getName(policy) === drpc.spec.drPolicyRef.name
    );
    return isNamespaceProtected && isPolicyMatching;
  });

const getAggregatedDRInfo = (
  drpcs: DRPlacementControlType[]
): AggregatedDRInfo =>
  drpcs.reduce(
    (acc, drpc) => ({
      placements: Array.from(
        new Set([...acc.placements, getName(drpc?.placementInfo)])
      ),
      pvcSelector: [...acc.pvcSelector, ...drpc?.pvcSelector],
      lastGroupSyncTime: getLatestDate([
        acc.lastGroupSyncTime,
        drpc?.lastGroupSyncTime,
      ]),
      assignedOn: formatTime(
        getLatestDate([acc.assignedOn, drpc?.metadata?.creationTimestamp])
      ),
    }),
    { placements: [], pvcSelector: [], lastGroupSyncTime: '', assignedOn: '' }
  );

const getMessage = (t: TFunction<string>, errorMessage?: string) => ({
  [ModalActionContext.ENABLE_DR_PROTECTION_SUCCEEDED]: {
    title: t('New policy assigned to application'),
    variant: AlertVariant.success,
  },
  [ModalActionContext.DISABLE_DR_PROTECTION]: {
    title: t('Remove disaster recovery'),
    variant: AlertVariant.warning,
    description: t(
      'Your application will lose disaster recovery protection, preventing volume synchronization (replication) between clusters.'
    ),
  },
  [ModalActionContext.DISABLE_DR_PROTECTION_SUCCEEDED]: {
    title: t('Disaster recovery removed successfully.'),
    variant: AlertVariant.success,
  },
  [ModalActionContext.DISABLE_DR_PROTECTION_FAILED]: {
    title: errorMessage,
    variant: AlertVariant.danger,
  },
});

const ManagePolicyEmptyPage: React.FC<ManagePolicyEmptyPageProps> = ({
  eligiblePolicies,
  workloadNamespace,
  policyInfoLoaded,
  policyInfoLoadError,
  onClick,
}) => {
  const { t } = useCustomTranslation();
  const [discoveredApps, loaded, loadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(
    getDRPlacementControlResourceObj({
      namespace: DISCOVERED_APP_NS,
    })
  );

  const isNamespaceProtected = checkNamespaceProtected(
    workloadNamespace,
    eligiblePolicies,
    discoveredApps
  );

  const allLoaded = policyInfoLoaded && loaded;
  const anyLoadError = policyInfoLoadError || loadError;

  return allLoaded && !anyLoadError ? (
    <EmptyPage
      isLoaded={allLoaded}
      canAccess={true}
      isDisabled={isNamespaceProtected}
      EmptyIcon={BlueInfoCircleIcon}
      onClick={onClick}
      buttonText={t('Enroll application')}
      title={
        isNamespaceProtected
          ? t('Application already enrolled in disaster recovery')
          : t('No assigned disaster recovery policy found')
      }
    >
      {isNamespaceProtected ? (
        <Trans t={t}>
          <p>
            This managed application namespace is already DR protected. You may
            have protected this namespace while enrolling discovered
            applications.
          </p>
          <p className="pf-v5-u-mt-md">
            To see disaster recovery information for your applications, go to
            <strong>Protected applications</strong> under&nbsp;
            <strong>Disaster Recovery</strong>.
          </p>
        </Trans>
      ) : (
        t(
          'You have not enrolled this application yet. To protect your application,'
        )
      )}
    </EmptyPage>
  ) : (
    <StatusBox loaded={allLoaded} loadError={anyLoadError} />
  );
};

export const DRInformationGroup: React.FC<DRInformationGroupProps> = ({
  title,
  action,
  divider,
  children,
}) => {
  return (
    <div className="pf-v5-u-mb-md">
      <div className="pf-v5-l-flex">
        <Text component={TextVariants.h4} className="pf-v5-l-flex__item">
          {title}
        </Text>
        {!!action && (
          <Button
            variant={ButtonVariant.link}
            icon={action.icon}
            onClick={action.onClick}
            className="pf-v5-l-flex__item pf-m-align-right"
          >
            {action.actionText}
          </Button>
        )}
      </div>
      {children}
      {divider && <Divider className="pf-v5-u-mt-md" />}
    </div>
  );
};

const DRInformation: React.FC<DRInformationProps> = ({
  dataPolicyInfo,
  hideEditAction,
  onEdit,
}) => {
  const { t } = useCustomTranslation();
  const { drPolicyInfo, placementControlInfo } = dataPolicyInfo;
  const { isValidated, replicationType, schedulingInterval, drClusters } =
    drPolicyInfo;
  const isAsyncRelication = replicationType === ReplicationType.ASYNC;
  const [unit, interval] = parseSyncInterval(schedulingInterval);
  const { placements, pvcSelector, lastGroupSyncTime, assignedOn } =
    getAggregatedDRInfo(placementControlInfo);

  return (
    <>
      <DRInformationGroup title={t('Disaster recovery policy details')} divider>
        <Text component={TextVariants.p}>
          {t('Name: {{name}} ({{status}})', {
            name: getName(drPolicyInfo),
            status: getDRPolicyStatus(isValidated, t),
          })}
        </Text>
        <Text component={TextVariants.p}>
          {isAsyncRelication
            ? t(
                'Replication policy: {{replicationType}}, {{interval}} {{unit}}',
                {
                  replicationType,
                  interval,
                  unit: SYNC_SCHEDULE_DISPLAY_TEXT(t)[unit],
                }
              )
            : t('Replication policy: {{replicationType}}', {
                replicationType,
              })}
        </Text>
        <Text component={TextVariants.p}>
          {t('Cluster: {{clusters}}', { clusters: drClusters.join(', ') })}
        </Text>
        <Text component={TextVariants.p} className="pf-v5-u-mt-md">
          {t('Assigned on: {{assignedOn}}', { assignedOn })}
        </Text>
      </DRInformationGroup>
      <DRInformationGroup
        title={t('Protected application resources')}
        action={
          !hideEditAction
            ? {
                actionText: t('Edit to add resources'),
                icon: <PencilAltIcon />,
                onClick: onEdit,
              }
            : undefined
        }
        divider
      >
        <Text component={TextVariants.p}>
          {t('Placement: {{placements}}', {
            placements: placements.join(', '),
          })}
        </Text>
        <Text component={TextVariants.p}>{t('Label selector:')}</Text>
        <Labels labels={pvcSelector} numLabels={4} />
      </DRInformationGroup>
      {isAsyncRelication && (
        <DRInformationGroup title={t('Replication details')}>
          <div className="pf-v5-l-flex">
            <Text component={TextVariants.p} className="pf-v5-l-flex__item">
              {t('Status: ')}
            </Text>
            {!!lastGroupSyncTime ? (
              t('Last synced on {{syncTime}}', {
                syncTime: formatTime(lastGroupSyncTime),
              })
            ) : (
              <StatusIconAndText
                icon={<UnknownIcon />}
                title={t('Unknown')}
                className="pf-v5-l-flex__item"
              />
            )}
          </div>
        </DRInformationGroup>
      )}
    </>
  );
};

export const ManagePolicyView: React.FC<ManagePolicyViewProps> = ({
  drInfo,
  workloadNamespace,
  eligiblePolicies,
  isSubscriptionAppType,
  unProtectedPlacementCount,
  modalActionContext,
  loaded,
  loadError,
  dispatch,
  setModalContext,
  setModalActionContext,
}) => {
  const { t } = useCustomTranslation();
  const [localModalActionContext, setLocalModalActionContext] =
    React.useState<ModalActionContext>(null);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const actionContext = localModalActionContext ?? modalActionContext;
  const alertProps = getMessage(t, errorMessage)?.[actionContext];

  if (_.isEmpty(drInfo)) {
    return (
      <ManagePolicyEmptyPage
        eligiblePolicies={eligiblePolicies}
        workloadNamespace={workloadNamespace}
        policyInfoLoaded={loaded}
        policyInfoLoadError={loadError}
        onClick={() => {
          setModalActionContext(ModalActionContext.ENABLE_DR_PROTECTION);
          setModalContext(ModalViewContext.ASSIGN_POLICY_VIEW);
        }}
      />
    );
  }

  // To protect new subscription group(s)
  const onEdit = () => {
    // Set already assigned policy as default
    dispatch({
      type: ManagePolicyStateType.SET_SELECTED_POLICY,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: drInfo.drPolicyInfo,
    });
    // Change assign policy view to edit mode
    setModalActionContext(ModalActionContext.EDIT_DR_PROTECTION);
    // Switch to assign policy view
    setModalContext(ModalViewContext.ASSIGN_POLICY_VIEW);
  };

  const onRemove = async () => {
    setInProgress(true);
    await Promise.all(
      doNotDeletePVCAnnotationPromises(drInfo.placementControlInfo)
    )
      .then(() =>
        // Delete DRPC after adding the PVC annotation successfully
        Promise.all(unAssignPromises(drInfo.placementControlInfo))
          .then(() =>
            setLocalModalActionContext(
              ModalActionContext.DISABLE_DR_PROTECTION_SUCCEEDED
            )
          )
          .catch((error) => {
            setLocalModalActionContext(
              ModalActionContext.DISABLE_DR_PROTECTION_FAILED
            );
            setErrorMessage(getErrorMessage(error) || error);
          })
      )
      .catch((error) => {
        setLocalModalActionContext(
          ModalActionContext.DISABLE_DR_PROTECTION_FAILED
        );
        setErrorMessage(getErrorMessage(error) || error);
      });
    setInProgress(false);
  };

  return (
    <>
      <ModalBody>
        <DRInformation
          dataPolicyInfo={drInfo}
          hideEditAction={!isSubscriptionAppType || !unProtectedPlacementCount}
          onEdit={onEdit}
        />
        {!!alertProps && (
          <Alert title={alertProps.title} variant={alertProps.variant} isInline>
            {alertProps.description}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        {actionContext !== ModalActionContext.DISABLE_DR_PROTECTION && (
          <Button
            id="disable-dr-action"
            variant={ButtonVariant.secondary}
            isDanger
            isDisabled={isDRProtectionRemoved(drInfo.placementControlInfo)}
            onClick={() =>
              setLocalModalActionContext(
                ModalActionContext.DISABLE_DR_PROTECTION
              )
            }
          >
            {t('Remove disaster recovery')}
          </Button>
        )}
        {actionContext === ModalActionContext.DISABLE_DR_PROTECTION && (
          <>
            <Button
              id="cancel-disable-dr-action"
              variant={ButtonVariant.secondary}
              onClick={() => setLocalModalActionContext(null)}
            >
              {t('Cancel')}
            </Button>
            <Button
              id="confirm-disable-dr-action"
              variant={ButtonVariant.danger}
              onClick={onRemove}
              isLoading={inProgress}
            >
              {t('Confirm remove')}
            </Button>
          </>
        )}
      </ModalFooter>
    </>
  );
};

type ManagePolicyViewProps = {
  drInfo: DRInfoType;
  workloadNamespace: string;
  eligiblePolicies: DRPolicyType[];
  isSubscriptionAppType: boolean;
  unProtectedPlacementCount: number;
  modalActionContext: ModalActionContext;
  loaded: boolean;
  loadError: any;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  setModalContext: (modalViewContext: ModalViewContext) => void;
  setModalActionContext: (modalActionContext: ModalActionContext) => void;
};

type DRInformationProps = {
  dataPolicyInfo: DRInfoType;
  hideEditAction: boolean;
  onEdit: () => void;
};

type DRInformationGroupProps = {
  title: string;
  action?: {
    actionText: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  divider?: boolean;
  children?: React.ReactNode;
};

type ManagePolicyEmptyPageProps = {
  workloadNamespace: string;
  eligiblePolicies: DRPolicyType[];
  policyInfoLoaded: boolean;
  policyInfoLoadError: any;
  onClick: () => void;
};

type AggregatedDRInfo = {
  placements: string[];
  pvcSelector: string[];
  lastGroupSyncTime: string;
  assignedOn: string;
};

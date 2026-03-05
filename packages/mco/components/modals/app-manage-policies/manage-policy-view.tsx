import * as React from 'react';
import { DRPolicyKind, DRPlacementControlKind } from '@odf/mco/types';
import { getDRPolicyStatus, parseSyncInterval } from '@odf/mco/utils';
import { formatTime, getLatestDate } from '@odf/shared/details-page/datetime';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { StatusBox } from '@odf/shared/generic/status-box';
import { Labels } from '@odf/shared/labels';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { getAnnotations, getName } from '@odf/shared/selectors';
import { BlueInfoCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import {
  GreenCheckCircleIcon,
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
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import {
  PencilAltIcon,
  UnknownIcon,
  BanIcon,
  ArrowRightIcon,
} from '@patternfly/react-icons';
import {
  DISCOVERED_APP_NS,
  DRApplication,
  IS_CG_ENABLED_ANNOTATION,
  ReplicationType,
  SYNC_SCHEDULE_DISPLAY_TEXT,
  VM_RECIPE_NAME,
} from '../../../constants';
import { getDRPlacementControlResourceObj } from '../../../hooks';
import { unAssignPromises } from './utils/k8s-utils';
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
  ModalType,
} from './utils/types';
import './style.scss';

const displayUnknown = (t: TFunction) => (
  <StatusIconAndText
    icon={<UnknownIcon />}
    title={t('Unknown')}
    className="pf-v6-l-flex__item"
  />
);

const replicationStatus = (label: string, time: string, t: TFunction) => (
  <Content component={ContentVariants.p} className="pf-v6-l-flex__item">
    <div className="pf-v6-l-flex">
      {label}{' '}
      {time ? (
        t('Last synced on {{syncTime}}', { syncTime: formatTime(time) })
      ) : (
        <>
          &nbsp;
          {displayUnknown(t)}
        </>
      )}
    </div>
  </Content>
);
enum EmptyPageContentType {
  NamespaceProtected = 'NamespaceProtected',
  Application = 'Application',
  VirtualMachine = 'VirtualMachine',
}

// Map containing content for each type
const getEmptyPageContentMap = (t: TFunction) => ({
  [EmptyPageContentType.NamespaceProtected]: {
    title: t('Application already enrolled in disaster recovery'),
    content: (
      <Trans t={t}>
        <p>
          This managed application namespace is already DR protected. You may
          have protected this namespace while enrolling discovered applications.
        </p>
        <p className="pf-v6-u-mt-md">
          To see disaster recovery information for your applications, go to
          <strong> Protected applications </strong> under&nbsp;
          <strong> Disaster Recovery </strong>.
        </p>
      </Trans>
    ),
    buttonText: '',
  },
  [EmptyPageContentType.Application]: {
    title: t('No assigned disaster recovery policy found'),
    content: (
      <Trans t={t}>
        <p>
          You have not enrolled this application yet. To protect your
          application, click&nbsp;
          <strong>Enroll application.</strong>
        </p>
      </Trans>
    ),
    buttonText: t('Enroll application'),
  },
  [EmptyPageContentType.VirtualMachine]: {
    title: t('No assigned disaster recovery policy found'),
    content: (
      <Trans t={t}>
        <p>
          You have not enrolled this virtual machine yet. To protect your
          virtual machine, click&nbsp;
          <strong>Enroll virtual machine.</strong>
        </p>
      </Trans>
    ),
    buttonText: t('Enroll virtual machine'),
  },
});

const isDRProtectionRemoved = (drpcs: DRPlacementControlType[]) =>
  drpcs.every((drpc) => _.has(drpc.metadata, 'deletionTimestamp'));

const checkNamespaceProtected = (
  workloadNamespace: string,
  eligiblePolicies: DRPolicyKind[],
  drpcs: DRPlacementControlKind[]
): boolean =>
  drpcs?.some((drpc) => {
    const isNamespaceProtected =
      drpc.spec?.protectedNamespaces?.includes(workloadNamespace) &&
      drpc.spec?.kubeObjectProtection?.recipeRef?.name !== VM_RECIPE_NAME;
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
      lastKubeObjectProtectionTime:
        drpc?.lastKubeObjectProtectionTime || acc.lastKubeObjectProtectionTime,
      recipeName: drpc?.recipeName || acc.recipeName,
      recipeNamespace: drpc?.recipeNamespace || acc.recipeNamespace,
      isVolumeGroupReplicationEnabled:
        acc.isVolumeGroupReplicationEnabled ||
        getAnnotations(drpc)?.[IS_CG_ENABLED_ANNOTATION] === 'true' ||
        !_.isEmpty(drpc?.status?.resourceConditions?.resourceMeta?.pvcgroups),
    }),
    {
      placements: [],
      pvcSelector: [],
      lastGroupSyncTime: '',
      assignedOn: '',
      recipeName: '',
      recipeNamespace: '',
      lastKubeObjectProtectionTime: '',
      isVolumeGroupReplicationEnabled: false,
    }
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
  modalType,
  appType,
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

  // Determine the correct type dynamically
  const emptyPageContentType: EmptyPageContentType = isNamespaceProtected
    ? EmptyPageContentType.NamespaceProtected
    : modalType === ModalType.VirtualMachine
      ? EmptyPageContentType.VirtualMachine
      : EmptyPageContentType.Application;

  const { title, content, buttonText } =
    getEmptyPageContentMap(t)[emptyPageContentType];

  const allLoaded = policyInfoLoaded && loaded;
  const anyLoadError = policyInfoLoadError || loadError;

  return allLoaded && !anyLoadError ? (
    <>
      {appType === DRApplication.SUBSCRIPTION && (
        <Alert
          variant={AlertVariant.warning}
          isInline
          title={t('Subscription deprecated')}
          data-test="subscription-deprecation-warning"
        >
          {t('All processes that use application subscription is deprecated')}
        </Alert>
      )}
      <EmptyPage
        isLoaded={allLoaded}
        canAccess={true}
        isDisabled={isNamespaceProtected}
        EmptyIcon={BlueInfoCircleIcon}
        onClick={onClick}
        buttonText={buttonText}
        title={title}
      >
        {content}
      </EmptyPage>
    </>
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
    <div className="pf-v6-u-mb-md">
      <div className="pf-v6-l-flex">
        <Content component={ContentVariants.h4} className="pf-v6-l-flex__item">
          {title}
        </Content>
        {!!action && (
          <Button
            variant={ButtonVariant.link}
            icon={action.icon}
            onClick={action.onClick}
            className="pf-v6-l-flex__item pf-m-align-right"
          >
            {action.actionText}
          </Button>
        )}
      </div>
      {children}
      {divider && <Divider className="pf-v6-u-mt-md" />}
    </div>
  );
};

const DRInformation: React.FC<DRInformationProps> = ({
  dataPolicyInfo,
  hideEditAction,
  onEdit,
  appType,
  setModalContext,
}) => {
  const { t } = useCustomTranslation();
  const { drPolicyInfo, placementControlInfo } = dataPolicyInfo;
  const { isValidated, replicationType, schedulingInterval, drClusters } =
    drPolicyInfo;
  const isAsync = replicationType === ReplicationType.ASYNC;
  const [unit, interval] = parseSyncInterval(schedulingInterval);
  const {
    placements,
    pvcSelector,
    lastGroupSyncTime,
    assignedOn,
    lastKubeObjectProtectionTime,
    recipeName,
    recipeNamespace,
    isVolumeGroupReplicationEnabled,
  } = getAggregatedDRInfo(placementControlInfo);

  return (
    <>
      <DRInformationGroup title={t('Disaster recovery policy details')} divider>
        <Content component={ContentVariants.p}>
          {t('Name: {{name}} ({{status}})', {
            name: getName(drPolicyInfo),
            status: getDRPolicyStatus(isValidated, t),
          })}
        </Content>
        <Content component={ContentVariants.p}>
          {isAsync
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
        </Content>
        <Content component={ContentVariants.p}>
          {t('Cluster: {{clusters}}', { clusters: drClusters.join(', ') })}
        </Content>
        <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
          {t('Assigned on: {{assignedOn}}', { assignedOn })}
        </Content>
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
        <Content component={ContentVariants.p}>
          {t('Placement: {{placements}}', {
            placements: placements.join(', '),
          })}
        </Content>
        {appType !== DRApplication.DISCOVERED ? (
          <>
            <Content component={ContentVariants.p}>
              {t('Label selector:')}
            </Content>
            <Labels labels={pvcSelector} numLabels={4} />
          </>
        ) : (
          <>
            <Content component={ContentVariants.p}>
              {t('Recipe name: {{recipeName}}', {
                recipeName,
              })}
            </Content>
            <Content component={ContentVariants.p}>
              {t('Recipe namespace: {{recipeNamespace}}', {
                recipeNamespace,
              })}
            </Content>
          </>
        )}
        <VolumeGroupReplicationStatus
          isEnabled={isVolumeGroupReplicationEnabled}
          setModalContext={setModalContext}
        />
      </DRInformationGroup>
      {(isAsync || appType === DRApplication.DISCOVERED) && (
        <DRInformationGroup title={t('Replication details')}>
          {isAsync && replicationStatus(t('Volume:'), lastGroupSyncTime, t)}
          {replicationStatus(
            t('Kubernetes object:'),
            lastKubeObjectProtectionTime,
            t
          )}
        </DRInformationGroup>
      )}
    </>
  );
};

const VolumeGroupReplicationStatus: React.FC<VolumeReplicationStatusProps> = ({
  isEnabled,
  setModalContext,
}) => {
  const { t } = useCustomTranslation();
  return (
    <div className="pf-v6-l-flex">
      <Content component={ContentVariants.p} className="pf-v6-l-flex__item">
        {t('Volume group replication: ')}
      </Content>
      <StatusIconAndText
        icon={isEnabled ? <GreenCheckCircleIcon /> : <BanIcon />}
        title={isEnabled ? t('Enabled') : t('Disabled')}
        className="pf-v6-l-flex__item"
      />
      {isEnabled && (
        <Button
          icon={<ArrowRightIcon />}
          variant={ButtonVariant.link}
          onClick={() =>
            setModalContext(ModalViewContext.VOLUME_CONSISTENCY_GROUP_VIEW)
          }
          className="pf-v6-l-flex__item pf-m-align-right"
        >
          {t('View volume groups')}
        </Button>
      )}
    </div>
  );
};

export const ManagePolicyView: React.FC<ManagePolicyViewProps> = ({
  drInfo,
  workloadNamespace,
  eligiblePolicies,
  appType,
  unprotectedPlacementCount,
  modalActionContext,
  loaded,
  loadError,
  dispatch,
  setModalContext,
  setModalActionContext,
  modalType,
  appName,
  discoveredVMPVCs,
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
        modalType={modalType}
        appType={appType}
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
    try {
      setInProgress(true);
      await unAssignPromises(
        drInfo.placementControlInfo,
        appName,
        workloadNamespace,
        appType,
        t,
        discoveredVMPVCs
      );
      setLocalModalActionContext(
        ModalActionContext.DISABLE_DR_PROTECTION_SUCCEEDED
      );
    } catch (error) {
      setLocalModalActionContext(
        ModalActionContext.DISABLE_DR_PROTECTION_FAILED
      );
      setErrorMessage(getErrorMessage(error) || error);
    } finally {
      setInProgress(false);
    }
  };

  return (
    <>
      <ModalBody>
        <DRInformation
          dataPolicyInfo={drInfo}
          hideEditAction={
            appType !== DRApplication.SUBSCRIPTION || !unprotectedPlacementCount
          }
          onEdit={onEdit}
          appType={appType}
          setModalContext={setModalContext}
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
            isDisabled={
              actionContext ===
                ModalActionContext.DISABLE_DR_PROTECTION_SUCCEEDED ||
              isDRProtectionRemoved(drInfo.placementControlInfo)
            }
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
  appType: DRApplication;
  unprotectedPlacementCount: number;
  modalActionContext: ModalActionContext;
  loaded: boolean;
  loadError: any;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  setModalContext: (modalViewContext: ModalViewContext) => void;
  setModalActionContext: (modalActionContext: ModalActionContext) => void;
  modalType: ModalType;
  appName: string;
  discoveredVMPVCs: string[];
};

type DRInformationProps = {
  dataPolicyInfo: DRInfoType;
  hideEditAction: boolean;
  onEdit: () => void;
  appType: DRApplication;
  setModalContext: (modalViewContext: ModalViewContext) => void;
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
  modalType: ModalType;
  appType?: DRApplication;
};

type AggregatedDRInfo = {
  placements: string[];
  pvcSelector: string[];
  lastGroupSyncTime: string;
  assignedOn: string;
  lastKubeObjectProtectionTime?: string;
  recipeName?: string;
  recipeNamespace?: string;
  isVolumeGroupReplicationEnabled?: boolean;
};

type VolumeReplicationStatusProps = {
  isEnabled: boolean;
  setModalContext: (modalViewContext: ModalViewContext) => void;
};

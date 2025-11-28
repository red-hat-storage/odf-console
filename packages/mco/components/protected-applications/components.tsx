import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { getPrimaryClusterName } from '@odf/mco/utils';
import { DRPlacementControlModel, getName, getNamespace } from '@odf/shared';
import {
  ActionDropdown,
  ToggleVariant,
} from '@odf/shared/dropdown/action-dropdown';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { NamespaceModel } from '@odf/shared/models';
import { ResourceNameWIcon } from '@odf/shared/resource-link/resource-link';
import { PopoverStatus, StatusIconAndText } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  useK8sWatchResources,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import classNames from 'classnames';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Alert,
  AlertProps,
  Bullseye,
  Button,
  ButtonVariant,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Modal,
  ModalVariant,
  DescriptionList as PFDescriptionList,
  PopoverPosition,
  Text,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  DR_BASE_ROUTE,
  ENROLLED_APP_QUERY_PARAMS_KEY,
  ReplicationType,
} from '../../constants';
import { DRPlacementControlKind } from '../../types';
import { getCurrentActivity } from '../mco-dashboard/disaster-recovery/cluster-app-card/application';
import {
  buildMCVResource,
  ConsistencyGroupInfo,
  ConsistencyGroupsContent,
  extractConsistencyGroups,
  getMCVName,
} from '../modals/app-manage-policies/helper/consistency-groups';
import './protected-apps.scss';
import {
  EnrollApplicationTypes,
  getAlertMessages,
  getEnrollDropdownItems,
  isCleanupPending,
  isFailingOrRelocating,
  replicationHealthMap,
  SyncStatusInfo,
} from './utils';

type SelectExpandableProps = {
  title: React.ReactNode;
  tooltipContent: string;
  onSelect: (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    buttonRef: React.MutableRefObject<HTMLElement>
  ) => void;
  buttonId: ExpandableComponentType;
  className?: string;
};

type DescriptionProps = {
  term: string;
  descriptions: string[] | React.ReactNode[];
};

type DescriptionListProps = { columnModifier?: '1Col' | '2Col' | '3Col' };

const DescriptionList: React.FC<DescriptionListProps> = ({
  columnModifier,
  children,
}) => {
  return (
    <PFDescriptionList
      columnModifier={{
        default: columnModifier || '1Col',
      }}
      className="mco-protected-applications__description"
      isCompact
    >
      {children}
    </PFDescriptionList>
  );
};

const Description: React.FC<DescriptionProps> = ({ term, descriptions }) => {
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{term}</DescriptionListTerm>
      {descriptions.map((description) => (
        <DescriptionListDescription>{description}</DescriptionListDescription>
      ))}
    </DescriptionListGroup>
  );
};

const EnrollApplicationNoDataButton: React.FC = () => (
  <EnrollApplicationButton isNoDataMessage />
);

const ManagedApplicationsModalLazy = React.lazy(
  () => import('../modals/protected-applications/managed-applications-modal')
);

export const EnrollApplicationButton: React.FC<{
  isNoDataMessage?: boolean;
  toggleVariant?: ToggleVariant;
}> = ({ isNoDataMessage, toggleVariant }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const launcher = useModal();

  return (
    <div
      className={classNames({
        'pf-v5-u-display-flex pf-v5-u-flex-direction-column pf-v5-u-flex-direction-row-on-lg mco-protected-applications__popover':
          !isNoDataMessage,
      })}
    >
      <div className="pf-v5-u-ml-md pf-v5-u-mt-md">
        <ActionDropdown
          id="enroll-application-types"
          aria-label={t('Enroll application')}
          text={t('Enroll application')}
          toggleVariant={toggleVariant || 'primary'}
          onSelect={(id: EnrollApplicationTypes) => {
            id === EnrollApplicationTypes.DISCOVERED &&
              navigate(
                `${DR_BASE_ROUTE}/protected-applications/${referenceForModel(
                  DRPlacementControlModel
                )}/~new`
              );
            id === EnrollApplicationTypes.MANAGED &&
              launcher(ManagedApplicationsModalLazy, { isOpen: true });
          }}
          dropdownItems={getEnrollDropdownItems(t)}
        />
      </div>
      <PopoverStatus
        statusBody={
          <div
            className={classNames({
              'pf-v5-u-ml-md': true,
              'pf-v5-u-mt-md': isNoDataMessage,
            })}
          >
            <OutlinedQuestionCircleIcon className="pf-v5-u-mr-sm" />
            {t('Application types and their enrollment processes')}
          </div>
        }
        title={t('Application types and their enrollment processes')}
        popoverPosition={PopoverPosition.bottom}
      >
        <Trans t={t}>
          <p className="co-break-word pf-v5-u-font-weight-bold">
            ACM discovered applications:
          </p>
          <p className="co-break-word pf-v5-u-mb-sm">
            Based on modular and microservices architecture, uses operators for
            dynamically created kubernetes objects. Eg:{' '}
            <span className="pf-v5-u-font-weight-bold">
              CloudPak, Custom-created applications
            </span>
          </p>
          <p className="co-break-word pf-v5-u-mb-md">
            <span className="pf-v5-u-font-weight-bold">
              Enrollment process:
            </span>{' '}
            Discovered applications are enrolled under disaster recovery through
            enabling protection for their namespaces and further defining the
            scope of this protection within namespace through recipe selection
            or resource label.
          </p>

          <p className="co-break-word pf-v5-u-font-weight-bold">
            ACM managed applications:
          </p>
          <p className="co-break-word pf-v5-u-mb-sm">
            Based on subscribing to one or more Kubernetes resource repositories
            (channel resource) that contains resources that are deployed on
            managed clusters. Eg:{' '}
            <span className="pf-v5-u-font-weight-bold">
              ApplicationSet, Subscriptions
            </span>
          </p>
          <p className="co-break-word">
            <span className="pf-v5-u-font-weight-bold">
              Enrollment process:
            </span>{' '}
            Individually protect managed application with flexibility for
            distinct configurations for different sub-categories of managed
            application based on specific requirements.
          </p>
        </Trans>
      </PopoverStatus>
    </div>
  );
};

export const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="pf-v5-u-mt-xl">
      {t('No protected discovered applications found')}
    </Bullseye>
  );
};

export const NoDataMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyPage
      title={t('Looks like there are no applications here.')}
      ButtonComponent={EnrollApplicationNoDataButton}
      isLoaded
      canAccess
    >
      <Trans t={t}>
        <p>
          You do not have any <strong>discovered applications</strong> that are
          protected yet. For details about your{' '}
          <strong>protected managed applications</strong>, navigate to the{' '}
          <strong>Applications</strong> page, as this information is not
          maintained here.
        </p>
        <br />
        <p>
          Click <strong>Enroll applications</strong> to add disaster recovery
          protection to your applications.
        </p>
      </Trans>
    </EmptyPage>
  );
};

export const AlertMessages: React.FC = () => {
  const { t } = useCustomTranslation();

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const recentlyEnrolledApp = params.get(ENROLLED_APP_QUERY_PARAMS_KEY) ?? '';
  const messages: AlertProps[] = getAlertMessages(
    t,
    recentlyEnrolledApp,
    navigate
  );

  return (
    <>
      {messages.map((message) => (
        <Alert
          variant={message.variant}
          title={message.title}
          key={message.key}
          className="pf-v5-u-mt-xs pf-v5-u-mb-xs"
          {...(message?.isInline ? { isInline: message.isInline } : {})}
          {...(message?.actionClose
            ? { actionClose: message.actionClose }
            : {})}
        />
      ))}
    </>
  );
};

export const SelectExpandable: React.FC<SelectExpandableProps> = ({
  title,
  tooltipContent,
  onSelect,
  buttonId,
  className,
}) => {
  const buttonRef = React.useRef<HTMLElement>();
  return (
    <Tooltip content={tooltipContent}>
      <Button
        ref={buttonRef}
        variant={ButtonVariant.link}
        onClick={(event) => onSelect(event, buttonRef)}
        id={buttonId}
        className={className}
        isInline
      >
        {title}
      </Button>
    </Tooltip>
  );
};

export enum ExpandableComponentType {
  DEFAULT = '',
  NS = 'namespaces',
  EVENTS = 'events',
  STATUS = 'status',
}

export type SyncStatus = { [appName: string]: SyncStatusInfo };

export type ExpandableComponentProps = {
  application?: DRPlacementControlKind;
  syncStatusInfo?: SyncStatusInfo;
};

const ConsistencyGroupsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  consistencyGroups: ConsistencyGroupInfo[];
  description: React.ReactNode;
  loaded: boolean;
  loadError: any;
}> = ({
  isOpen,
  onClose,
  consistencyGroups,
  description,
  loaded,
  loadError,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Modal
      variant={ModalVariant.large}
      title={t('Manage disaster recovery')}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        <Button key="close" variant={ButtonVariant.primary} onClick={onClose}>
          {t('Close')}
        </Button>,
      ]}
    >
      <ConsistencyGroupsContent
        consistencyGroups={consistencyGroups}
        loaded={loaded}
        loadError={loadError}
      />
    </Modal>
  );
};

export const NamespacesDetails: React.FC<ExpandableComponentProps> = ({
  application,
}) => {
  const { t } = useCustomTranslation();

  const clusterName = getPrimaryClusterName(application);
  const mcvName = getMCVName(application);

  const mcvResources: Record<string, WatchK8sResource> = {};
  mcvResources[mcvName] = buildMCVResource(clusterName, mcvName);
  const mcvs = useK8sWatchResources(mcvResources);
  const {
    loaded,
    loadError,
    data: consistencyGroups,
  } = extractConsistencyGroups(mcvs);

  const consistencyGroupsCount = consistencyGroups?.reduce((acc, group) => {
    const namespace = group.namespace;
    acc[namespace] = acc[namespace] ? acc[namespace] + 1 : 1;
    return acc;
  }, {});

  const [selectedNamespace, setSelectedNamespace] = React.useState<
    string | null
  >(null);
  const openModal = (namespace: string) => {
    setSelectedNamespace(namespace);
  };

  const closeModal = () => {
    setSelectedNamespace(null);
  };

  const applicationName = getName(application) ?? application?.['name'];
  const applicationNamespace =
    getNamespace(application) ?? application?.['namespace'];

  const description = (
    <Trans t={t}>
      <strong>Application:</strong> {applicationName} (Namespace:{' '}
      {applicationNamespace})
    </Trans>
  );

  const enrolledNamespaces: React.ReactNode[] =
    application.spec?.protectedNamespaces?.map((namespace: string) => (
      <div
        key={namespace}
        className="pf-v5-u-display-flex pf-v5-u-align-items-center"
      >
        <ResourceNameWIcon
          resourceModel={NamespaceModel}
          resourceName={namespace}
        />
        {consistencyGroupsCount?.[namespace] && (
          <>
            <Text className="pf-v5-u-ml-xl pf-v5-u-pl-md">
              {consistencyGroupsCount[namespace]}{' '}
              {pluralize(
                consistencyGroupsCount[namespace],
                t('Volume Consistency group'),
                t('Volume Consistency groups'),
                false
              )}
            </Text>
            <Button
              variant={ButtonVariant.link}
              aria-label={t('View details for {{namespace}}', { namespace })}
              onClick={() => openModal(namespace)}
            >
              {t('View all')}
            </Button>
          </>
        )}
      </div>
    )) || [];
  return (
    <>
      {!enrolledNamespaces.length ? (
        <DataUnavailableError className="pf-v5-u-pt-xl pf-v5-u-pb-xl" />
      ) : (
        <DescriptionList>
          <Description
            term={t('Namespace')}
            descriptions={enrolledNamespaces}
          />
        </DescriptionList>
      )}

      {selectedNamespace && (
        <ConsistencyGroupsModal
          isOpen={!!selectedNamespace}
          description={description}
          onClose={closeModal}
          consistencyGroups={consistencyGroups}
          loaded={loaded}
          loadError={loadError}
        />
      )}
    </>
  );
};

export const EventsDetails: React.FC<ExpandableComponentProps> = ({
  application,
  syncStatusInfo,
}) => {
  const { t } = useCustomTranslation();
  const anyOnGoingEvent =
    isFailingOrRelocating(application) || isCleanupPending(application);

  const activity = getCurrentActivity(
    application?.status?.phase,
    application.spec?.failoverCluster,
    application.spec?.preferredCluster,
    t,
    isCleanupPending(application),
    syncStatusInfo.volumeReplicationType
  );
  const status = [
    <StatusIconAndText icon={activity.icon} title={activity.status} />,
  ];
  return !anyOnGoingEvent ? (
    <DataUnavailableError className="pf-v5-u-pt-xl pf-v5-u-pb-xl" />
  ) : (
    <DescriptionList columnModifier={'2Col'}>
      <Description
        term={t('Activity description')}
        descriptions={[activity.description]}
      />
      <Description term={t('Status')} descriptions={status} />
    </DescriptionList>
  );
};

export const StatusDetails: React.FC<ExpandableComponentProps> = ({
  syncStatusInfo,
}) => {
  const { t } = useCustomTranslation();
  const syncType = [];
  const syncStatus = [];
  const lastSyncOn = [];

  if (syncStatusInfo.replicationType === ReplicationType.ASYNC) {
    syncType.push(t('Application volumes (PVCs)'));
    const { icon: volIcon, title: volTitle } = replicationHealthMap(
      syncStatusInfo.volumeReplicationStatus,
      t
    );
    syncStatus.push(
      <>
        {volIcon} {volTitle}
      </>
    );
    lastSyncOn.push(
      syncStatusInfo.volumeLastGroupSyncTime || (
        <Text className="text-muted">{t('No data available')}</Text>
      )
    );
  }

  syncType.push(t('Kubernetes objects'));
  const { icon: kubeIcon, title: kubeTitle } = replicationHealthMap(
    syncStatusInfo.kubeObjectReplicationStatus,
    t
  );
  syncStatus.push(
    <>
      {kubeIcon} {kubeTitle}
    </>
  );
  lastSyncOn.push(
    syncStatusInfo.kubeObjectLastProtectionTime || (
      <Text className="text-muted"> {t('No data available')}</Text>
    )
  );

  return (
    <DescriptionList columnModifier={'3Col'}>
      <Description term={t('Sync resource type')} descriptions={syncType} />
      <Description term={t('Sync status')} descriptions={syncStatus} />
      <Description term={t('Last synced on')} descriptions={lastSyncOn} />
    </DescriptionList>
  );
};

export const ExpandableComponentsMap = {
  [ExpandableComponentType.DEFAULT]: () => null,
  [ExpandableComponentType.NS]: NamespacesDetails,
  [ExpandableComponentType.EVENTS]: EventsDetails,
  [ExpandableComponentType.STATUS]: StatusDetails,
};

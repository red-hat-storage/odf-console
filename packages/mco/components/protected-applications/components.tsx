import * as React from 'react';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { NamespaceModel } from '@odf/shared/models';
import { ResourceNameWIcon } from '@odf/shared/resource-link/resource-link';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { K8sResourceCondition } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  Title,
  Bullseye,
  Alert,
  AlertProps,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { InfoCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { ENROLLED_APP_QUERY_PARAMS_KEY } from '../../constants';
import { DRPlacementControlKind } from '../../types';
import { getCurrentActivity } from '../mco-dashboard/disaster-recovery/cluster-app-card/application';
import {
  getAlertMessages,
  getErrorStates,
  isFailingOrRelocating,
  replicationHealthMap,
  SyncStatusInfo,
} from './utils';
import './protected-apps.scss';

type DescriptionProps = {
  term: string;
  descriptions: string[] | React.ReactNode[];
};

type DescriptionListProps_ = { columnModifier?: '1Col' | '2Col' | '3Col' };

const DescriptionList_: React.FC<DescriptionListProps_> = ({
  columnModifier,
  children,
}) => {
  return (
    <DescriptionList
      columnModifier={{
        default: columnModifier || '1Col',
      }}
      className="mco-protected-applications__description"
      isCompact
    >
      {children}
    </DescriptionList>
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

export const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Bullseye className="pf-u-mt-xl">
      {t('No protected applications found')}
    </Bullseye>
  );
};

export const NoDataMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyState variant={EmptyStateVariant.large}>
      <EmptyStateIcon icon={InfoCircleIcon} />
      <Title headingLevel="h3" size="lg">
        {t('No protected applications')}
      </Title>
      <EmptyStateBody>
        <Trans t={t}>
          You do not have any protected applications yet, to add disaster
          recovery protection to your applications start by clicking on the{' '}
          <strong>Enroll application</strong> button.
        </Trans>
      </EmptyStateBody>
    </EmptyState>
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
          className="pf-u-mt-xs pf-u-mb-xs"
          {...(message?.isInline ? { isInline: message.isInline } : {})}
          {...(message?.actionClose
            ? { actionClose: message.actionClose }
            : {})}
        />
      ))}
    </>
  );
};

export enum EXPANDABLE_COMPONENT_TYPE {
  DEFAULT = '',
  NS = 'namespaces',
  ERRORS = 'errors',
  EVENTS = 'events',
  STATUS = 'status',
}

export type SyncStatus = { [appName: string]: SyncStatusInfo };

export type ExpandableComponentProps = {
  application?: DRPlacementControlKind;
  filteredConditions?: K8sResourceCondition[];
  syncStatusInfo?: SyncStatusInfo;
};

export const NamespacesDetails: React.FC<ExpandableComponentProps> = ({
  application,
}) => {
  const { t } = useCustomTranslation();

  const enrolledNamespaces: React.ReactNode[] =
    // ToDo: Update with correct spec field which will report all protected namespaces
    // @ts-ignore
    application.spec?.enrolledNamespaces?.map((namespace: string) => (
      <ResourceNameWIcon
        resourceModel={NamespaceModel}
        resourceName={namespace}
      />
    )) || [];
  return (
    <>
      {!enrolledNamespaces.length ? (
        <DataUnavailableError className="pf-u-pt-xl pf-u-pb-xl" />
      ) : (
        <DescriptionList_>
          <Description
            term={t('Namespace')}
            descriptions={enrolledNamespaces}
          />
        </DescriptionList_>
      )}
    </>
  );
};

export const ErrorsDetails: React.FC<ExpandableComponentProps> = ({
  filteredConditions,
}) => {
  const { t } = useCustomTranslation();

  const errorStates = getErrorStates(filteredConditions).map((errorMessage) => (
    <>
      <RedExclamationCircleIcon size={'sm'} /> {errorMessage}
    </>
  ));
  return (
    <>
      {!filteredConditions.length ? (
        <DataUnavailableError className="pf-u-pt-xl pf-u-pb-xl" />
      ) : (
        <DescriptionList_>
          <Description
            term={t('Error description')}
            descriptions={errorStates}
          />
        </DescriptionList_>
      )}
    </>
  );
};

export const EventsDetails: React.FC<ExpandableComponentProps> = ({
  application,
}) => {
  const { t } = useCustomTranslation();

  // ToDo: Add clean-up activity event as well
  const activity = [
    getCurrentActivity(
      application?.status?.phase,
      application.spec?.failoverCluster,
      application.spec?.preferredCluster,
      t
    ),
  ];
  const status = [
    <>
      <InProgressIcon size={'sm'} /> {t('In progress')}
    </>,
  ];
  return (
    <>
      {!isFailingOrRelocating(application) ? (
        <DataUnavailableError className="pf-u-pt-xl pf-u-pb-xl" />
      ) : (
        <DescriptionList_ columnModifier={'2Col'}>
          <Description
            term={t('Activity description')}
            descriptions={activity}
          />
          <Description term={t('Status')} descriptions={status} />
        </DescriptionList_>
      )}
    </>
  );
};

export const StatusDetails: React.FC<ExpandableComponentProps> = ({
  syncStatusInfo,
}) => {
  const { t } = useCustomTranslation();

  const syncType = [t('Application volumes (PVCs)'), t('Kube objects')];
  const { icon: volIcon, title: volTitle } = replicationHealthMap(
    syncStatusInfo.volumeReplicationStatus,
    t
  );
  const { icon: kubeIcon, title: kubeTitle } = replicationHealthMap(
    syncStatusInfo.kubeObjectReplicationStatus,
    t
  );
  const syncStatus = [
    <>
      {volIcon} {volTitle}
    </>,
    <>
      {kubeIcon} {kubeTitle}
    </>,
  ];
  const lastSyncOn = [
    syncStatusInfo.volumeLastGroupSyncTime,
    syncStatusInfo.kubeObjectLastSyncTime,
  ];
  return (
    <DescriptionList_ columnModifier={'3Col'}>
      <Description term={t('Sync resource type')} descriptions={syncType} />
      <Description term={t('Sync status')} descriptions={syncStatus} />
      <Description term={t('Last synced on')} descriptions={lastSyncOn} />
    </DescriptionList_>
  );
};

export const ExpandableComponentsMap = {
  [EXPANDABLE_COMPONENT_TYPE.DEFAULT]: () => null,
  [EXPANDABLE_COMPONENT_TYPE.NS]: NamespacesDetails,
  [EXPANDABLE_COMPONENT_TYPE.ERRORS]: ErrorsDetails,
  [EXPANDABLE_COMPONENT_TYPE.EVENTS]: EventsDetails,
  [EXPANDABLE_COMPONENT_TYPE.STATUS]: StatusDetails,
};

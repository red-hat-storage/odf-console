import * as React from 'react';
import { PopoverStatus } from '@odf/shared';
import { ActionDropdown } from '@odf/shared/dropdown/action-dropdown';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { NamespaceModel } from '@odf/shared/models';
import { ResourceNameWIcon } from '@odf/shared/resource-link/resource-link';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Bullseye,
  Alert,
  AlertProps,
  Button,
  ButtonVariant,
  Tooltip,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  PopoverPosition,
} from '@patternfly/react-core';
import {
  InProgressIcon,
  OutlinedQuestionCircleIcon,
  IconSize,
} from '@patternfly/react-icons';
import { ENROLLED_APP_QUERY_PARAMS_KEY } from '../../constants';
import { DRPlacementControlModel } from '../../models';
import { DRPlacementControlKind } from '../../types';
import EmptyPage from '../empty-state-page/empty-page';
import { getCurrentActivity } from '../mco-dashboard/disaster-recovery/cluster-app-card/application';
import {
  getAlertMessages,
  isFailingOrRelocating,
  replicationHealthMap,
  SyncStatusInfo,
  EnrollApplicationTypes,
  getEnrollDropdownItems,
} from './utils';
import './protected-apps.scss';

type SelectExpandableProps = {
  title: React.ReactNode;
  tooltipContent: string;
  onSelect: (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    buttonRef: React.MutableRefObject<HTMLElement>
  ) => void;
  buttonId: EXPANDABLE_COMPONENT_TYPE;
  className?: string;
};

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

const EnrollApplicationButton_: React.FC = () => (
  <EnrollApplicationButton isNoDataMessage />
);

const ManagedApplicationsModalLazy = React.lazy(
  () => import('../modals/protected-applications/managed-applications-modal')
);

export const EnrollApplicationButton: React.FC<{ isNoDataMessage?: boolean }> =
  ({ isNoDataMessage }) => {
    const { t } = useCustomTranslation();
    const navigate = useNavigate();
    const launcher = useModal();

    return (
      <div
        className={classNames({
          'pf-u-display-flex pf-u-flex-direction-column pf-u-flex-direction-row-on-lg mco-protected-applications__popover':
            !isNoDataMessage,
        })}
      >
        <div className="pf-u-ml-md pf-u-mt-md">
          <ActionDropdown
            id="enroll-application-types"
            aria-label={t('Enroll application')}
            text={t('Enroll application')}
            toggleVariant={'primary'}
            onSelect={(id: EnrollApplicationTypes) => {
              id === EnrollApplicationTypes.DISCOVERED &&
                navigate(
                  `/multicloud/data-services/disaster-recovery/protected-applications/${referenceForModel(
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
                'pf-u-ml-md': true,
                'pf-u-mt-md': isNoDataMessage,
              })}
            >
              <OutlinedQuestionCircleIcon
                size={IconSize.sm}
                className="pf-u-mr-sm"
              />
              {t('Application types and their enrollment processes')}
            </div>
          }
          title={t('Application types and their enrollment processes')}
          popoverPosition={PopoverPosition.bottom}
        >
          <Trans t={t}>
            <p className="co-break-word pf-u-font-weight-bold">
              ACM discovered applications:
            </p>
            <p className="co-break-word pf-u-mb-sm">
              Based on modular and microservices architecture, uses operators
              for dynamically created kubernetes objects. Eg:{' '}
              <span className="pf-u-font-weight-bold">
                CloudPak, Custom-created applications
              </span>
            </p>
            <p className="co-break-word pf-u-mb-md">
              <span className="pf-u-font-weight-bold">Enrollment process:</span>{' '}
              Discovered applications are enrolled under disaster recovery
              through enabling protection for their namespaces and further
              defining the scope of this protection within namespace through
              recipe selection or resource label.
            </p>

            <p className="co-break-word pf-u-font-weight-bold">
              ACM managed applications:
            </p>
            <p className="co-break-word pf-u-mb-sm">
              Based on subscribing to one or more Kubernetes resource
              repositories (channel resource) that contains resources that are
              deployed on managed clusters. Eg:{' '}
              <span className="pf-u-font-weight-bold">
                ApplicationSet, Subscriptions
              </span>
            </p>
            <p className="co-break-word">
              <span className="pf-u-font-weight-bold">Enrollment process:</span>{' '}
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
    <Bullseye className="pf-u-mt-xl">
      {t('No protected applications found')}
    </Bullseye>
  );
};

export const NoDataMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyPage
      title={t('No protected applications')}
      ButtonComponent={EnrollApplicationButton_}
      isLoaded
      canAccess
    >
      <Trans t={t}>
        You do not have any protected applications yet, to add disaster recovery
        protection to your applications start by clicking on the{' '}
        <strong>Enroll application</strong> button.
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

export enum EXPANDABLE_COMPONENT_TYPE {
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
      <InProgressIcon size={IconSize.sm} /> {t('In progress')}
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
  [EXPANDABLE_COMPONENT_TYPE.EVENTS]: EventsDetails,
  [EXPANDABLE_COMPONENT_TYPE.STATUS]: StatusDetails,
};

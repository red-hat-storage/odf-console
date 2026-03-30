import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { DRPlacementControlModel, getName, getNamespace } from '@odf/shared';
import {
  ActionDropdown,
  ToggleVariant,
} from '@odf/shared/dropdown/action-dropdown';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { NamespaceModel } from '@odf/shared/models';
import { ResourceNameWIcon } from '@odf/shared/resource-link/resource-link';
import { PopoverStatus } from '@odf/shared/status';
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
  Grid,
  GridItem,
  Modal,
  ModalVariant,
  PopoverPosition,
  Text,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DR_BASE_ROUTE, ENROLLED_APP_QUERY_PARAMS_KEY } from '../../constants';
import { getPrimaryCluster } from '../../utils';
import {
  buildMCVResource,
  ConsistencyGroupInfo,
  ConsistencyGroupsContent,
  extractConsistencyGroups,
} from '../modals/app-manage-policies/helper/consistency-groups';
import {
  FAILED_OVER_APP_QUERY_PARAM,
  FAILED_OVER_CLUSTER_QUERY_PARAM,
  RELOCATED_APP_QUERY_PARAM,
  RELOCATED_CLUSTER_QUERY_PARAM,
} from './dr-operation-alert-helper';
import './protected-apps.scss';
import {
  EnrollApplicationTypes,
  getAlertMessages,
  getEnrollDropdownItems,
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
      {t('No protected applications found')}
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
  const relocatedApp = params.get(RELOCATED_APP_QUERY_PARAM) ?? '';
  const relocatedCluster = params.get(RELOCATED_CLUSTER_QUERY_PARAM) ?? '';
  const failedOverApp = params.get(FAILED_OVER_APP_QUERY_PARAM) ?? '';
  const failedOverCluster = params.get(FAILED_OVER_CLUSTER_QUERY_PARAM) ?? '';

  const messages: AlertProps[] = getAlertMessages(
    t,
    recentlyEnrolledApp,
    navigate,
    relocatedApp,
    relocatedCluster,
    failedOverApp,
    failedOverCluster
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
        >
          {message.children}
        </Alert>
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
}

export type SyncStatus = { [appName: string]: SyncStatusInfo };

export type ExpandableComponentProps = {
  view?: ProtectedApplicationViewKind;
  syncStatusInfo?: SyncStatusInfo;
  mcvName?: string;
};

export const NamespacesDetails: React.FC<ExpandableComponentProps> = ({
  view,
  mcvName,
}) => {
  const { t } = useCustomTranslation();

  const applicationType = view?.status?.applicationInfo?.type;
  const isDiscovered = applicationType === 'Discovered';
  const clusterName = view ? getPrimaryCluster(view) : '';
  const destinationNamespace =
    !isDiscovered && view?.status?.applicationInfo?.destinationNamespace;
  const enrolledNamespaces = view?.status?.drInfo?.protectedNamespaces || [];
  const namespaces = isDiscovered
    ? enrolledNamespaces
    : destinationNamespace
      ? [destinationNamespace]
      : [];

  const mcvResources: Record<string, WatchK8sResource> = {};
  if (clusterName && mcvName) {
    mcvResources[mcvName] = buildMCVResource(clusterName, mcvName);
  }
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

  if (!view) {
    return <DataUnavailableError className="pf-v5-u-pt-xl pf-v5-u-pb-xl" />;
  }

  const hasData = applicationType && namespaces.length > 0;

  if (!hasData) {
    return <DataUnavailableError className="pf-v5-u-pt-xl pf-v5-u-pb-xl" />;
  }

  const applicationName = getName(view);
  const applicationNamespace = getNamespace(view);

  const description = (
    <Trans t={t}>
      <strong>Application:</strong> {applicationName} (Namespace:{' '}
      {applicationNamespace})
    </Trans>
  );

  return (
    <>
      <Grid hasGutter>
        <GridItem span={3} className="pf-v5-u-text-align-center">
          <Text component="h6" className="pf-v5-u-font-weight-bold">
            {t('Application type')}
          </Text>
        </GridItem>
        <GridItem span={6} className="pf-v5-u-text-align-center">
          <Text component="h6" className="pf-v5-u-font-weight-bold">
            {isDiscovered
              ? t('Protected namespaces')
              : t('Destination namespace')}
          </Text>
        </GridItem>
        <GridItem span={3} className="pf-v5-u-text-align-center">
          <Text component="h6" className="pf-v5-u-font-weight-bold">
            {t('Volume Consistency groups')}
          </Text>
        </GridItem>

        <GridItem span={3} className="pf-v5-u-text-align-center">
          <Text>{applicationType}</Text>
        </GridItem>
        <GridItem
          span={6}
          className="pf-v5-u-text-align-center pf-v5-u-mx-auto"
        >
          {namespaces.map((namespace: string) => (
            <div key={namespace} className="pf-v5-u-mb-sm">
              <ResourceNameWIcon
                resourceModel={NamespaceModel}
                resourceName={namespace}
              />
            </div>
          ))}
        </GridItem>
        <GridItem span={3} className="pf-v5-u-text-align-center">
          {namespaces.map((namespace: string) => (
            <div key={namespace} className="pf-v5-u-mb-sm">
              {consistencyGroupsCount?.[namespace] ? (
                <Button
                  variant={ButtonVariant.link}
                  aria-label={t(`View details for ${namespace}`, {
                    namespace,
                  })}
                  onClick={() => openModal(namespace)}
                  isInline
                >
                  {consistencyGroupsCount[namespace]}
                </Button>
              ) : (
                <Text className="pf-v5-u-color-200">-</Text>
              )}
            </div>
          ))}
        </GridItem>
      </Grid>

      {selectedNamespace && (
        <ConsistencyGroupsModal
          isOpen={!!selectedNamespace}
          description={description}
          onClose={closeModal}
          consistencyGroups={consistencyGroups.filter(
            (group) => group.namespace === selectedNamespace
          )}
          loaded={loaded}
          loadError={loadError}
        />
      )}
    </>
  );
};

type ConsistencyGroupsModalProps = {
  isOpen: boolean;
  description: React.ReactNode;
  onClose: () => void;
  consistencyGroups: ConsistencyGroupInfo[];
  loaded: boolean;
  loadError: any;
};

const ConsistencyGroupsModal: React.FC<ConsistencyGroupsModalProps> = ({
  isOpen,
  description,
  onClose,
  consistencyGroups,
  loaded,
  loadError,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Modal
      variant={ModalVariant.medium}
      title={t('Volume consistency groups')}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
      aria-label={t('Volume consistency groups modal')}
    >
      <ConsistencyGroupsContent
        consistencyGroups={consistencyGroups}
        loaded={loaded}
        loadError={loadError}
      />
    </Modal>
  );
};

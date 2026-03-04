import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { DRPlacementControlModel } from '@odf/shared';
import { ActionDropdownItems } from '@odf/shared/dropdown/action-dropdown';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  GrayUnknownIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { sortRows, referenceForModel } from '@odf/shared/utils';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { NavigateFunction } from 'react-router-dom-v5-compat';
import {
  AlertProps,
  AlertVariant,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { IAction } from '@patternfly/react-table';
import {
  VolumeReplicationHealth,
  DR_BASE_ROUTE,
  DRActionType,
  ReplicationType,
  ApplicationType,
} from '../../constants';
import { DRPlacementControlKind, Progression, Phase } from '../../types';
import { DRPlacementControlParser } from '../modals/app-failover-relocate/parser/discovered-application-parser';
import { AppManagePoliciesModalWrapper } from '../modals/protected-applications/app-manage-policies-modal-wrapper';
import { ApplicationActionModal } from '../modals/protected-applications/applications-action-modal';
import RemoveDisasterRecoveryModal from '../modals/remove-disaster-recovery/remove-disaster-recovery';

export const drpcDetailsPageRoute = (drpc: DRPlacementControlKind) =>
  `/k8s/ns/${getNamespace(drpc)}/${referenceForModel(
    DRPlacementControlModel
  )}/${getName(drpc)}`;

export const getAlertMessages = (
  t: TFunction<string>,
  application: string,
  navigate: NavigateFunction,
  relocatedApp?: string,
  relocatedCluster?: string,
  failedOverApp?: string,
  failedOverCluster?: string
): AlertProps[] => [
  ...(!!application
    ? [
        {
          variant: AlertVariant.success,
          title: t(
            '{{appName}} is now successfully enrolled for disaster recovery protection.',
            { appName: application }
          ),
          actionClose: (
            <AlertActionCloseButton
              onClose={() =>
                navigate(`${DR_BASE_ROUTE}/protected-applications`)
              }
            />
          ),
          isInline: true,
          key: 'enrolled_success',
        },
      ]
    : []),
  ...(!!relocatedApp && !!relocatedCluster
    ? [
        {
          variant: AlertVariant.success,
          title: t('{{appName}} relocated', { appName: relocatedApp }),
          children: t(
            'Application "{{appName}}" is now deployed on cluster {{cluster}}',
            { appName: relocatedApp, cluster: relocatedCluster }
          ),
          actionClose: (
            <AlertActionCloseButton
              onClose={() =>
                navigate(`${DR_BASE_ROUTE}/protected-applications`)
              }
            />
          ),
          isInline: true,
          key: 'relocated_success',
        },
      ]
    : []),
  ...(!!failedOverApp && !!failedOverCluster
    ? [
        {
          variant: AlertVariant.success,
          title: t('{{appName}} failed over', { appName: failedOverApp }),
          children: t(
            'Application "{{appName}}" is now deployed on cluster {{cluster}}',
            { appName: failedOverApp, cluster: failedOverCluster }
          ),
          actionClose: (
            <AlertActionCloseButton
              onClose={() =>
                navigate(`${DR_BASE_ROUTE}/protected-applications`)
              }
            />
          ),
          isInline: true,
          key: 'failedover_success',
        },
      ]
    : []),
  {
    variant: AlertVariant.info,
    title: t(
      'For disaster recovery or replication details about ACM managed applications navigate to Applications overview page.'
    ),
    isInline: true,
    key: 'navigation_info',
  },
];

export const isFailingOrRelocating = (
  application: DRPlacementControlKind
): boolean =>
  [Phase.FailingOver, Phase.Relocating].includes(
    application?.status?.phase as Phase
  );

export const isCleanupPending = (drpc: DRPlacementControlKind): boolean =>
  [Phase.FailedOver, Phase.Relocating].includes(drpc?.status?.phase as Phase) &&
  drpc?.status?.progression === Progression.WaitOnUserToCleanUp;

export type ReplicationHealthMap = {
  title: string;
  icon: JSX.Element;
  priority: number;
};

export const replicationHealthMap = (
  health: VolumeReplicationHealth,
  t: TFunction<string>
): ReplicationHealthMap => {
  switch (health) {
    case VolumeReplicationHealth.CRITICAL:
      return {
        title: t('Critical'),
        icon: <RedExclamationCircleIcon />,
        priority: 3,
      };
    case VolumeReplicationHealth.WARNING:
      return {
        title: t('Warning'),
        icon: <YellowExclamationTriangleIcon />,
        priority: 2,
      };
    case VolumeReplicationHealth.HEALTHY:
      return {
        title: t('Healthy'),
        icon: <GreenCheckCircleIcon />,
        priority: 0,
      };
    default:
      return {
        title: t('Unknown'),
        icon: <GrayUnknownIcon />,
        priority: 1,
      };
  }
};

export type SyncStatusInfo = {
  volumeReplicationStatus: VolumeReplicationHealth;
  volumeReplicationType: ReplicationType;
  volumeLastGroupSyncTime: string;
  kubeObjectReplicationStatus: VolumeReplicationHealth;
  kubeObjectLastProtectionTime: string;
  replicationType: ReplicationType;
  schedulingInterval?: string;
};

export const getAppWorstSyncStatus = (
  syncStatusInfo: SyncStatusInfo,
  t: TFunction<string>
): ReplicationHealthMap => {
  const volumeStatus = syncStatusInfo.volumeReplicationStatus;
  const kubeObjectStatus = syncStatusInfo.kubeObjectReplicationStatus;
  const volumeStatusObj = replicationHealthMap(volumeStatus, t);
  const kubeObjectStatusObj = replicationHealthMap(kubeObjectStatus, t);
  return volumeStatusObj.priority > kubeObjectStatusObj.priority
    ? volumeStatusObj
    : kubeObjectStatusObj;
};

export const getColumnNames = (t: TFunction<string>) => [
  '', // expandable icon
  t('Name'),
  t('DR Status'),
  t('Policy'),
  t('Cluster'),
  '', // action kebab
];

export const getHeaderColumns = (t: TFunction<string>) => {
  const columnNames = getColumnNames(t);
  return [
    {
      columnName: columnNames[0],
    },
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
    {
      columnName: columnNames[2],
    },
    {
      columnName: columnNames[3],
    },
    {
      columnName: columnNames[4],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'spec.drPolicyRef.name'),
    },
    {
      columnName: columnNames[5],
    },
  ];
};

export const getRowActions = (
  t: TFunction<string>,
  launcher: LaunchModal,
  navigate: NavigateFunction,
  drpc: DRPlacementControlKind | undefined,
  pav: ProtectedApplicationViewKind
): IAction[] => {
  if (!drpc) {
    return [];
  }

  const appInfo = pav.status?.applicationInfo;
  const isDiscoveredApp = appInfo?.type === ApplicationType.Discovered;

  const launchDRAction = (action: DRActionType) =>
    isDiscoveredApp
      ? launcher(DRPlacementControlParser, {
          isOpen: true,
          extraProps: { application: drpc, action },
        })
      : launcher(ApplicationActionModal, {
          isOpen: true,
          extraProps: { pav, action },
        });

  return [
    {
      title: (
        <>
          {t('Edit configuration')}
          <p className="text-muted pf-v5-u-font-size-xs">
            {t('Update existing configuration in YAML view')}
          </p>
        </>
      ),
      onClick: () => navigate(`${drpcDetailsPageRoute(drpc)}/yaml`),
    },
    {
      title: (
        <>
          {t('Failover')}
          <p className="text-muted pf-v5-u-font-size-xs">
            {t('Move workloads to target cluster')}
          </p>
        </>
      ),
      onClick: () => launchDRAction(DRActionType.FAILOVER),
    },
    {
      title: (
        <>
          {t('Relocate')}
          <p className="text-muted pf-v5-u-font-size-xs">
            {t('Failback workloads to primary cluster')}
          </p>
        </>
      ),
      onClick: () => launchDRAction(DRActionType.RELOCATE),
    },
    isDiscoveredApp
      ? {
          title: t('Remove disaster recovery'),
          ...(_.has(drpc.metadata, 'deletionTimestamp') && {
            isAriaDisabled: true,
            tooltipProps: {
              content: t('Resource is being deleted.'),
              trigger: 'mouseenter',
            },
          }),
          onClick: () =>
            launcher(RemoveDisasterRecoveryModal, {
              isOpen: true,
              extraProps: { application: drpc },
            }),
        }
      : {
          title: (
            <>
              {t('Manage disaster recovery')}
              <p className="text-muted pf-v5-u-font-size-xs">
                {t('Update DR policies and configuration')}
              </p>
            </>
          ),
          onClick: () =>
            launcher(AppManagePoliciesModalWrapper, {
              isOpen: true,
              extraProps: { pav },
            }),
        },
  ];
};
export const enum EnrollApplicationTypes {
  CHOOSE_TYPE = 'CHOOSE_TYPE',
  DISCOVERED = 'DISCOVERED',
  MANAGED = 'MANAGED',
}

export const getEnrollDropdownItems = (
  t: TFunction<string>
): ActionDropdownItems[] => [
  {
    id: EnrollApplicationTypes.CHOOSE_TYPE,
    isDisabled: true,
    text: t('Choose a type:'),
  },
  {
    id: EnrollApplicationTypes.DISCOVERED,
    isDisabled: false,
    text: t('ACM discovered applications'),
  },
  {
    id: EnrollApplicationTypes.MANAGED,
    isDisabled: false,
    text: t('ACM managed applications'),
  },
];

import * as React from 'react';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
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
import { TFunction } from 'react-i18next';
import { NavigateFunction } from 'react-router-dom-v5-compat';
import {
  AlertProps,
  AlertVariant,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { IAction } from '@patternfly/react-table';
import {
  VOLUME_REPLICATION_HEALTH,
  DRPC_STATUS,
  LEAST_SECONDS_IN_PROMETHEUS,
} from '../../constants';
import { DRPlacementControlModel } from '../../models';
import { DRPlacementControlKind } from '../../types';
import { getVolumeReplicationHealth } from '../../utils';

export const drpcDetailsPageRoute = (drpc: DRPlacementControlKind) =>
  `/k8s/ns/${getNamespace(drpc)}/${referenceForModel(
    DRPlacementControlModel
  )}/${getName(drpc)}`;

export const getAlertMessages = (
  t: TFunction<string>,
  application: string,
  navigate: NavigateFunction
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
                navigate(
                  '/multicloud/data-services/disaster-recovery/protected-applications'
                )
              }
            />
          ),
          isInline: true,
        },
      ]
    : []),
  {
    variant: AlertVariant.info,
    title: t(
      'For disaster recovery or replication details about ACM managed applications navigate to Applications overview page.'
    ),
    isInline: true,
  },
];

export const isFailingOrRelocating = (
  application: DRPlacementControlKind
): boolean =>
  [DRPC_STATUS.FailingOver, DRPC_STATUS.Relocating].includes(
    application?.status?.phase as DRPC_STATUS
  );

export const getReplicationHealth = (
  lastSyncTime: string,
  schedulingInterval: string
): VOLUME_REPLICATION_HEALTH => {
  const seconds = !!lastSyncTime
    ? getTimeDifferenceInSeconds(lastSyncTime)
    : LEAST_SECONDS_IN_PROMETHEUS;
  return getVolumeReplicationHealth(seconds, schedulingInterval)[0];
};

export type ReplicationHealthMap = {
  title: string;
  icon: JSX.Element;
  priority: number;
};

export const replicationHealthMap = (
  health: VOLUME_REPLICATION_HEALTH,
  t: TFunction<string>
): ReplicationHealthMap => {
  switch (health) {
    case VOLUME_REPLICATION_HEALTH.CRITICAL:
      return {
        title: t('Critical'),
        icon: <RedExclamationCircleIcon size={'sm'} />,
        priority: 3,
      };
    case VOLUME_REPLICATION_HEALTH.WARNING:
      return {
        title: t('Warning'),
        icon: <YellowExclamationTriangleIcon size={'sm'} />,
        priority: 2,
      };
    case VOLUME_REPLICATION_HEALTH.HEALTHY:
      return {
        title: t('Healthy'),
        icon: <GreenCheckCircleIcon size={'sm'} />,
        priority: 0,
      };
    default:
      return {
        title: t('Unknown'),
        icon: <GrayUnknownIcon size={'sm'} />,
        priority: 1,
      };
  }
};

export type SyncStatusInfo = {
  volumeReplicationStatus: VOLUME_REPLICATION_HEALTH;
  volumeLastGroupSyncTime: string;
  kubeObjectReplicationStatus: VOLUME_REPLICATION_HEALTH;
  kubeObjectLastSyncTime: string;
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
  t('Details'),
  t('Overall sync status'),
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
    {
      columnName: columnNames[6],
    },
  ];
};

export const getRowActions = (
  t: TFunction<string>,
  launcher: LaunchModal,
  navigate: NavigateFunction,
  rowItem: DRPlacementControlKind
): IAction[] => [
  {
    title: (
      <>
        {t('Edit configuration')}
        <p className="text-muted pf-u-font-size-xs">
          {t('Update existing configuration in YAML view')}
        </p>
      </>
    ),
    onClick: () => navigate(`${drpcDetailsPageRoute(rowItem)}/yaml`),
  },
  {
    title: (
      <>
        {t('Failover')}
        <p className="text-muted pf-u-font-size-xs">
          {t('Move workloads to target cluster')}
        </p>
      </>
    ),
    onClick: () => launcher(() => <></>, {}),
  },
  {
    title: (
      <>
        {t('Relocate')}
        <p className="text-muted pf-u-font-size-xs">
          {t('Failback workloads to primary cluster')}
        </p>
      </>
    ),
    onClick: () => launcher(() => <></>, {}),
  },
];

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

import * as React from 'react';
import { FileSystemKind } from '@odf/core/types/scale';
import { resourceStatus } from '@odf/shared/status/Resource';
import { Status } from '@odf/shared/status/Status';
import { StorageClusterPhase } from '@odf/shared/types/storage';
import {
  HealthState,
  K8sResourceKind,
  StatusIconAndText,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { InProgressIcon } from '@patternfly/react-icons';
import { t_color_blue_40 as blueInfoColor } from '@patternfly/react-tokens';
import { getCnsaFilesystemHealth } from '../../ibm-common/cnsa-filesystem-health';
import { getLUNGroupStatus } from '../../ibm-common/lun-group-health';

export type ExternalSystemStatusCounts = {
  error: number;
  warning: number;
  healthy: number;
  inProgress: number;
};

const countFilesystemHealth = (
  fileSystems: FileSystemKind[],
  getHealth: (fs: FileSystemKind) => HealthState
): ExternalSystemStatusCounts => {
  const counts: ExternalSystemStatusCounts = {
    error: 0,
    warning: 0,
    healthy: 0,
    inProgress: 0,
  };
  for (const fileSystem of fileSystems) {
    const health = getHealth(fileSystem);
    switch (health) {
      case HealthState.OK:
        counts.healthy++;
        break;
      case HealthState.ERROR:
        counts.error++;
        break;
      case HealthState.LOADING:
        counts.inProgress++;
        break;
      default:
        counts.warning++;
        break;
    }
  }
  return counts;
};

const IN_PROGRESS_CLUSTER_PHASES = new Set([
  'Installing',
  'Creating',
  'Progressing',
  'Updating',
  'Upgrading',
]);

export const getClusterStatusCounts = (
  clusters: K8sResourceKind[] = []
): ExternalSystemStatusCounts => {
  const counts: ExternalSystemStatusCounts = {
    error: 0,
    warning: 0,
    healthy: 0,
    inProgress: 0,
  };
  for (const cluster of clusters) {
    const phase = resourceStatus(cluster);
    if (phase === StorageClusterPhase.Ready) {
      counts.healthy++;
    } else if (phase === StorageClusterPhase.Error) {
      counts.error++;
    } else if (IN_PROGRESS_CLUSTER_PHASES.has(phase)) {
      counts.inProgress++;
    } else if (phase) {
      counts.warning++;
    }
  }
  return counts;
};

export const getCnsaFilesystemStatusCounts = (
  fileSystems: FileSystemKind[] = []
): ExternalSystemStatusCounts =>
  countFilesystemHealth(fileSystems, getCnsaFilesystemHealth);

export const getSanLunGroupStatusCounts = (
  fileSystems: FileSystemKind[] = []
): ExternalSystemStatusCounts =>
  countFilesystemHealth(fileSystems, getLUNGroupStatus);

const hasStatusCounts = (counts: ExternalSystemStatusCounts): boolean =>
  counts.error + counts.warning + counts.healthy + counts.inProgress > 0;

type ExternalSystemStatusStripProps = {
  counts: ExternalSystemStatusCounts;
};

export const ExternalSystemStatusStrip: React.FC<
  ExternalSystemStatusStripProps
> = ({ counts }) => {
  const { error, warning, healthy, inProgress } = counts;
  return (
    <>
      {error > 0 && (
        <Status
          status={StorageClusterPhase.Error}
          title={String(error)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {warning > 0 && (
        <StatusIconAndText
          icon={<YellowExclamationTriangleIcon />}
          title={String(warning)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {healthy > 0 && (
        <Status
          status={StorageClusterPhase.Ready}
          title={String(healthy)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {inProgress > 0 && (
        <StatusIconAndText
          icon={<InProgressIcon color={blueInfoColor.value} />}
          title={String(inProgress)}
        />
      )}
    </>
  );
};

type ExternalSystemStatusStripOrEmptyProps = {
  counts: ExternalSystemStatusCounts;
  emptyMessage: string;
};

export const ExternalSystemStatusStripOrEmpty: React.FC<
  ExternalSystemStatusStripOrEmptyProps
> = ({ counts, emptyMessage }) =>
  hasStatusCounts(counts) ? (
    <ExternalSystemStatusStrip counts={counts} />
  ) : (
    <span className="pf-v6-u-disabled-color-100">{emptyMessage}</span>
  );

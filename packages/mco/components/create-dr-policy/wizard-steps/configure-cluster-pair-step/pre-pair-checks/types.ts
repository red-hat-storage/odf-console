import type * as React from 'react';
import { PrePairCheckId } from '@odf/mco/constants';
import type { ManagedClusterInfoType } from '@odf/mco/types';
import type { PrePairCheckResult } from '@odf/mco/utils/storage-vendor-registry';

export type PrePairCheckInput = {
  clusters: ManagedClusterInfoType[];
  clusterNames: string[];
  enabled: boolean;
};

export type PrePairCheckRenderProps<T = unknown> = {
  clusterNames: string[];
  result: PrePairCheckResult<T>;
  acknowledged: boolean;
  onAcknowledge: (acknowledged: boolean) => void;
  docHref?: string;
};

export type PrePairCheck = {
  id: PrePairCheckId;
  /** A hook: call it from exactly one component instance per check. */
  useCheck: (input: PrePairCheckInput) => PrePairCheckResult;
  requiresAcknowledgement?: (result: PrePairCheckResult) => boolean;
  Render: React.ComponentType<PrePairCheckRenderProps>;
};

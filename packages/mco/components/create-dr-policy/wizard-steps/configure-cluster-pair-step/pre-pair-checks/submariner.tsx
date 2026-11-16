import * as React from 'react';
import { PrePairCheckId, SubmarinerStatus } from '@odf/mco/constants';
import {
  usePrePairNetworkValidation,
  type PrePairNetworkValidationState,
} from '@odf/mco/hooks/use-pre-pair-network-validation';
import type { PrePairCheckResult } from '@odf/mco/utils/storage-vendor-registry';
import { PrePairNetworkValidation } from '../pre-pair-network-validation';
import type {
  PrePairCheck,
  PrePairCheckInput,
  PrePairCheckRenderProps,
} from './types';

const requiresSubmarinerAcknowledgement = (status: SubmarinerStatus): boolean =>
  status === SubmarinerStatus.NotInstalled ||
  status === SubmarinerStatus.Unknown;

const useSubmarinerCheck = ({
  clusterNames,
  enabled,
}: PrePairCheckInput): PrePairCheckResult<PrePairNetworkValidationState> => {
  const validation = usePrePairNetworkValidation(clusterNames, enabled);

  return {
    id: PrePairCheckId.Submariner,
    loaded: validation.loaded,
    loadError: validation.loadError,
    canProceed: validation.canProceed,
    data: validation,
  };
};

const SubmarinerRender: React.FC<
  PrePairCheckRenderProps<PrePairNetworkValidationState>
> = ({ clusterNames, result, acknowledged, onAcknowledge, docHref }) => {
  const validation = result.data as PrePairNetworkValidationState;

  return (
    <PrePairNetworkValidation
      clusterNames={clusterNames}
      validation={validation}
      acknowledgedUnvalidatedSubmariner={acknowledged}
      onAcknowledgeUnvalidatedSubmariner={onAcknowledge}
      docHref={docHref}
    />
  );
};

export const submarinerCheck: PrePairCheck = {
  id: PrePairCheckId.Submariner,
  useCheck: useSubmarinerCheck,
  requiresAcknowledgement: (result) => {
    const data = result.data as PrePairNetworkValidationState | undefined;
    return !!data?.status && requiresSubmarinerAcknowledgement(data.status);
  },
  Render: SubmarinerRender,
};

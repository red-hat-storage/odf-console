import * as React from 'react';
import { PrePairNetworkValidation } from '../../components/create-dr-policy/wizard-steps/configure-cluster-pair-step/pre-pair-network-validation';
import { SubmarinerStatus } from '../../constants';
import {
  usePrePairNetworkValidation,
  type PrePairNetworkValidationState,
} from '../../hooks';
import type {
  PrePairCheck,
  PrePairCheckRenderProps,
  PrePairCheckResult,
} from '../storage-vendor-registry';

const requiresSubmarinerAcknowledgement = (status: SubmarinerStatus): boolean =>
  status === SubmarinerStatus.NotInstalled ||
  status === SubmarinerStatus.Unknown;

const useSubmarinerCheck = (
  clusterNames: string[],
  enabled: boolean
): PrePairCheckResult<PrePairNetworkValidationState> => {
  const validation = usePrePairNetworkValidation(clusterNames, enabled);

  return {
    id: 'submariner',
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
  id: 'submariner',
  useCheck: useSubmarinerCheck,
  requiresAcknowledgement: (result) => {
    const data = result.data as PrePairNetworkValidationState | undefined;
    return !!data?.status && requiresSubmarinerAcknowledgement(data.status);
  },
  render: SubmarinerRender,
};

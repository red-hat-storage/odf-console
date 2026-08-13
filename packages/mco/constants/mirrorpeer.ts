import { TFunction } from 'i18next';

export enum MirrorPeerPhase {
  Initializing = 'Initializing',
  Configuring = 'Configuring',
  Ready = 'Ready',
  Failed = 'Failed',
  Deleting = 'Deleting',
}

export enum MirrorPeerPairingStatus {
  Progressing = 'Progressing',
  FailedRecoverable = 'FailedRecoverable',
  FailedUnrecoverable = 'FailedUnrecoverable',
  Ready = 'Ready',
}

export const MIRROR_PEER_PHASE_DISPLAY_TEXT = (
  t: TFunction
): { [key in MirrorPeerPhase]: string } => ({
  [MirrorPeerPhase.Initializing]: t('Initializing'),
  [MirrorPeerPhase.Configuring]: t('Configuring'),
  [MirrorPeerPhase.Ready]: t('Ready'),
  [MirrorPeerPhase.Failed]: t('Failed'),
  [MirrorPeerPhase.Deleting]: t('Deleting'),
});

export enum MirrorPeerConditionType {
  Validated = 'Validated',
  Configured = 'Configured',
  Deleted = 'Deleted',
}

export enum MirrorPeerConditionReason {
  ValidationFailed = 'ValidationFailed',
  MirrorPeerValid = 'MirrorPeerValid',
  Configured = 'Configured',
  ConfigurationFailed = 'ConfigurationFailed',
  ConfigurationInProgress = 'ConfigurationInProgress',
  ManagedClusterAddonFailed = 'ManagedClusterAddonFailed',
  PeeringInProgress = 'PeeringInProgress',
  PeeringFailed = 'PeeringFailed',
  S3ConfigurationInProgress = 'S3ConfigurationInProgress',
  S3ConfigurationFailed = 'S3ConfigurationFailed',
  DRClusterConfigurationInProgress = 'DRClusterConfigurationInProgress',
  DRClusterConfigurationFailed = 'DRClusterConfigurationFailed',
  DeletionFailed = 'DeletionFailed',
  DeletionInProgress = 'DeletionInProgress',
  MirrorPeerReady = 'MirrorPeerReady',
}

export enum MirrorPeerPhaseMessage {
  ValidationFailed = 'Validation failed',
  DeletionFailed = 'Deletion failed',
  DeletionInProgress = 'Deletion is in progress',
  ConfigurationFailed = 'Configuration failed',
  ManagedClusterAddOnFailed = 'ManagedClusterAddon configuration failed',
  PeeringInProgress = 'Peering is in progress',
  PeeringFailed = 'Peering of managedclusters failed',
  S3ConfigurationInProgress = 'S3 configuration is in progress',
  S3ConfigurationFailed = 'S3 configuration failed',
  DRClusterConfigurationInProgress = 'DRCluster configuration is in progress',
  DRClusterConfigurationFailed = 'DRCluster configuration failed',
  MirrorPeerReady = 'Setup is completed',
}

export const MIRROR_PEER_PHASE_MESSAGE_DISPLAY_TEXT = (
  t: TFunction
): { [key in MirrorPeerPhaseMessage]: string } => ({
  [MirrorPeerPhaseMessage.ValidationFailed]: t('Validation failed'),
  [MirrorPeerPhaseMessage.DeletionFailed]: t('Deletion failed'),
  [MirrorPeerPhaseMessage.DeletionInProgress]: t('Deletion is in progress'),
  [MirrorPeerPhaseMessage.ConfigurationFailed]: t('Configuration failed'),
  [MirrorPeerPhaseMessage.ManagedClusterAddOnFailed]: t(
    'ManagedClusterAddon configuration failed'
  ),
  [MirrorPeerPhaseMessage.PeeringInProgress]: t('Peering is in progress'),
  [MirrorPeerPhaseMessage.PeeringFailed]: t(
    'Peering of managed clusters failed'
  ),
  [MirrorPeerPhaseMessage.S3ConfigurationInProgress]: t(
    'S3 configuration is in progress'
  ),
  [MirrorPeerPhaseMessage.S3ConfigurationFailed]: t('S3 configuration failed'),
  [MirrorPeerPhaseMessage.DRClusterConfigurationInProgress]: t(
    'DRCluster configuration is in progress'
  ),
  [MirrorPeerPhaseMessage.DRClusterConfigurationFailed]: t(
    'DRCluster configuration failed'
  ),
  [MirrorPeerPhaseMessage.MirrorPeerReady]: t('Setup is completed'),
});

export const MIRROR_PEER_IN_PROGRESS_REASONS: readonly string[] = [
  MirrorPeerConditionReason.PeeringInProgress,
  MirrorPeerConditionReason.ConfigurationInProgress,
  MirrorPeerConditionReason.S3ConfigurationInProgress,
  MirrorPeerConditionReason.DRClusterConfigurationInProgress,
  MirrorPeerConditionReason.DeletionInProgress,
];

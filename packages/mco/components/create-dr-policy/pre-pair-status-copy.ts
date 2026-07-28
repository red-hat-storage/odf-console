import { SubmarinerStatus } from '@odf/mco/constants';
import { TFunction } from 'i18next';

/** Shared Submariner status copy for Configure status lines and Review summary. */
export const getSubmarinerStatusDescription = (
  status: SubmarinerStatus,
  t: TFunction
): string | undefined => {
  switch (status) {
    case SubmarinerStatus.Healthy:
      return t('Submariner is healthy');
    case SubmarinerStatus.UpstreamDetected:
      return t(
        'Upstream Submariner detected. Advanced validation is only available for ACM-managed Submariner.'
      );
    case SubmarinerStatus.NotInstalled:
      return t(
        'Deployment is not using submariner. Selected cluster pairs lack submariner addon'
      );
    case SubmarinerStatus.Inconsistent:
      return t(
        'Submariner is not installed on one or both selected cluster pairs'
      );
    case SubmarinerStatus.GatewayNodesUnlabeled:
      return t('Gateway nodes are not labeled.');
    case SubmarinerStatus.Unknown:
      return t('Unable to determine Submariner status');
    default:
      return undefined;
  }
};

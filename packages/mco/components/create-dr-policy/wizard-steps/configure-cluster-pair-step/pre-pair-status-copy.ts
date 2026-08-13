import { SubmarinerStatus } from '@odf/mco/constants';
import type { TFunction } from 'i18next';

export const getSubmarinerStatusDescription = (
  status: SubmarinerStatus,
  t: TFunction
): string => {
  switch (status) {
    case SubmarinerStatus.Healthy:
      return t('Submariner is healthy');
    case SubmarinerStatus.NotInstalled:
      return t('Submariner may not be installed on the selected clusters.');
    case SubmarinerStatus.Inconsistent:
      return t(
        'Only one of the two selected clusters has the Submariner add-on'
      );
    case SubmarinerStatus.Progressing:
      return t(
        'The Submariner add-on has not reported itself as available on the selected clusters yet. Wait until Submariner is available and healthy before you continue. This page updates on its own as the add-on reports progress.'
      );
    case SubmarinerStatus.Unknown:
      return t(
        'The Submariner add-on did not report a complete status for the selected clusters, so the cluster network connection could not be verified. This does not necessarily mean the connection is unhealthy.'
      );
    default:
      return t('Submariner status could not be determined');
  }
};

type SubmarinerAcknowledgementContent = {
  title: string;
  checkboxLabel: string;
};

export const getSubmarinerAcknowledgementContent = (
  status: SubmarinerStatus,
  t: TFunction
): SubmarinerAcknowledgementContent => {
  if (status === SubmarinerStatus.Unknown) {
    return {
      title: t(
        'Submariner status could not be determined for the selected clusters.'
      ),
      checkboxLabel: t(
        'I understand that the Submariner status could not be verified on the selected clusters and I want to continue.'
      ),
    };
  }

  return {
    title: t(
      'ACM-managed Submariner addon was not detected on the selected clusters.'
    ),
    checkboxLabel: t(
      'I understand that ACM-managed Submariner is not detected on the selected clusters and I want to continue.'
    ),
  };
};

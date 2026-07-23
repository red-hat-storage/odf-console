import * as React from 'react';
import { SubmarinerStatus } from '@odf/mco/constants';
import { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { StatusBox } from '@odf/shared/generic/status-box';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ViewDocumentation } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';
import {
  Content,
  ContentVariants,
  Spinner,
  Title,
} from '@patternfly/react-core';

type StatusLine = {
  icon: React.ReactElement;
  title: string;
  description?: string;
  showDocLink?: boolean;
};

const getSubmarinerStatusLine = (
  status: SubmarinerStatus,
  t: TFunction
): StatusLine => {
  switch (status) {
    case SubmarinerStatus.Checking:
      return {
        icon: <Spinner size="sm" />,
        title: t('Checking Submariner status for the selected clusters...'),
      };
    case SubmarinerStatus.Progressing:
      return {
        icon: <Spinner size="sm" />,
        title: t('Cluster network configuration in progress'),
      };
    case SubmarinerStatus.Healthy:
      return {
        icon: <GreenCheckCircleIcon />,
        title: t('Submariner is healthy'),
      };
    case SubmarinerStatus.NotInstalled:
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: t('Cluster network - Skipped'),
        description: t(
          'Deployment is not using submariner. Selected cluster pairs lack submariner addon'
        ),
      };
    case SubmarinerStatus.Inconsistent:
      return {
        icon: <RedExclamationCircleIcon />,
        title: t('Degraded - Cluster unhealthy'),
        description: t(
          'Submariner is not installed on one or both selected cluster pairs'
        ),
        showDocLink: true,
      };
    case SubmarinerStatus.Degraded:
    default:
      return {
        icon: <RedExclamationCircleIcon />,
        title: t('Degraded - Cluster unhealthy'),
        showDocLink: true,
      };
  }
};

export const PrePairNetworkValidation: React.FC<{
  clusterNames: string[];
  validation: PrePairNetworkValidationState;
  docHref?: string;
}> = ({ clusterNames, validation, docHref }) => {
  const { t } = useCustomTranslation();
  const checkingStatusLine = getSubmarinerStatusLine(
    SubmarinerStatus.Checking,
    t
  );
  const statusLine = getSubmarinerStatusLine(validation.status, t);

  return (
    <StatusBox
      data={clusterNames}
      loaded={validation.loaded}
      loadError={validation.loadError}
      skeleton={
        <StatusIconAndText
          icon={checkingStatusLine.icon}
          title={checkingStatusLine.title}
        />
      }
    >
      <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
        {t('Submariner')}
      </Title>
      <StatusIconAndText icon={statusLine.icon} title={statusLine.title} />
      {statusLine.description && (
        <Content component={ContentVariants.small}>
          {statusLine.description}
        </Content>
      )}
      {statusLine.showDocLink && docHref && (
        <ViewDocumentation doclink={docHref} />
      )}
    </StatusBox>
  );
};

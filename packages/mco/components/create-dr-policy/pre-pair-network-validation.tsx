import * as React from 'react';
import { GlobalnetStatus, SubmarinerStatus } from '@odf/mco/constants';
import { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { StatusBox } from '@odf/shared/generic/status-box';
import {
  GrayUnknownIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ViewDocumentation } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import {
  Content,
  ContentVariants,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { getSubmarinerStatusDescription } from './pre-pair-status-copy';

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
    case SubmarinerStatus.Unknown:
      return {
        icon: <GrayUnknownIcon />,
        title: t('Unable to determine Submariner status'),
      };
    case SubmarinerStatus.GatewayNodesUnlabeled:
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: t('Gateway nodes are not labeled.'),
        showDocLink: true,
      };
    case SubmarinerStatus.Healthy:
      return {
        icon: <GreenCheckCircleIcon />,
        title:
          getSubmarinerStatusDescription(status, t) ??
          t('Submariner is healthy'),
      };
    case SubmarinerStatus.UpstreamDetected:
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: t('Cluster network - Skipped'),
        description: getSubmarinerStatusDescription(status, t),
      };
    case SubmarinerStatus.NotInstalled:
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: t('Cluster network - Skipped'),
        description: getSubmarinerStatusDescription(status, t),
      };
    case SubmarinerStatus.Inconsistent:
      return {
        icon: <RedExclamationCircleIcon />,
        title: t('Degraded - Cluster unhealthy'),
        description: getSubmarinerStatusDescription(status, t),
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

const getGlobalnetStatusLine = (
  status: GlobalnetStatus,
  t: TFunction
): StatusLine => {
  const notEnabled = (description: string): StatusLine => ({
    icon: <YellowExclamationTriangleIcon />,
    title: t('Not enabled'),
    description,
    showDocLink: true,
  });

  switch (status) {
    case GlobalnetStatus.Checking:
      return {
        icon: <Spinner size="sm" />,
        title: t('Checking Globalnet...'),
      };
    case GlobalnetStatus.CidrUnread:
      return notEnabled(t('Unable to determine network overlap information.'));
    case GlobalnetStatus.LoadError:
    case GlobalnetStatus.NotFound:
      return notEnabled(
        t('Unable to retrieve Submariner broker configuration')
      );
    case GlobalnetStatus.OverlapBrokerMissing:
      return notEnabled(
        t('Globalnet is required as CIDRs overlap. Broker is missing')
      );
    case GlobalnetStatus.OverlapGlobalnetOff:
      return notEnabled(
        t(
          'Globalnet is required as CIDRs overlap. Globalnet is off on the Submariner broker.'
        )
      );
    case GlobalnetStatus.EnabledWithOverlap:
      return {
        icon: <GreenCheckCircleIcon />,
        title: t('Enabled'),
        description: t(
          'Globalnet is on. Cluster networks have overlapping Pod or Service CIDR.'
        ),
      };
    case GlobalnetStatus.Enabled:
      return {
        icon: <GreenCheckCircleIcon />,
        title: t('Enabled'),
        description: t('Globalnet is on. Cluster networks do not overlap'),
      };
    case GlobalnetStatus.Disabled:
      return notEnabled(t('Globalnet is off'));
    default:
      return notEnabled(
        t('Unable to retrieve Submariner broker configuration')
      );
  }
};

const StatusSection: React.FC<{
  heading: string;
  line: StatusLine;
  docHref?: string;
}> = ({ heading, line, docHref }) => (
  <>
    <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">
      {heading}
    </Title>
    <StatusIconAndText icon={line.icon} title={line.title} />
    {(line.description || (line.showDocLink && docHref)) && (
      <Content component={ContentVariants.small} className="pf-v6-u-mt-xs">
        {line.description}
        {line.showDocLink && !!docHref && (
          <ViewDocumentation
            doclink={docHref}
            padding={line.description ? '0 10px' : '0'}
          />
        )}
      </Content>
    )}
  </>
);

export type PrePairNetworkValidationProps = {
  clusterNames: string[];
  validation: PrePairNetworkValidationState;
  docHref?: string;
};

export const PrePairNetworkValidation: React.FC<
  PrePairNetworkValidationProps
> = ({ clusterNames, validation, docHref }) => {
  const { t } = useCustomTranslation();
  const checkingStatusLine = getSubmarinerStatusLine(
    SubmarinerStatus.Checking,
    t
  );
  const submariner = getSubmarinerStatusLine(validation.status, t);
  const showGlobalnet = validation.globalnetStatus !== GlobalnetStatus.Skipped;
  const globalnet = getGlobalnetStatusLine(validation.globalnetStatus, t);

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
      <StatusSection
        heading={t('Submariner')}
        line={submariner}
        docHref={docHref}
      />
      {showGlobalnet && (
        <div className="pf-v6-u-mt-md">
          <StatusSection
            heading={t('Globalnet')}
            line={globalnet}
            docHref={docHref}
          />
        </div>
      )}
    </StatusBox>
  );
};

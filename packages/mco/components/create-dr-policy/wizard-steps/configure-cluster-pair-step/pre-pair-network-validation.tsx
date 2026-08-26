import * as React from 'react';
import { GlobalnetStatus, SubmarinerStatus } from '@odf/mco/constants';
import type { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { StatusBox } from '@odf/shared/generic/status-box';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ViewDocumentation } from '@odf/shared/utils';
import type { TFunction } from 'i18next';
import {
  Alert,
  AlertVariant,
  Checkbox,
  Content,
  ContentVariants,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { requiresSubmarinerAcknowledgement } from '../../utils/step-validation';
import {
  getSubmarinerAcknowledgementContent,
  getSubmarinerStatusDescription,
} from './pre-pair-status-copy';

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
  // NotInstalled and Unknown are rendered via SubmarinerAcknowledgement.
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
        description: getSubmarinerStatusDescription(status, t),
        showDocLink: true,
      };
    case SubmarinerStatus.NotInstalled:
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: t(
          'ACM-managed Submariner addon was not detected on the selected clusters.'
        ),
        description: getSubmarinerStatusDescription(status, t),
        showDocLink: true,
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
        title: getSubmarinerStatusDescription(status, t),
      };
    case SubmarinerStatus.Inconsistent:
      return {
        icon: <RedExclamationCircleIcon />,
        title: t('Inconsistent Submariner installation'),
        description: getSubmarinerStatusDescription(status, t),
        showDocLink: true,
      };
    case SubmarinerStatus.Degraded:
      return {
        icon: <RedExclamationCircleIcon />,
        title: t('Degraded - Cluster unhealthy'),
        showDocLink: true,
      };
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
  // Every "Not enabled" outcome left below blocks Next (doesGlobalnetBlockProceed),
  // so it is always an error rather than a warning.
  const notEnabled = (description: string): StatusLine => ({
    icon: <RedExclamationCircleIcon />,
    title: t('Not enabled'),
    description,
    showDocLink: true,
  });

  // Globalnet only matters when the cluster networks overlap. Disabled/NotFound
  // are reported only when there is no overlap, so they are a success, not a
  // warning the user has to act on.
  const notRequired = (): StatusLine => ({
    icon: <GreenCheckCircleIcon />,
    title: t('Not required'),
    description: t(
      'No network overlap detected. Globalnet is not needed when the cluster networks do not overlap.'
    ),
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
    case GlobalnetStatus.NotFound:
      return notRequired();
    default:
      return notEnabled(
        t('Unable to retrieve Submariner broker configuration')
      );
  }
};

type StatusLineContentProps = {
  line: StatusLine;
  docHref?: string;
};

const StatusLineContent: React.FC<StatusLineContentProps> = ({
  line,
  docHref,
}) => (
  <>
    <StatusIconAndText icon={line.icon} title={line.title} />
    {(line.description || (line.showDocLink && docHref)) && (
      <Content component={ContentVariants.small} className="pf-v6-u-mt-xs">
        {line.description}
        {line.showDocLink && !!docHref && (
          <span className={line.description ? 'pf-v6-u-ml-sm' : undefined}>
            <ViewDocumentation doclink={docHref} padding="0" />
          </span>
        )}
      </Content>
    )}
  </>
);

type StatusSectionProps = StatusLineContentProps & {
  heading: string;
};

const StatusSection: React.FC<StatusSectionProps> = ({
  heading,
  line,
  docHref,
}) => (
  <>
    <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">
      {heading}
    </Title>
    <StatusLineContent line={line} docHref={docHref} />
  </>
);

type SubmarinerAcknowledgementProps = {
  status: SubmarinerStatus;
  acknowledged: boolean;
  onAcknowledge: (acknowledged: boolean) => void;
  docHref?: string;
};

const SubmarinerAcknowledgement: React.FC<SubmarinerAcknowledgementProps> = ({
  status,
  acknowledged,
  onAcknowledge,
  docHref,
}) => {
  const { t } = useCustomTranslation();
  const { title, checkboxLabel } = getSubmarinerAcknowledgementContent(
    status,
    t
  );

  return (
    <Alert
      className="odf-alert"
      variant={AlertVariant.warning}
      isInline
      title={title}
    >
      <Content component={ContentVariants.p}>
        {getSubmarinerStatusDescription(status, t)}
      </Content>
      <Content component={ContentVariants.p}>
        {t('If you understand the implications, you may continue.')}
      </Content>
      {!!docHref && <ViewDocumentation doclink={docHref} padding="0" />}
      <Checkbox
        id="acknowledge-unvalidated-submariner"
        className="pf-v6-u-mt-sm"
        label={checkboxLabel}
        isChecked={acknowledged}
        onChange={(_event, checked) => onAcknowledge(checked)}
      />
    </Alert>
  );
};

export type PrePairNetworkValidationProps = {
  clusterNames: string[];
  validation: PrePairNetworkValidationState;
  acknowledgedUnvalidatedSubmariner: boolean;
  onAcknowledgeUnvalidatedSubmariner: (acknowledged: boolean) => void;
  docHref?: string;
};

export const PrePairNetworkValidation: React.FC<
  PrePairNetworkValidationProps
> = ({
  clusterNames,
  validation,
  acknowledgedUnvalidatedSubmariner,
  onAcknowledgeUnvalidatedSubmariner,
  docHref,
}) => {
  const { t } = useCustomTranslation();
  const checkingStatusLine = getSubmarinerStatusLine(
    SubmarinerStatus.Checking,
    t
  );
  // Handled by the acknowledgement alert, not by a status line.
  const needsAcknowledgement = requiresSubmarinerAcknowledgement(
    validation.status
  );
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
      <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">
        {t('Submariner')}
      </Title>
      {needsAcknowledgement ? (
        <SubmarinerAcknowledgement
          status={validation.status}
          acknowledged={acknowledgedUnvalidatedSubmariner}
          onAcknowledge={onAcknowledgeUnvalidatedSubmariner}
          docHref={docHref}
        />
      ) : (
        <StatusLineContent
          line={getSubmarinerStatusLine(validation.status, t)}
          docHref={docHref}
        />
      )}
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

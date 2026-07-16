import * as React from 'react';
import {
  GlobalnetCheckStatus,
  GlobalnetRequirement,
  SubmarinerClusterHealth,
} from '@odf/mco/constants';
import { PrePairNetworkValidationState } from '@odf/mco/hooks';
import {
  isGlobalnetRequiredButNotEnabled,
  isMixedSubmarinerInstall,
  isMixedSubmarinerInstallMethod,
} from '@odf/mco/utils/submariner-health';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Content,
  ContentVariants,
  Spinner,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';

const getSubmarinerAlertTitle = (
  health: SubmarinerClusterHealth,
  t: (key: string) => string
): string => {
  switch (health) {
    case SubmarinerClusterHealth.NotInstalled:
      return t('Cluster network: Not using Submariner on this deployment');
    case SubmarinerClusterHealth.UpstreamDetected:
      return t('Cluster network (Submariner): Upstream installation detected');
    case SubmarinerClusterHealth.Healthy:
      return t('Cluster network (Submariner): Connected');
    case SubmarinerClusterHealth.Progressing:
      return t('Cluster network (Submariner): Configuration in progress');
    case SubmarinerClusterHealth.Checking:
      return t('Checking cluster network connectivity...');
    case SubmarinerClusterHealth.Degraded:
    default:
      return t('Cluster network (Submariner): Not healthy');
  }
};

const getGlobalnetAlertTitle = (
  status: GlobalnetCheckStatus,
  requirement: GlobalnetRequirement,
  t: (key: string) => string
): string => {
  if (isGlobalnetRequiredButNotEnabled(status, requirement)) {
    return t(
      'Globalnet is required because the selected clusters have overlapping network CIDRs, but it is not enabled.'
    );
  }

  switch (status) {
    case GlobalnetCheckStatus.Enabled:
      return requirement === GlobalnetRequirement.Required
        ? t('Globalnet: Enabled (required for overlapping cluster networks)')
        : t('Globalnet: Enabled');
    case GlobalnetCheckStatus.Disabled:
      return t('Globalnet: Not enabled');
    case GlobalnetCheckStatus.NotFound:
    default:
      return t('Globalnet: Broker configuration not found');
  }
};

export const shouldRunPrePairValidation = (
  selectedClusterCount: number,
  isClusterSelectionValid: boolean,
  isDataFoundationBackend: boolean
): boolean =>
  selectedClusterCount === 2 &&
  isClusterSelectionValid &&
  isDataFoundationBackend;

export const PrePairNetworkValidation: React.FC<
  PrePairNetworkValidationProps
> = ({ enabled, clusterNames, validation }) => {
  const { t } = useCustomTranslation();

  if (!enabled) {
    return null;
  }

  const {
    submarinerOverallHealth,
    globalnetStatus,
    globalnetRequirement,
    clusterStatuses,
  } = validation;

  const globalnetRequiredButNotEnabled = isGlobalnetRequiredButNotEnabled(
    globalnetStatus,
    globalnetRequirement
  );
  const mixedInstallMessage = isMixedSubmarinerInstall(clusterStatuses)
    ? t(
        'Submariner must be installed on both selected clusters for this deployment.'
      )
    : undefined;
  const backendFailureMessage = clusterStatuses.find(
    (status) =>
      status.health === SubmarinerClusterHealth.Degraded && status.message
  )?.message;
  let upstreamDetectedMessage: string | undefined;
  if (submarinerOverallHealth === SubmarinerClusterHealth.UpstreamDetected) {
    upstreamDetectedMessage = isMixedSubmarinerInstallMethod(clusterStatuses)
      ? t(
          'Upstream Submariner detected. Advanced validation is only available for ACM-managed Submariner. The selected clusters use different Submariner installation methods.'
        )
      : t(
          'Upstream Submariner detected. Advanced validation is only available for ACM-managed Submariner.'
        );
  }
  const submarinerFailureMessage = mixedInstallMessage || backendFailureMessage;

  const isSubmarinerDegraded =
    submarinerOverallHealth === SubmarinerClusterHealth.Degraded;
  const isSubmarinerProgressing =
    submarinerOverallHealth === SubmarinerClusterHealth.Progressing ||
    submarinerOverallHealth === SubmarinerClusterHealth.Checking;

  const submarinerAlertVariant = isSubmarinerDegraded
    ? AlertVariant.danger
    : isSubmarinerProgressing
      ? AlertVariant.warning
      : submarinerOverallHealth === SubmarinerClusterHealth.Healthy
        ? AlertVariant.success
        : AlertVariant.info;

  return (
    <StatusBox
      data={clusterNames}
      loaded={validation.loaded}
      loadError={validation.loadError}
      skeleton={
        <StatusIconAndText
          icon={<Spinner size="sm" />}
          title={t('Checking cluster network connectivity...')}
        />
      }
    >
      <Alert
        className="odf-alert mco-create-data-policy__alert"
        title={getSubmarinerAlertTitle(submarinerOverallHealth, t)}
        variant={submarinerAlertVariant}
        isInline
      >
        {upstreamDetectedMessage && (
          <Content component={ContentVariants.p}>
            {upstreamDetectedMessage}
          </Content>
        )}
        {isSubmarinerDegraded && submarinerFailureMessage && (
          <Content component={ContentVariants.p}>
            {submarinerFailureMessage}
          </Content>
        )}
        {isSubmarinerDegraded &&
          clusterStatuses
            .filter(
              (status) => status.health === SubmarinerClusterHealth.Degraded
            )
            .map((status) => (
              <Content component={ContentVariants.p} key={status.clusterName}>
                {status.clusterName}
                {status.message ? `: ${status.message}` : ''}
              </Content>
            ))}
      </Alert>

      {globalnetStatus !== GlobalnetCheckStatus.Skipped &&
        globalnetStatus !== GlobalnetCheckStatus.Checking &&
        globalnetRequirement !== GlobalnetRequirement.Checking && (
          <Alert
            className="odf-alert mco-create-data-policy__alert pf-v6-u-mt-sm"
            title={getGlobalnetAlertTitle(
              globalnetStatus,
              globalnetRequirement,
              t
            )}
            variant={
              globalnetStatus === GlobalnetCheckStatus.Enabled &&
              !globalnetRequiredButNotEnabled
                ? AlertVariant.success
                : AlertVariant.warning
            }
            isInline
            customIcon={
              globalnetStatus === GlobalnetCheckStatus.Enabled &&
              !globalnetRequiredButNotEnabled ? (
                <CheckCircleIcon />
              ) : (
                <ExclamationCircleIcon />
              )
            }
          />
        )}
    </StatusBox>
  );
};

type PrePairNetworkValidationProps = {
  enabled: boolean;
  clusterNames: string[];
  validation: PrePairNetworkValidationState;
};

import * as React from 'react';
import { docLinks } from '@odf/mco/constants/doc';
import { ViewDocumentation } from '@odf/shared/utils';
import { K8sResourceCondition } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
import { AlertVariant } from '@patternfly/react-core';

export enum ErrorMessageType {
  // Priority wise error messages
  DR_IS_NOT_ENABLED_FAILOVER = 1,
  DR_IS_NOT_ENABLED_RELOCATE,
  DR_IS_INVALID,
  FAILOVER_READINESS_CHECK_FAILED,
  RELOCATE_READINESS_CHECK_FAILED,
  MANAGED_CLUSTERS_ARE_DOWN,
  TARGET_CLUSTER_IS_NOT_AVAILABLE,
  SOME_CLUSTERS_ARE_FENCED,
  PRIMARY_CLUSTER_IS_NOT_FENCED,
  TARGET_CLUSTER_IS_FENCED,
  // Warning message priority start from 20
  SIBLING_APPLICATIONS_FOUND_FAILOVER = 20,
  SIBLING_APPLICATIONS_FOUND_RELOCATE,
  VOLUME_SYNC_DELAY_FAILOVER,
  VOLUME_SYNC_DELAY_RELOCATE,
}

export type MessageKind = Partial<{
  title: React.ReactNode;
  message: React.ReactNode;
  variant: AlertVariant;
}>;

type ErrorMessagesType = {
  [key in ErrorMessageType]: MessageKind;
};

export const ErrorMessages = (
  t: TFunction,
  mcoDocVersion: string,
  acmDocVersion: string,
  invalidDRPolicy?: K8sResourceCondition
): ErrorMessagesType => ({
  [ErrorMessageType.DR_IS_NOT_ENABLED_FAILOVER]: {
    title: t('No DRPolicy found.'),
    message: (
      <Trans t={t}>
        <ul>
          <li>
            To failover, your application must have a DR policy associated with
            it. Check for an active DRpolicy and try again.
          </li>
          <li>
            To apply a DRPolicy to your application, follow the instructions in
            the documentation
            <span>
              <ViewDocumentation
                doclink={docLinks(mcoDocVersion, acmDocVersion).APPLY_POLICY}
                hideDocLink={!mcoDocVersion || !acmDocVersion}
              />
            </span>
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.DR_IS_NOT_ENABLED_RELOCATE]: {
    title: t('No DRPolicy found.'),
    message: (
      <Trans t={t}>
        <ul>
          <li>
            To relocate, your application must have a DR policy associated with
            it. Check for an active DRpolicy and try again.
          </li>
          <li>
            To apply a DRPolicy to your application, follow the instructions in
            the documentation
            <span>
              <ViewDocumentation
                doclink={docLinks(mcoDocVersion, acmDocVersion).APPLY_POLICY}
                hideDocLink={!mcoDocVersion || !acmDocVersion}
              />
            </span>
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.FAILOVER_READINESS_CHECK_FAILED]: {
    title: t('Cannot failover.'),
    message: (
      <Trans t={t}>
        <p>
          Failover cannot be initiated as the readiness checks are failing.
          Refer to workaround mentioned in known issues section of
          <span>
            <ViewDocumentation
              doclink={docLinks(mcoDocVersion, acmDocVersion).DR_RELEASE_NOTES}
              hideDocLink={!mcoDocVersion || !acmDocVersion}
              text={t('release notes')}
            />
          </span>
          .
        </p>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.RELOCATE_READINESS_CHECK_FAILED]: {
    title: t('Cannot relocate.'),
    message: (
      <Trans t={t}>
        <p>
          Relocation cannot be initiated as the readiness checks are failing.
          Refer to workaround mentioned in known issues section of
          <span>
            <ViewDocumentation
              doclink={docLinks(mcoDocVersion, acmDocVersion).DR_RELEASE_NOTES}
              hideDocLink={!mcoDocVersion || !acmDocVersion}
              text={t('release notes')}
            />
          </span>
          .
        </p>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.MANAGED_CLUSTERS_ARE_DOWN]: {
    title: t('1 or more managed clusters are offline.'),
    message: (
      <Trans t={t}>
        <ul>
          <li>
            The status for both the primary and target clusters must be
            available for relocating. Check the status and try again.
          </li>
          <li>
            To bring the cluster online, refer to the instructions in the
            documentation
            <span>
              <ViewDocumentation
                doclink={
                  docLinks(mcoDocVersion, acmDocVersion).ACM_OFFLINE_CLUSTER
                }
                hideDocLink={!mcoDocVersion || !acmDocVersion}
                text={t('Troubleshoot')}
              />
            </span>
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.TARGET_CLUSTER_IS_NOT_AVAILABLE]: {
    title: t('Target cluster is offline.'),
    message: (
      <Trans t={t}>
        <p>
          To begin failover, the target cluster must be available. Check the
          status and try again. If the managed cluster status is offline, follow
          the instructions in the documentation
          <span>
            <ViewDocumentation
              doclink={
                docLinks(mcoDocVersion, acmDocVersion).ACM_OFFLINE_CLUSTER
              }
              hideDocLink={!mcoDocVersion || !acmDocVersion}
              text={t('Troubleshoot')}
            />
          </span>
        </p>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.SOME_CLUSTERS_ARE_FENCED]: {
    title: t('Some clusters are fenced.'),
    message: (
      <Trans t={t}>
        <ul>
          <li>
            Check the fencing status for your primary and target cluster. Both
            clusters should be unfenced for initiating relocation.
          </li>
          <li>
            To unfence your cluster, refer to the documentation
            <span>
              <ViewDocumentation
                doclink={docLinks(mcoDocVersion, acmDocVersion).MDR_RELOCATE}
                hideDocLink={!mcoDocVersion || !acmDocVersion}
              />
            </span>
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.PRIMARY_CLUSTER_IS_NOT_FENCED]: {
    title: t('Primary cluster is unfenced.'),
    message: (
      <Trans t={t}>
        <ul>
          <li>
            The status for your primary cluster must be fenced for initiating
            failover. Check the status and try again.
          </li>
          <li>
            To fence your cluster, follow the instructions in the documentation
            <span>
              <ViewDocumentation
                doclink={docLinks(mcoDocVersion, acmDocVersion).MDR_FAILOVER}
                hideDocLink={!mcoDocVersion || !acmDocVersion}
              />
            </span>
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.TARGET_CLUSTER_IS_FENCED]: {
    title: t('Target cluster is fenced.'),
    message: (
      <Trans t={t}>
        <ul>
          <li>
            The status for your target cluster must be unfenced for initiating
            failover. Check the status and try again.
          </li>
          <li>
            To unfence your cluster, follow the instructions in the
            documentation
            <span>
              <ViewDocumentation
                doclink={docLinks(mcoDocVersion, acmDocVersion).MDR_FAILOVER}
                hideDocLink={!mcoDocVersion || !acmDocVersion}
              />
            </span>
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.SIBLING_APPLICATIONS_FOUND_FAILOVER]: {
    title: t('Other applications may be affected.'),
    message: (
      <Trans t={t}>
        <p>
          This application uses placement that are also used by other
          applications. Failing over will automatically trigger a failover for
          other applications sharing the same placement.
        </p>
      </Trans>
    ),
    variant: AlertVariant.warning,
  },
  [ErrorMessageType.SIBLING_APPLICATIONS_FOUND_RELOCATE]: {
    title: t('Other applications may be affected.'),
    message: (
      <Trans t={t}>
        <p>
          This application uses placement that are also used by other
          applications. Relocating will automatically trigger a relocate for
          other applications sharing the same placement.
        </p>
      </Trans>
    ),
    variant: AlertVariant.warning,
  },
  [ErrorMessageType.VOLUME_SYNC_DELAY_FAILOVER]: {
    title: t('Inconsistent data on target cluster'),
    message: t(
      "One or more volumes for this application may not be replicating at all or replication is taking longer than the replication interval as defined in the assigned data policy. If either managed cluster's replication services are offline or unreachable, this is an expected condition. Refer to the corresponding VolumeSynchronizationDelay OpenShift alert(s) for more information."
    ),
    variant: AlertVariant.warning,
  },
  [ErrorMessageType.VOLUME_SYNC_DELAY_RELOCATE]: {
    title: t('Inconsistent data on target cluster'),
    message: t(
      "One or more volumes for this application may not be replicating at all or replication is taking longer than the replication interval as defined in the assigned data policy. If either managed cluster's replication services are offline or unreachable, this is an expected condition. Refer to the corresponding VolumeSynchronizationDelay OpenShift alert(s) for more information."
    ),
    variant: AlertVariant.warning,
  },
  [ErrorMessageType.DR_IS_INVALID]: {
    title: invalidDRPolicy?.reason || t('Invalid DR Policy'),
    message: invalidDRPolicy?.message || t('The DR Policy validation failed'),
    variant: AlertVariant.danger,
  },
});

export const evaluateErrorMessage = (
  errorMessage: ErrorMessageType,
  includeWarning: boolean = false
) => {
  if (!errorMessage || (!includeWarning && errorMessage >= 20)) {
    return -1;
  }
  return errorMessage;
};

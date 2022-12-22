import * as React from 'react';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';
import { AlertVariant } from '@patternfly/react-core';
import { ViewDocumentation, DOC_LINKS } from '../../../utils';

export enum ErrorMessageType {
  // Priority wise error messages
  DR_IS_NOT_ENABLED_FAILOVER,
  DR_IS_NOT_ENABLED_RELOCATE,
  PEER_IS_NOT_READY_FAILOVER,
  PEER_IS_NOT_READY_RELOCATE,
  MANAGED_CLUSTERS_ARE_DOWN,
  TARGET_CLUSTER_IS_NOT_AVAILABLE,
  SOME_CLUSTERS_ARE_FENCED,
  PRIMARY_CLUSTER_IS_NOT_FENCED,
  TARGET_CLUSTER_IS_FENCED,
  // Warning message priority start from 20
  SIBLING_APPLICATIONS_FOUND_FAILOVER = 20,
  SIBLING_APPLICATIONS_FOUND_RELOCATE,
}

export type MessageKind = Partial<{
  title: React.ReactNode;
  message: React.ReactNode;
  variant: AlertVariant;
}>;

type ErrorMessagesType = {
  [key in ErrorMessageType]: MessageKind;
};

export const ErrorMessages = (t: TFunction): ErrorMessagesType => ({
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
            the documentation.{' '}
            <ViewDocumentation doclink={DOC_LINKS.APPLY_POLICY} />
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
            the documentation.{' '}
            <ViewDocumentation doclink={DOC_LINKS.APPLY_POLICY} />
          </li>
        </ul>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.PEER_IS_NOT_READY_FAILOVER]: {
    title: t('Cannot failover.'),
    message: (
      <Trans t={t}>
        <p>
          Peer is not in ready state. Wait a few minutes and try again. If it
          still is not ready, refer to the
          <ViewDocumentation
            doclink={DOC_LINKS.DR_RELEASE_NOTES}
            text="release notes"
          />{' '}
          documentation of known issues linked to disaster recovery.
        </p>
      </Trans>
    ),
    variant: AlertVariant.danger,
  },
  [ErrorMessageType.PEER_IS_NOT_READY_RELOCATE]: {
    title: t('Cannot relocate.'),
    message: (
      <Trans t={t}>
        <p>
          Peer is not in ready state. Wait a few minutes and try again. If it
          still is not ready, refer to the
          <ViewDocumentation
            doclink={DOC_LINKS.DR_RELEASE_NOTES}
            text="release notes"
          />{' '}
          documentation of known issues linked to disaster recovery.
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
            <ViewDocumentation
              doclink={DOC_LINKS.ACM_OFFLINE_CLUSTER}
              text="Troubleshoot"
            />
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
          <ViewDocumentation
            doclink={DOC_LINKS.ACM_OFFLINE_CLUSTER}
            text="Troubleshoot"
          />
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
            To unfence your cluster, refer to the documentation{' '}
            <ViewDocumentation doclink={DOC_LINKS.UNFENCING} />.
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
            To fence your cluster, follow the instructions in the documentation{' '}
            <ViewDocumentation doclink={DOC_LINKS.FENCING} />.
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
            documentation <ViewDocumentation doclink={DOC_LINKS.UNFENCING} />.
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
});

export const evaluateErrorMessage = (
  errorMessage: ErrorMessageType,
  includeWarning: boolean = false
) => {
  if (!includeWarning ? errorMessage < 20 : true) {
    return errorMessage;
  }
  return -1;
};

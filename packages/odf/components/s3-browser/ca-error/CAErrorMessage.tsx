import * as React from 'react';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import { RedTimesCircleIcon } from '@odf/shared';
import { DOC_VERSION } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink } from '@odf/shared/utils';
import { Trans } from 'react-i18next';
import {
  EmptyState,
  EmptyStateHeader,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';

const customCADocLink = (docVersion: string) =>
  `https://docs.openshift.com/container-platform/${docVersion}/security/certificates/replacing-default-ingress-certificate.html`;

// In a browser environment, the error objects returned by AWS SDK do not include granular information about TLS or certificate-specific issues.
// Hence relying on error "name" and "message" content.
export const isCAError = (error: Error) => {
  const errorMessage = error?.message.toLowerCase();
  const errorType = error?.name;
  if (
    ['TypeError', 'NetworkingError', 'NetworkError'].includes(errorType) &&
    (errorMessage.includes('certificate') ||
      errorMessage.includes('authority') ||
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('self-signed') ||
      errorMessage.includes('self signed') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('network'))
  )
    return true;
  return false;
};

export const CAErrorMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  const { noobaaS3Route } = React.useContext(NoobaaS3Context);

  return (
    <>
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText={t('Could not load information')}
          icon={<EmptyStateIcon icon={RedTimesCircleIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>
          {t(
            'The browser cannot connect securely to this endpoint because it does not recognize the SSL certificate. This occurs when the certificate of the endpoint is not issued by a trusted Certificate Authority (CA).'
          )}
          <p className="pf-v5-u-mt-lg">
            {t(
              'To establish a connection with the endpoint, try the following methods:'
            )}
          </p>
        </EmptyStateBody>
      </EmptyState>
      <Trans>
        <div className="text-muted pf-v5-u-ml-4xl pf-v5-u-mr-4xl">
          <b>1. Recommended:</b> Replace the internal certificate with one
          issued by a public or custom Certificate Authority (CA). See the{' '}
          <ExternalLink href={customCADocLink(DOC_VERSION)}>
            OpenShift documentation
          </ExternalLink>{' '}
          for guidance.
          <br />
          <b>2. Alternative method:</b> Add the internal CA bundle of OpenShift
          Container Platform to the trust store of your system. This ensures
          that the browser recognises the internal certificate.{' '}
          <i>
            (<b>ConfigMap:</b> default-ingress-cert in <b>Namespace:</b>{' '}
            openshift-config-managed)
          </i>
          .<br />
          <b>3. Temporary (Least recommended):</b> Open the endpoint in a new
          tab (
          <ExternalLink href={noobaaS3Route}>
            click here to open the S3 route
          </ExternalLink>
          ) and click <b>Continue to site</b> (wording may vary by browser) to
          bypass the security warning. Then refresh the Data Foundation tab.
        </div>
      </Trans>
    </>
  );
};

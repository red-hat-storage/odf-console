import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Text, TextVariants } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

export const ODF_DOC_VERSION = '4.13';
export const ODF_DOC_HOME = `https://access.redhat.com/documentation/en-us/red_hat_openshift_data_foundation/${ODF_DOC_VERSION}`;
export const ODF_DOC_BASE_PATH = `${ODF_DOC_HOME}/html-single`;

export const ACM_DOC_VERSION = '2.7';
export const ACM_DOC_HOME = `https://access.redhat.com/documentation/en-us/red_hat_advanced_cluster_management_for_kubernetes/${ACM_DOC_VERSION}`;
export const ACM_DOC_BASE_PATH = `${ACM_DOC_HOME}/html-single`;

export const DOC_LINKS = {
  APPLY_POLICY: `${ODF_DOC_BASE_PATH}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#apply-drpolicy-to-sample-application_manage-dr`,
  FENCING: `${ODF_DOC_BASE_PATH}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#enable-fencing_manage-dr`,
  UNFENCING: `${ODF_DOC_BASE_PATH}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#disable-fencing_manage-dr`,
  DR_RELEASE_NOTES: `${ODF_DOC_BASE_PATH}/${ODF_DOC_VERSION}_release_notes/index#disaster_recovery`,
  ACM_OFFLINE_CLUSTER: `${ACM_DOC_BASE_PATH}/troubleshooting/index#troubleshooting-an-offline-cluster`,
};

export const ViewDocumentation: React.FC<ViewDocumentationProps> = ({
  doclink,
  text,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Text
      component={TextVariants.a}
      isVisitedLink
      href={doclink}
      target="_blank"
      style={{
        cursor: 'pointer',
        display: 'inline-block',
        padding: '15px 10px',
        fontSize: '14px',
      }}
    >
      {text || t('View documentation')} <ExternalLinkAltIcon />
    </Text>
  );
};

type ViewDocumentationProps = {
  doclink: string;
  text?: string;
};

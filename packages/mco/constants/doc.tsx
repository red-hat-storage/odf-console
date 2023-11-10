import { ODF_DOC_BASE_PATH, ODF_DOC_VERSION } from '@odf/shared/constants/doc';

export const ACM_DOC_VERSION = '2.9';
export const ACM_DOC_HOME = `https://access.redhat.com/documentation/en-us/red_hat_advanced_cluster_management_for_kubernetes/${ACM_DOC_VERSION}`;
export const ACM_DOC_BASE_PATH = `${ACM_DOC_HOME}/html-single`;

export const DOC_LINKS = {
  APPLY_POLICY: `${ODF_DOC_BASE_PATH}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#apply-drpolicy-to-sample-application_manage-dr`,
  MDR_FAILOVER: `${ODF_DOC_BASE_PATH}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#application-failover-between-managed-clusters_manage-dr`,
  MDR_RELOCATE: `${ODF_DOC_BASE_PATH}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#relocating-application-between-managed-clusters_manage-dr`,
  DR_RELEASE_NOTES: `${ODF_DOC_BASE_PATH}/${ODF_DOC_VERSION}_release_notes/index#disaster_recovery`,
  ACM_OFFLINE_CLUSTER: `${ACM_DOC_BASE_PATH}/troubleshooting/index#troubleshooting-an-offline-cluster`,
};

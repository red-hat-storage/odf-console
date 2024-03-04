import {
  ODF_DOC_BASE_PATH,
  ODF_DOC_VERSION,
  ODF_DR_DOC_HOME,
  ODF_DR_DOC_APPLY_POLICY,
} from '@odf/shared/constants/doc';

export const ACM_DOC_VERSION = '2.10';
export const ACM_DOC_HOME = `https://access.redhat.com/documentation/en-us/red_hat_advanced_cluster_management_for_kubernetes/${ACM_DOC_VERSION}`;
export const ACM_DOC_BASE_PATH = `${ACM_DOC_HOME}/html-single`;

export const DOC_LINKS = {
  APPLY_POLICY: ODF_DR_DOC_APPLY_POLICY,
  MDR_FAILOVER: `${ODF_DR_DOC_HOME}#application-failover-between-managed-clusters_manage-dr`,
  MDR_RELOCATE: `${ODF_DR_DOC_HOME}#relocating-application-between-managed-clusters_manage-dr`,
  DR_RELEASE_NOTES: `${ODF_DOC_BASE_PATH}/${ODF_DOC_VERSION}_release_notes/index#disaster_recovery`,
  ACM_OFFLINE_CLUSTER: `${ACM_DOC_BASE_PATH}/troubleshooting/index#troubleshooting-an-offline-cluster`,
};

export const GETTING_STARTED_DR_DOCS = {
  CREATE_POLICY: `${ODF_DR_DOC_HOME}#creating-disaster-recovery-policy-on-hub-cluster_mdr`,
  ENABLE_MONITORING: `${ODF_DR_DOC_HOME}#enable-dr-monitoring_monitor-dr`,
};

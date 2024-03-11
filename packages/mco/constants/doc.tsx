import {
  ODF_DOC_BASE_PATH,
  ODF_DR_DOC_HOME,
  ODF_DR_DOC_APPLY_POLICY,
} from '@odf/shared/constants/doc';

export const ACM_DEFAULT_DOC_VERSION = '2.10';

export const ACM_DOC_HOME = (acmDocVersion) =>
  `https://access.redhat.com/documentation/en-us/red_hat_advanced_cluster_management_for_kubernetes/${acmDocVersion}`;
export const ACM_DOC_BASE_PATH = (acmDocVersion) =>
  `${ACM_DOC_HOME(acmDocVersion)}/html-single`;

export const DOC_LINKS = (odfDocVersion, acmDocVersion) => ({
  APPLY_POLICY: ODF_DR_DOC_APPLY_POLICY(odfDocVersion),
  MDR_FAILOVER: `${ODF_DR_DOC_HOME(
    odfDocVersion
  )}#application-failover-between-managed-clusters_manage-dr`,
  MDR_RELOCATE: `${ODF_DR_DOC_HOME(
    odfDocVersion
  )}#relocating-application-between-managed-clusters_manage-dr`,
  DR_RELEASE_NOTES: `${ODF_DOC_BASE_PATH(
    odfDocVersion
  )}/${odfDocVersion}_release_notes/index#disaster_recovery`,
  ACM_OFFLINE_CLUSTER: `${ACM_DOC_BASE_PATH(
    acmDocVersion
  )}/troubleshooting/index#troubleshooting-an-offline-cluster`,
});

export const GETTING_STARTED_DR_DOCS = (odfDocVersion) => ({
  CREATE_POLICY: `${ODF_DR_DOC_HOME(
    odfDocVersion
  )}#creating-disaster-recovery-policy-on-hub-cluster_mdr`,
  ENABLE_MONITORING: `${ODF_DR_DOC_HOME(
    odfDocVersion
  )}#enable-dr-monitoring_monitor-dr`,
});

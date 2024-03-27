import {
  odfDocBasePath,
  odfDRDocHome,
  odfDRDocApplyPolicy,
} from '@odf/shared/constants/doc';

export const acmDocHome = (acmDocVersion) =>
  `https://access.redhat.com/documentation/en-us/red_hat_advanced_cluster_management_for_kubernetes/${acmDocVersion}`;
export const acmDocBasePath = (acmDocVersion) =>
  `${acmDocHome(acmDocVersion)}/html-single`;

export const docLinks = (mcoDocVersion, acmDocVersion) => ({
  APPLY_POLICY: odfDRDocApplyPolicy(mcoDocVersion),
  MDR_FAILOVER: `${odfDRDocHome(
    mcoDocVersion
  )}#application-failover-between-managed-clusters_manage-dr`,
  MDR_RELOCATE: `${odfDRDocHome(
    mcoDocVersion
  )}#relocating-application-between-managed-clusters_manage-dr`,
  DR_RELEASE_NOTES: `${odfDocBasePath(
    mcoDocVersion
  )}/${mcoDocVersion}_release_notes/index#disaster_recovery`,
  ACM_OFFLINE_CLUSTER: `${acmDocBasePath(
    acmDocVersion
  )}/troubleshooting/index#troubleshooting-an-offline-cluster`,
});

export const gettingStartedDRDocs = (mcoDocVersion) => ({
  CREATE_POLICY: `${odfDRDocHome(
    mcoDocVersion
  )}#creating-disaster-recovery-policy-on-hub-cluster_mdr`,
  ENABLE_MONITORING: `${odfDRDocHome(
    mcoDocVersion
  )}#enable-dr-monitoring_monitor-dr`,
});

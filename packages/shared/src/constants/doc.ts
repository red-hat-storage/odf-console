export const ODF_DEFAULT_DOC_VERSION = '4.18';
export const ACM_DEFAULT_DOC_VERSION = '2.12';

export const odfDocHome = (odfDocVersion) =>
  `https://access.redhat.com/documentation/en-us/red_hat_openshift_data_foundation/${odfDocVersion}`;
export const odfDocBasePath = (odfDocVersion) =>
  `${odfDocHome(odfDocVersion)}/html-single`;
export const odfDRDocHome = (odfDocVersion) =>
  `${odfDocBasePath(
    odfDocVersion
  )}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index`;

export const odfDRDocApplyPolicy = (odfDocVersion) =>
  `${odfDRDocHome(
    odfDocVersion
  )}#apply-drpolicy-to-sample-application_manage-dr`;

export const odfDeployExternalMode = (odfDocVersion) =>
  `${odfDocBasePath(
    odfDocVersion
  )}/deploying_openshift_data_foundation_in_external_mode`;

// Add functions for specific DR-related documentation sections
export const odfDRDocTroubleshooting = (odfDocVersion) =>
  `${odfDRDocHome(odfDocVersion)}/troubleshooting_disaster_recovery`;

export const odfDRDocFailoverStatuses = (odfDocVersion) =>
  `${odfDRDocTroubleshooting(odfDocVersion)}#failover_statuses`;

export const odfDRDocRelocationStatuses = (odfDocVersion) =>
  `${odfDRDocTroubleshooting(odfDocVersion)}#relocation_statuses`;

export const odfDRDocCleaningUpResources = (odfDocVersion) =>
  `${odfDRDocTroubleshooting(odfDocVersion)}#cleaning_up_application_resources`;

export const odfDRDocVolumesSyncingSlowly = (odfDocVersion) =>
  `${odfDRDocTroubleshooting(odfDocVersion)}#volumes_are_sinking_slower_than_usual`;

export const inTransitEncryptionSettingsForRHCS = (
  odfDocVersion: string
): string =>
  `${odfDeployExternalMode(
    odfDocVersion
  )}/deploy-openshift-data-foundation-using-red-hat-ceph-storage#creating-an-openshift-data-foundation-cluster-service-for-external-storage_ceph-external`;

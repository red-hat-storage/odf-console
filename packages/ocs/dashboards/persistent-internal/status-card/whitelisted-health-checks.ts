import { ODF_DOC_BASE_PATH } from '@odf/shared/constants/doc';

export const whitelistedHealthChecksRef = (odfDocVersion) => ({
  MON_DISK_LOW: `${ODF_DOC_BASE_PATH(
    odfDocVersion
  )}/troubleshooting_openshift_data_foundation#resolving-cluster-health-issues_rhodf`,
});

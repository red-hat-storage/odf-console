import { odfDocBasePath } from '@odf/shared/constants/doc';

export const whitelistedHealthChecksRef = (odfDocVersion) => ({
  MON_DISK_LOW: `${odfDocBasePath(
    odfDocVersion
  )}/troubleshooting_openshift_data_foundation#resolving-cluster-health-issues_rhodf`,
});

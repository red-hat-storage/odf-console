export const ODF_DEFAULT_DOC_VERSION = '4.16';
export const ACM_DEFAULT_DOC_VERSION = '2.10';

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

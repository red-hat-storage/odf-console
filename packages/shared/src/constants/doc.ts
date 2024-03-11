export const ODF_DEFAULT_DOC_VERSION = '4.16';

export const ODF_DOC_HOME = (odfDocVersion) =>
  `https://access.redhat.com/documentation/en-us/red_hat_openshift_data_foundation/${odfDocVersion}`;
export const ODF_DOC_BASE_PATH = (odfDocVersion) =>
  `${ODF_DOC_HOME(odfDocVersion)}/html-single`;
export const ODF_DR_DOC_HOME = (odfDocVersion) =>
  `${ODF_DOC_BASE_PATH(
    odfDocVersion
  )}/configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index`;

export const ODF_DR_DOC_APPLY_POLICY = (odfDocVersion) =>
  `${ODF_DR_DOC_HOME(
    odfDocVersion
  )}#apply-drpolicy-to-sample-application_manage-dr`;

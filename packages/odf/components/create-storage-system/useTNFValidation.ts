import { useODFNamespaceSelector } from '@odf/core/redux';
import {
  ConfigMapKind,
  DEFAULT_INFRASTRUCTURE,
  InfrastructureKind,
} from '@odf/shared';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  ConfigMapModel,
  DaemonSetModel,
  InfrastructureModel,
} from '@odf/shared/models';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

const DUAL_REPLICA = 'DualReplica';
const OPENSHIFT_KMM = 'openshift-kmm';
const DRBD_CONFIGURE = 'drbd-configure';
const DRBD_AUTOSTART = 'drbd-autostart';

/**
 * Custom hook to check if two nodes fencing is enabled and perform validations
 */
const useTNFValidation = (): {
  isTNFEnabled: boolean;
  isTNFValidationLoading: boolean;
  isTNFValidated: boolean;
} => {
  const { odfNamespace, isODFNsLoaded } = useODFNamespaceSelector();

  const [infra, infraLoaded, infraLoadError] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );

  const [drbdAutostartDaemonSet, drbdAutostartLoaded, drbdAutostartError] =
    useK8sGet<K8sResourceCommon>(DaemonSetModel, DRBD_AUTOSTART, OPENSHIFT_KMM);

  const [drbdConfigureConfigMap, drbdConfigureLoaded, drbdConfigureError] =
    useK8sGet<ConfigMapKind>(ConfigMapModel, DRBD_CONFIGURE, odfNamespace);

  const isTNFEnabled =
    !infraLoaded || infraLoadError
      ? false
      : infra?.status?.controlPlaneTopology === DUAL_REPLICA;

  const isTNFValidationLoading =
    !infraLoaded ||
    (isTNFEnabled &&
      (!isODFNsLoaded || !drbdAutostartLoaded || !drbdConfigureLoaded));

  const isDrbdAutostartValidated =
    isTNFEnabled &&
    !drbdAutostartError &&
    drbdAutostartLoaded &&
    !!drbdAutostartDaemonSet;

  const isDrbdConfigMapPresent =
    isTNFEnabled &&
    !drbdConfigureError &&
    drbdConfigureLoaded &&
    !!drbdConfigureConfigMap;

  const isTNFValidated =
    isTNFEnabled && isDrbdAutostartValidated && isDrbdConfigMapPresent;

  return {
    isTNFEnabled,
    isTNFValidationLoading,
    isTNFValidated,
  };
};

export default useTNFValidation;

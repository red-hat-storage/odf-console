import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { DASH, RouteModel } from '@odf/shared';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

export const useScaleGuiLink = (): { url: string } => {
  const [route, routeLoaded, routeError] = useK8sWatchResource<any>({
    groupVersionKind: {
      group: RouteModel.apiGroup,
      version: RouteModel.apiVersion,
      kind: RouteModel.kind,
    },
    name: 'ibm-spectrum-scale-gui',
    namespace: IBM_SCALE_NAMESPACE,
  });

  if (!routeLoaded || routeError) {
    return { url: DASH };
  }

  const host = route?.spec?.host;
  if (!host) {
    return { url: DASH };
  }

  return { url: `https://${host}/gui#files-filesystems` };
};

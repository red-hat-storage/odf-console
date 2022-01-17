import * as React from 'react';
import { K8sResourceCommon, k8sGet } from "@openshift-console/dynamic-plugin-sdk";
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const useK8sGet = <R extends K8sResourceCommon = K8sResourceCommon>(
  kind: K8sKind,
  name?: string,
  namespace?: string,
): [R, boolean, any] => {
  const [data, setData] = React.useState<R>();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState();

  React.useEffect(() => {
    const fetch = async () => {
      try {
        setLoadError(null);
        setLoaded(false);
        setData(null);
        const resource = await k8sGet({model: kind, name: name, ns: namespace}) as R;
        setData(resource);
      } catch (error) {
        setLoadError(error);
      } finally {
        setLoaded(true);
      }
    };
    fetch();
  }, [kind, name, namespace]);

  return [data, loaded, loadError];
};

import * as React from 'react';
import {
  K8sResourceCommon,
  k8sList,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const useK8sList = <R extends K8sResourceCommon = K8sResourceCommon>(
  kind: K8sKind,
  namespace?: string
): [R[], boolean, any] => {
  const [data, setData] = React.useState<R[]>();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState();

  React.useEffect(() => {
    const fetch = async () => {
      try {
        setLoadError(null);
        setLoaded(false);
        setData(null);
        const resources = (await k8sList<R>({
          model: kind,
          queryParams: {
            ns: namespace,
          },
          requestInit: null,
        })) as R[];
        setData(resources);
      } catch (error) {
        setLoadError(error);
      } finally {
        setLoaded(true);
      }
    };
    if (kind) fetch();
    else setLoaded(true);
  }, [kind, namespace]);

  return [data, loaded, loadError];
};

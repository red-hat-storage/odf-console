import {
  k8sGet,
  k8sCreate,
  k8sUpdate,
  K8sModel,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';

export function createOrUpdate<T extends K8sResourceCommon>({
  model,
  name,
  namespace,
  mutate,
}: {
  model: K8sModel;
  name: string;
  namespace?: string;
  mutate: (obj: T | null) => T;
}): Promise<T> {
  return k8sGet({ model, name, ns: namespace })
    .then((current) => {
      const updated = mutate(current as T);
      updated.metadata = {
        ...(current as T).metadata,
        ...(updated.metadata || {}),
        resourceVersion: (current as T).metadata?.resourceVersion,
      };
      return k8sUpdate({ model, data: updated }) as Promise<T>;
    })
    .catch((e: any) => {
      if (e?.response?.status === 404) {
        const fresh = mutate(null);
        return k8sCreate({ model, data: fresh }) as Promise<T>;
      }
      return Promise.reject(e);
    });
}

import {
  k8sCreate,
  k8sGet,
  K8sModel,
  K8sResourceCommon,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createOrUpdate<T extends K8sResourceCommon>({
  model,
  name,
  namespace,
  mutate,
  maxRetries = 3,
}: {
  model: K8sModel;
  name: string;
  namespace?: string;
  mutate: (obj: T | null) => T;
  maxRetries?: number;
}): Promise<T> {
  let attempt = 0;
  let lastError: any;

  /* Next loop attempts to sequentially retry create or update operations to avoid conflicts. Hence no-await and continue are being disabled */
  while (attempt < maxRetries) {
    try {
      const current =
        //eslint-disable-next-line no-await-in-loop
        ((await k8sGet({ model, name, ns: namespace })) as T) || ({} as T);

      const updated = mutate(current);

      updated.metadata = {
        ...current.metadata,
        ...updated.metadata,

        name: current.metadata?.name,
        namespace: current.metadata?.namespace,
        uid: current.metadata?.uid,
        resourceVersion: current.metadata?.resourceVersion,
        creationTimestamp: current.metadata?.creationTimestamp,
        generation: current.metadata?.generation,

        ...(current.metadata?.deletionTimestamp && {
          deletionTimestamp: current.metadata?.deletionTimestamp,
          deletionGracePeriodSeconds:
            current.metadata?.deletionGracePeriodSeconds,
        }),

        ...(current.metadata?.managedFields && {
          managedFields: current.metadata?.managedFields,
        }),
      };

      // eslint-disable-next-line no-await-in-loop
      return (await k8sUpdate({ model, data: updated })) as T;
    } catch (e: any) {
      lastError = e;

      if (e?.response?.status === 404) {
        try {
          const fresh = mutate(null);
          // eslint-disable-next-line no-await-in-loop
          return (await k8sCreate({ model, data: fresh })) as T;
        } catch (createError: any) {
          const status = createError?.response?.status;
          if (![400, 401, 403, 422].includes(status) && status < 500) {
            attempt++;
            if (attempt >= maxRetries) break;
            // eslint-disable-next-line no-continue
            continue;
          }
          throw createError;
        }
      }

      const status = e?.response?.status;
      // Retry on 4xx errors other than 400, 401, 403, 422 and all 5xx errors
      if (![400, 401, 403, 422].includes(status) && status < 500) {
        attempt++;
        if (attempt >= maxRetries) break;
        // eslint-disable-next-line no-await-in-loop
        await delay(100 * 2 ** attempt);
        // eslint-disable-next-line no-continue
        continue;
      }

      throw e;
    }
  }

  throw new Error(
    `Failed to createOrUpdate ${model.kind} ${name} after ${maxRetries} attempts. Last error: ${lastError}`
  );
}

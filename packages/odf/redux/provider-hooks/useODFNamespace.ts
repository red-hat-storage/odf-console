import * as React from 'react';
import { SubscriptionModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import { SubscriptionKind } from '@odf/shared/types';
import { k8sList } from '@openshift-console/dynamic-plugin-sdk';
import { useODFNamespaceDispatch } from '../dispatchers';

const FALLBACK_NAMESPACE = 'openshift-storage';
const SPEC_NAME = 'odf-operator';

const isAbortError = (err): boolean => err?.name === 'AbortError';

const namespaceDetector = async (maxAttempt = 5): Promise<string> => {
  let attempt = 0;
  let ns = null;
  let shouldRetry = true;

  while (shouldRetry) {
    shouldRetry = false;
    attempt++;
    try {
      // this rule is to prevent independent async calls in a loop,
      // here for retrying async operations (dependent), it is fine to disable it.
      // eslint-disable-next-line no-await-in-loop
      const subscriptions = (await k8sList({
        model: SubscriptionModel,
        queryParams: { ns: null },
      })) as SubscriptionKind[];
      ns = getNamespace(
        subscriptions.find((subscription) =>
          subscription.spec.name.includes(SPEC_NAME)
        )
      );
      if (!ns) throw new Error('ODF install namespace not found');
    } catch (err) {
      if (attempt <= maxAttempt && !isAbortError(err)) shouldRetry = true;
      else throw err;
    }
  }

  return ns;
};

export const useODFNamespace = (): void => {
  const dispatch = useODFNamespaceDispatch();

  React.useEffect(() => {
    namespaceDetector()
      .then((ns) =>
        dispatch({
          odfNamespace: ns,
          isODFNsLoaded: true,
          odfNsLoadError: undefined,
        })
      )
      /**
       * ODF can be installed in any namespace, still recommended namespace is "openshift-storage".
       * Using it as a fallback alongside storing the error object to the redux store,
       * up to the consumer component what action to take (stick with the fallback or show an error to the user).
       */
      .catch((err) =>
        dispatch({
          odfNamespace: FALLBACK_NAMESPACE,
          isODFNsLoaded: true,
          odfNsLoadError: err,
        })
      );
  }, [dispatch]);
};

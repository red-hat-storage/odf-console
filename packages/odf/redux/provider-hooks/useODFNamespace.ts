import * as React from 'react';
import { isScaleFeatureGateEnabled } from '@odf/core/utils/scale';
import { DEFAULT_STORAGE_NAMESPACE as FALLBACK_NAMESPACE } from '@odf/shared/constants';
import {
  SubscriptionModel,
  ClusterServiceVersionModel,
} from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import { SubscriptionKind, ClusterServiceVersionKind } from '@odf/shared/types';
import { isAbortError } from '@odf/shared/utils';
import {
  k8sList,
  k8sGet,
  SetFeatureFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { useODFNamespaceDispatch } from '../dispatchers';

const CLIENT_SUBSCRIPTION_NAME = 'ocs-client-operator';

const getSpecName = (resource: SubscriptionKind) => resource?.spec?.name;

const ODF_SUBSCRIPTION_NAME = 'odf-operator';

export const FDF_FLAG = 'FDF_FLAG'; // Based on whether installed operator is ODF or FDF
export const SCALE_GATE_FLAG = 'SCALE_GATE'; // Set to "true" if ODF operator is installed

const namespaceDetector = async (
  maxAttempt = 5
): Promise<[string, boolean, boolean]> => {
  let attempt = 0;
  let ns = null;
  let isFDF = false;
  let shouldRetry = true;
  let isScaleFeatureGateEnabledFlag = false;

  while (shouldRetry) {
    shouldRetry = false;
    attempt++;
    try {
      // this rule is to prevent independent async calls in a loop (next call shouldn't be blocked by previous call),
      // here for retrying async operations (dependent as we only want next call when previous completes), it is fine to disable it.
      // eslint-disable-next-line no-await-in-loop
      const subscriptions = (await k8sList({
        model: SubscriptionModel,
        queryParams: { ns: null },
      })) as SubscriptionKind[];
      const odfSubscription = subscriptions.find(
        (subscription) => getSpecName(subscription) === ODF_SUBSCRIPTION_NAME
      );
      const isODFPresent = odfSubscription !== undefined;
      if (isODFPresent) {
        ns = getNamespace(odfSubscription);

        // ToDo: Remove in z-stream (https://bugzilla.redhat.com/show_bug.cgi?id=2294383)
        // eslint-disable-next-line no-await-in-loop
        const csv: ClusterServiceVersionKind = await k8sGet({
          model: ClusterServiceVersionModel,
          name: odfSubscription?.status?.installedCSV,
          ns,
        });
        isFDF = !['redhat', 'red hat'].includes(
          csv?.spec?.provider?.name?.toLowerCase()
        );
        isScaleFeatureGateEnabledFlag = isFDF
          ? isScaleFeatureGateEnabled(odfSubscription)
          : false;
      } else {
        const clientSubscription = subscriptions.find(
          (sub) => getSpecName(sub) === CLIENT_SUBSCRIPTION_NAME
        );
        ns = getNamespace(clientSubscription);
      }
      if (!ns) throw new Error('ODF install namespace not found');
    } catch (err) {
      if (attempt <= maxAttempt && !isAbortError(err)) shouldRetry = true;
      else throw err;
    }
  }

  return [ns, isFDF, isScaleFeatureGateEnabledFlag];
};

export const useODFNamespace = (setFlag: SetFeatureFlag): void => {
  const dispatch = useODFNamespaceDispatch();

  React.useEffect(() => {
    namespaceDetector()
      .then(([ns, isFDF, isScaleFeatureGateEnabledFlag]) => {
        dispatch({
          odfNamespace: ns,
          isODFNsLoaded: true,
          odfNsLoadError: undefined,
        });
        setFlag(FDF_FLAG, isFDF);
        setFlag(SCALE_GATE_FLAG, isScaleFeatureGateEnabledFlag);
      })
      /**
       * ODF can be installed in any namespace, still recommended namespace is "openshift-storage".
       * Using it as a fallback alongside storing the error object to the redux store,
       * up to the consumer component what action to take (stick with the fallback or show an error to the user).
       */
      .catch((err) => {
        dispatch({
          odfNamespace: FALLBACK_NAMESPACE,
          isODFNsLoaded: true,
          odfNsLoadError: err,
        });
        setFlag(FDF_FLAG, false);
      });
  }, [dispatch, setFlag]);
};

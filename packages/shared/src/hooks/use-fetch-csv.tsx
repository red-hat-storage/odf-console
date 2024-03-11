import * as React from 'react';
import {
  ClusterServiceVersionModel,
  SubscriptionModel,
} from '@odf/shared/models';
import { ClusterServiceVersionKind, SubscriptionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  referenceForModel,
  getValidWatchK8sResourceObj,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

export const useFetchCsv = ({
  specName,
  namespace,
  startPollingInstantly = true,
}: UseFetchCsvProps): UseFetchCsvResult => {
  const { t } = useCustomTranslation();
  const [subs, subsLoaded, subsLoadError] = useK8sWatchResource<
    SubscriptionKind[]
  >(
    getValidWatchK8sResourceObj(
      {
        isList: true,
        kind: referenceForModel(SubscriptionModel),
        namespace,
      },
      startPollingInstantly
    )
  );
  const [csvDetails, setCSVDetails] = React.useState({
    csvName: null,
    csvNamespace: null,
  });

  React.useEffect(() => {
    const alreadyHaveDetails =
      !!csvDetails.csvName && !!csvDetails.csvNamespace;
    if (subsLoaded && !subsLoadError && subs?.length && !alreadyHaveDetails) {
      const sub = subs.find((s) => s.spec.name === specName);
      const csvName = sub?.status?.installedCSV;
      const csvNamespace = sub?.metadata?.namespace;
      setCSVDetails({ csvName, csvNamespace });
    }
  }, [specName, subs, subsLoadError, subsLoaded, csvDetails, setCSVDetails]);

  const [csv, csvLoaded, csvLoadError] =
    useK8sWatchResource<ClusterServiceVersionKind>(
      getValidWatchK8sResourceObj(
        {
          kind: referenceForModel(ClusterServiceVersionModel),
          name: csvDetails.csvName,
          namespaced: true,
          namespace: csvDetails.csvNamespace,
          isList: false,
        },
        csvDetails.csvName !== null && csvDetails.csvNamespace !== null
      )
    );

  if (csvDetails.csvName === null || csvDetails.csvNamespace === null) {
    return [undefined, false, undefined];
  }

  if (!csvDetails.csvName || !csvDetails.csvNamespace) {
    return [undefined, true, new Error(t('Not found'))];
  }

  return [csv, csvLoaded, csvLoadError];
};

type UseFetchCsvResult = [ClusterServiceVersionKind, boolean, any];

export type UseFetchCsvProps = {
  specName: string;
  namespace?: string;
  startPollingInstantly?: boolean;
};

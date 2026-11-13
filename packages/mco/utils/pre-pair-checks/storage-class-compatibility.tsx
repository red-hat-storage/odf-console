import * as React from 'react';
import { CEPH_PROVISIONERS, StorageClassModel } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import { Alert, AlertVariant } from '@patternfly/react-core';
import { STORAGE_ID_LABEL_KEY } from '../../constants';
import { useACMSafeFetch } from '../../hooks';
import { SearchResult } from '../../types';
import {
  getLabelsFromSearchResult,
  queryStorageClassesUsingClusterNames,
} from '../../utils';
import { fireManagedClusterView } from '../managed-cluster-view';
import type {
  PrePairCheck,
  PrePairCheckRenderProps,
  PrePairCheckResult,
} from '../storage-vendor-registry';

const PROVISIONER = 'provisioner';

type ClusterSCMapEntry = { clusterName: string; scString: string };

const fetchProvisionerIfMissing = async (
  scName: string,
  clusterName: string,
  t: TFunction
) => {
  const viewResponse = await fireManagedClusterView(
    scName,
    '',
    StorageClassModel.kind,
    StorageClassModel.apiVersion,
    StorageClassModel.apiGroup,
    clusterName,
    t
  );
  return viewResponse;
};

const getClusterToSCMap = async (
  searchResult: SearchResult,
  searchLoaded: boolean,
  searchError: Error | null,
  t: TFunction
): Promise<Map<string, string[]>> => {
  const clusterToSCMap: Map<string, string[]> = new Map();

  if (searchLoaded && !searchError) {
    const allSCs =
      searchResult?.data?.searchResult?.flatMap((result) => result?.items) ||
      [];
    const provisionerResults = await Promise.allSettled(
      allSCs.map(async (sc): Promise<ClusterSCMapEntry | null> => {
        const clusterName = sc.cluster;
        let provisioner: string = sc?.[PROVISIONER] ?? '';

        if (!provisioner) {
          const viewResponse = await fetchProvisionerIfMissing(
            sc.name,
            clusterName,
            t
          );
          provisioner = viewResponse.result?.[PROVISIONER] ?? '';
        }

        const storageID =
          getLabelsFromSearchResult(sc)?.[STORAGE_ID_LABEL_KEY]?.[0] ?? '';
        const isValidCephProvisioner = CEPH_PROVISIONERS.some(
          (allowedProvisioner) => provisioner.includes(allowedProvisioner)
        );

        if (isValidCephProvisioner && storageID !== '') {
          const scString = `${sc.name}/${provisioner}`;
          return { clusterName, scString };
        }
        return null;
      })
    );

    provisionerResults.forEach((result) => {
      if (result.status !== 'fulfilled' || !result.value) {
        return;
      }
      const { clusterName, scString } = result.value;
      const existingSCs = clusterToSCMap.get(clusterName) ?? [];
      existingSCs.push(scString);
      clusterToSCMap.set(clusterName, existingSCs);
    });
  }

  return clusterToSCMap;
};

const findSupportedStorageClasses = (
  firstClusterSCs: string[],
  secondClusterSCs: string[]
): boolean => {
  const secondClusterSet = new Set(secondClusterSCs);
  return firstClusterSCs.some((sc) => secondClusterSet.has(sc));
};

const validateClusterDetails = (
  clusterToSCMap: Map<string, string[]>
): boolean => {
  const [firstClusterSCs = [], secondClusterSCs = []] = Array.from(
    clusterToSCMap.values()
  );
  return findSupportedStorageClasses(firstClusterSCs, secondClusterSCs);
};

const useStorageClassCompatibilityCheck = (
  clusterNames: string[],
  enabled: boolean
): PrePairCheckResult => {
  const { t } = useCustomTranslation();
  const [result, setResult] = React.useState<boolean>(false);
  const [isCompleted, setCompleted] = React.useState(false);
  const [clusterSCMapError, setClusterSCMapError] = React.useState<
    string | null
  >(null);

  const searchQuery = React.useMemo(
    () => queryStorageClassesUsingClusterNames(clusterNames),
    [clusterNames]
  );

  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  React.useEffect(() => {
    if (!enabled) {
      setCompleted(true);
      setResult(true);
      return;
    }

    setCompleted(false);
    setClusterSCMapError(null);

    if (searchLoaded && !searchError) {
      getClusterToSCMap(searchResult, searchLoaded, searchError, t)
        .then((clusterToSCMap) => {
          setResult(validateClusterDetails(clusterToSCMap));
          setCompleted(true);
        })
        .catch((error) => {
          setClusterSCMapError(
            error instanceof Error
              ? error.message
              : t('something went wrong while getting storageclasses')
          );
          setCompleted(true);
        });
    } else if (searchError) {
      setCompleted(true);
    }
  }, [enabled, searchResult, searchError, searchLoaded, t]);

  return {
    id: 'storage-class-compatibility',
    loaded: isCompleted,
    loadError: searchError || clusterSCMapError,
    canProceed: result,
  };
};

const StorageClassCompatibilityRender: React.FC<PrePairCheckRenderProps> = ({
  result,
}) => {
  const { t } = useCustomTranslation();

  if (!result.loaded) {
    return null;
  }

  if (result.canProceed) {
    return null;
  }

  return (
    <Alert
      className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
      title={t('Cannot proceed with policy creation.')}
      variant={AlertVariant.danger}
      isInline
    >
      {t(
        'No common storage class found for the selected managed clusters. ' +
          'To create a DR policy, a common storage class must exist, ' +
          'if not configured already, provision a common storage class and try again.'
      )}
    </Alert>
  );
};

export const storageClassCompatibilityCheck: PrePairCheck = {
  id: 'storage-class-compatibility',
  useCheck: useStorageClassCompatibilityCheck,
  render: StorageClassCompatibilityRender,
};

import * as React from 'react';
import { PrePairCheckId, STORAGE_ID_LABEL_KEY } from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks/acm-safe-fetch';
import { SearchResult } from '@odf/mco/types';
import { queryStorageClassesUsingClusterNames } from '@odf/mco/utils/acm-search-queries';
import { getLabelsFromSearchResult } from '@odf/mco/utils/disaster-recovery';
import { fireManagedClusterView } from '@odf/mco/utils/managed-cluster-view';
import type { PrePairCheckResult } from '@odf/mco/utils/storage-vendor-registry';
import { CEPH_PROVISIONERS, StorageClassModel } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import { Alert, AlertVariant } from '@patternfly/react-core';
import type {
  PrePairCheck,
  PrePairCheckInput,
  PrePairCheckRenderProps,
} from './types';

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

const useStorageClassCompatibilityCheck = ({
  clusterNames,
  enabled,
}: PrePairCheckInput): PrePairCheckResult => {
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
      return undefined;
    }

    // A lookup for a previous pair can settle after this one; ignore it.
    let isCurrent = true;
    setCompleted(false);
    setClusterSCMapError(null);

    if (searchLoaded && !searchError) {
      getClusterToSCMap(searchResult, searchLoaded, searchError, t)
        .then((clusterToSCMap) => {
          if (!isCurrent) return;
          setResult(validateClusterDetails(clusterToSCMap));
          setCompleted(true);
        })
        .catch((error) => {
          if (!isCurrent) return;
          setResult(false);
          setClusterSCMapError(
            error instanceof Error
              ? error.message
              : t('something went wrong while getting storageclasses')
          );
          setCompleted(true);
        });
    } else if (searchError) {
      // Drop a pass recorded while the check was disabled.
      setResult(false);
      setCompleted(true);
    }

    return () => {
      isCurrent = false;
    };
  }, [enabled, searchResult, searchError, searchLoaded, t]);

  const loadError = enabled ? searchError || clusterSCMapError : null;
  return {
    id: PrePairCheckId.StorageClassCompatibility,
    loaded: isCompleted,
    loadError,
    canProceed: isCompleted && result && !loadError,
  };
};

const StorageClassCompatibilityRender: React.FC<PrePairCheckRenderProps> = ({
  clusterNames,
  result,
}) => {
  const { t } = useCustomTranslation();

  if (!result.loaded) {
    return null;
  }

  // Not a missing storage class: the lookup itself failed.
  if (result.loadError) {
    return (
      <StatusBox
        data={clusterNames}
        loaded={result.loaded}
        loadError={result.loadError}
      />
    );
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
  id: PrePairCheckId.StorageClassCompatibility,
  useCheck: useStorageClassCompatibilityCheck,
  Render: StorageClassCompatibilityRender,
};

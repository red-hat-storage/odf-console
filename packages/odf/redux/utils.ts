import { useODFSystemFlagsSelector } from './selectors/odf-system-flags';

type ClusterDetails = {
  clusterName: string;
  clusterNamespace: string;
};

export const useGetInternalClusterDetails = (): ClusterDetails => {
  const { systemFlags } = useODFSystemFlagsSelector();

  const internalClusterDetails = Object.entries(systemFlags).find(
    ([, info]) => info.isInternalMode
  );
  if (!internalClusterDetails) {
    return {
      clusterName: '',
      clusterNamespace: '',
    };
  }

  return {
    clusterName: internalClusterDetails[1].odfSystemName,
    clusterNamespace: internalClusterDetails[0],
  };
};

export const useGetExternalClusterDetails = (): ClusterDetails => {
  const { systemFlags } = useODFSystemFlagsSelector();

  const externalClusterDetails = Object.entries(systemFlags).find(
    ([, info]) => info.isExternalMode
  );
  if (!externalClusterDetails) {
    return {
      clusterName: '',
      clusterNamespace: '',
    };
  }

  return {
    clusterName: externalClusterDetails[1].odfSystemName,
    clusterNamespace: externalClusterDetails[0],
  };
};

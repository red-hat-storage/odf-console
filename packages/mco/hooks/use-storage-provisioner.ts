export type Provider = { displayName: string; count: number };
export type ClusterProviders = {
  cluster: string;
  providers: Provider[];
};

/* export function useStorageProvisioners(clusters: string[]): {
  providersByCluster: ClusterProviders[];
  count: number;
  loaded: boolean;
  error: any;
} {
  const searchQuery = React.useMemo(
    () => queryStorageClassesUsingClusterNames(clusters),
    [clusters]
  );
  const [result, error, loaded] = useACMSafeFetch(searchQuery);

  const rawItems = React.useMemo<
    Array<{ cluster: string; name: string; provisioner: string }>
  >(() => {
    return (
      result?.data?.searchResult
        ?.flatMap((sr: any) => sr.items || [])
        .map((i: any) => ({
          cluster: i.cluster as string,
          name: i.metadata?.name ?? i.name,
          provisioner: i.provisioner as string,
        })) ?? []
    );
  }, [result]);

  const itemsByCluster = React.useMemo<
    Record<string, Array<{ name: string; provisioner: string }>>
  >(() => {
    return rawItems.reduce(
      (acc, { cluster, name, provisioner }) => {
        if (!acc[cluster]) {
          acc[cluster] = [];
        }
        acc[cluster].push({ name, provisioner });
        return acc;
      },
      {} as Record<string, Array<{ name: string; provisioner: string }>>
    );
  }, [rawItems]);

  const providersByCluster = React.useMemo<ClusterProviders[]>(() => {
    if (!loaded) return [];

    const supportedProvisioners = [...CEPH_PROVISIONERS, ...IBM_PROVISIONERS];

    return Object.entries(itemsByCluster).map(([cluster, items]) => {
      const odfCount = items.filter((i) =>
        supportedProvisioners.includes(i.provisioner)
      ).length;

      const tpMap = new Map<string, number>();
      items.forEach(({ provisioner }) => {
        if (!supportedProvisioners.includes(provisioner)) {
          tpMap.set(provisioner, (tpMap.get(provisioner) || 0) + 1);
        }
      });

      const provs: Provider[] = [];
      if (odfCount > 0) {
        provs.push({ displayName: 'Data Foundation', count: odfCount });
      }
      tpMap.forEach((cnt, prov) =>
        provs.push({ displayName: prov, count: cnt })
      );

      return { cluster, providers: provs };
    });
  }, [loaded, itemsByCluster]);

  return {
    providersByCluster,
    count: providersByCluster.length,
    loaded,
    error,
  };
}
 */

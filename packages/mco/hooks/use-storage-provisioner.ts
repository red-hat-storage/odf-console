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
      const provMap = new Map<string, number>();
      items.forEach(({ provisioner }) => {
        const isODF = supportedProvisioners.some((sp) =>
          provisioner.includes(sp)
        );
        const displayName = isODF
          ? `${provisioner} [Data Foundation]`
          : provisioner;
        provMap.set(displayName, (provMap.get(displayName) || 0) + 1);
      });
      const provs: Provider[] = [];
      provMap.forEach((cnt, prov) =>
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

import * as React from 'react';
import { getMajorVersion, isMinimumSupportedODFVersion } from '@odf/mco/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DataList,
  DataListItem,
  DataListItemRow,
  DataListCheck,
  DataListItemCells,
  DataListCell,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Select,
  SelectOption,
  SearchInput,
  DataListCheckProps,
  TextContent,
  TextVariants,
  Text,
  Bullseye,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  MANAGED_CLUSTER_REGION_CLAIM,
  HUB_CLUSTER_NAME,
  ClusterClaimTypes,
} from '../../../constants';
import { ACMManagedClusterModel } from '../../../models';
import { ACMManagedClusterKind } from '../../../types';
import {
  DRPolicyState,
  DRPolicyAction,
  DRPolicyActionType,
  Cluster,
  ODFInfo,
} from './reducer';
import './select-cluster-list.scss';

const getFilteredClusters = (
  clusters: Cluster[],
  region: string,
  name: string
) => {
  let filteredClusters = clusters;

  if (region)
    filteredClusters = filteredClusters.filter((c) => c.region === region);
  if (name)
    filteredClusters = filteredClusters.filter((c) => c.name.includes(name));
  return filteredClusters;
};

const fetchRegion = (cluster: ACMManagedClusterKind): string =>
  cluster?.status?.clusterClaims?.reduce(
    (region, claim) =>
      claim?.name === MANAGED_CLUSTER_REGION_CLAIM ? claim?.value : region,
    ''
  );

const fetchODFInfo = (
  cluster: ACMManagedClusterKind,
  requiredODFVersion: string
): ODFInfo => {
  const odfVersionClaim = cluster?.status?.clusterClaims?.find(
    (claim) => claim.name === ClusterClaimTypes.ODF_VERSION
  );
  const storageClusterNameClaim = cluster?.status?.clusterClaims?.find(
    (claim) => claim.name === ClusterClaimTypes.STORAGE_CLUSTER_NAME
  );
  const storageSystemNameClaim = cluster?.status?.clusterClaims?.find(
    (claim) => claim.name === ClusterClaimTypes.STORAGE_SYSTEM_NAME
  );
  const cephFsidClaim = cluster?.status?.clusterClaims?.find(
    (claim) => claim.name === ClusterClaimTypes.CEPH_FSID
  );
  return {
    odfVersion: odfVersionClaim?.value || '',
    storageSystemName: storageSystemNameClaim?.value || '',
    storageClusterName: storageClusterNameClaim?.value || '',
    cephFSID: cephFsidClaim?.value || '',
    isValidODFVersion: isMinimumSupportedODFVersion(
      getMajorVersion(odfVersionClaim?.value),
      requiredODFVersion
    ),
  };
};

const filterRegions = (filteredClusters: Cluster[]) =>
  filteredClusters?.reduce((acc, cluster) => {
    if (!acc.includes(cluster?.region) && cluster?.region !== '') {
      acc.push(cluster?.region);
    }
    return acc;
  }, []);

const getManagedClusterInfo = (
  cluster: ACMManagedClusterKind,
  requiredODFVersion: string
): Cluster => ({
  name: cluster?.metadata?.name,
  region: fetchRegion(cluster) ?? '',
  ...fetchODFInfo(cluster, requiredODFVersion),
});

type SelectClusterListProps = {
  state: DRPolicyState;
  requiredODFVersion: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export const SelectClusterList: React.FC<SelectClusterListProps> = ({
  state,
  requiredODFVersion,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const { selectedClusters } = state;
  const [isRegionOpen, setIsRegionOpen] = React.useState(false);
  const [region, setRegion] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');
  const [clusters, setClusters] = React.useState<Cluster[]>([]);

  const [
    acmManagedClusters,
    acmManagedClustersLoaded,
    acmManagedClustersLoadError,
  ] = useK8sWatchResource<ACMManagedClusterKind[]>({
    kind: referenceForModel(ACMManagedClusterModel),
    isList: true,
    namespaced: false,
    cluster: HUB_CLUSTER_NAME,
  });

  React.useEffect(() => {
    if (
      acmManagedClustersLoaded &&
      !!requiredODFVersion &&
      !acmManagedClustersLoadError
    ) {
      setClusters(
        acmManagedClusters?.reduce(
          (obj, acmManagedCluster) => [
            ...obj,
            getManagedClusterInfo(acmManagedCluster, requiredODFVersion),
          ],
          []
        )
      );
    }
  }, [
    acmManagedClusters,
    acmManagedClustersLoaded,
    acmManagedClustersLoadError,
    requiredODFVersion,
  ]);

  const filteredClusters: Cluster[] = React.useMemo(
    () => getFilteredClusters(clusters, region, nameSearch),
    [clusters, region, nameSearch]
  );

  const onSelect: DataListCheckProps['onChange'] = (checked, event) => {
    const {
      name,
      region,
      odfVersion,
      storageClusterName,
      storageSystemName,
      cephFSID,
      isValidODFVersion,
    } = filteredClusters?.[Number(event.currentTarget.id)];
    const selectedClusterList = checked
      ? [
          ...selectedClusters,
          {
            name,
            region,
            cephFSID,
            storageSystemName,
            storageClusterName,
            odfVersion,
            isValidODFVersion,
          },
        ]
      : selectedClusters.filter((cluster) => cluster?.name !== name);
    dispatch({
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
      payload: selectedClusterList,
    });
  };

  // **Note: PatternFly change the fn signature
  // From: (value: string, event: React.FormEvent<HTMLInputElement>) => void
  // To: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  // both cases need to be handled for backwards compatibility
  const onChange = (input: any) => {
    const searchValue =
      typeof input === 'string'
        ? input
        : (input.target as HTMLInputElement)?.value;
    setNameSearch(searchValue);
  };

  return (
    <div className="mco-select-cluster-list">
      <Toolbar isSticky>
        <ToolbarContent>
          <ToolbarItem className="mco-select-cluster-list__filter-toolbar-item">
            <Select
              toggleId="region-select"
              isOpen={isRegionOpen}
              onToggle={(open) => {
                setIsRegionOpen(open);
              }}
              onSelect={(_, selection, isPlaceholder) => {
                setRegion(isPlaceholder ? '' : (selection as string));
                setIsRegionOpen(false);
              }}
              selections={region}
            >
              <SelectOption
                value={t('Region')}
                isPlaceholder
                data-test="region-default-select-option"
              />
              <>
                {filterRegions(filteredClusters).map((region) => (
                  <SelectOption
                    value={region}
                    key={region}
                    data-test="region-select-option"
                  />
                ))}
              </>
            </Select>
          </ToolbarItem>
          <ToolbarItem className="mco-select-cluster-list__search-toolbar-item">
            <SearchInput
              data-test="cluster search"
              aria-label={t('Cluster search')}
              placeholder={t('Cluster name')}
              onChange={onChange}
              value={nameSearch}
              onClear={() => setNameSearch('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredClusters.length === 0 ? (
        <Bullseye
          data-test="no-cluster-bullseye"
          className="mco-select-cluster-list__bullseye"
        >
          {t('No clusters found')}
        </Bullseye>
      ) : (
        <DataList
          aria-label={t('Select cluster list')}
          isCompact
          className="mco-select-cluster-list__data-list"
        >
          {filteredClusters.map((fc, index) => (
            <DataListItem key={fc?.name}>
              <DataListItemRow>
                <DataListCheck
                  data-test="managed-cluster-checkbox"
                  aria-labelledby={t('Checkbox to select cluster')}
                  id={index.toString()}
                  onChange={onSelect}
                  isChecked={selectedClusters?.some(
                    (cluster) => cluster?.name === fc.name
                  )}
                  isDisabled={
                    (selectedClusters ?? []).length === MAX_ALLOWED_CLUSTERS &&
                    !(selectedClusters ?? []).some(
                      (cluster) => cluster?.name === fc.name
                    )
                  }
                />
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key={fc.name}>
                      <TextContent>
                        <Text component={TextVariants.p}>{fc.name}</Text>
                        <Text component={TextVariants.small}>{fc.region}</Text>
                      </TextContent>
                    </DataListCell>,
                  ]}
                />
              </DataListItemRow>
            </DataListItem>
          ))}
        </DataList>
      )}
    </div>
  );
};

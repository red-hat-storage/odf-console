import * as React from 'react';
import { getManagedClusterResourceObj } from '@odf/mco/hooks';
import {
  getMajorVersion,
  ValidateManagedClusterCondition,
  getValueFromClusterClaim,
  isMinimumSupportedODFVersion,
} from '@odf/mco/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
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
  SearchInput,
  DataListCheckProps,
  TextContent,
  TextVariants,
  Text,
  Tooltip,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  MANAGED_CLUSTER_REGION_CLAIM,
  MANAGED_CLUSTER_JOINED,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  ClusterClaimTypes,
} from '../../constants';
import { ACMManagedClusterKind } from '../../types';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
  ODFConfigInfoType,
} from './reducer';
import './select-cluster-list.scss';

const getFilteredClusters = (
  clusters: ManagedClusterInfoType[],
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

const getODFInfo = (
  managedCluster: ACMManagedClusterKind,
  requiredODFVersion: string
): ODFConfigInfoType => {
  const clusterClaims = managedCluster?.status?.clusterClaims;
  const odfVersion = getValueFromClusterClaim(
    clusterClaims,
    ClusterClaimTypes.ODF_VERSION
  );
  const storageClusterNamespacedName = getValueFromClusterClaim(
    clusterClaims,
    ClusterClaimTypes.STORAGE_CLUSTER_NAME
  );
  const storageSystemNamespacedName = getValueFromClusterClaim(
    clusterClaims,
    ClusterClaimTypes.STORAGE_SYSTEM_NAME
  );
  const cephFsid = getValueFromClusterClaim(
    clusterClaims,
    ClusterClaimTypes.CEPH_FSID
  );
  const storageClusterCount = getValueFromClusterClaim(
    clusterClaims,
    ClusterClaimTypes.STORAGE_CLUSTER_COUNT
  );
  const isDROptimized = getValueFromClusterClaim(
    clusterClaims,
    ClusterClaimTypes.DR_OPTIMIZED
  );
  return {
    odfVersion: odfVersion,
    isValidODFVersion: isMinimumSupportedODFVersion(
      getMajorVersion(odfVersion),
      requiredODFVersion
    ),
    storageClusterCount: Number(storageClusterCount || '0'),
    storageClusterInfo: {
      storageClusterNamespacedName: storageClusterNamespacedName,
      storageSystemNamespacedName: storageSystemNamespacedName,
      cephFSID: cephFsid,
      isDROptimized: isDROptimized === 'true',
    },
  };
};

const filterRegions = (filteredClusters: ManagedClusterInfoType[]) =>
  filteredClusters?.reduce((acc, cluster) => {
    if (!acc.includes(cluster?.region) && cluster?.region !== '') {
      acc.push(cluster?.region);
    }
    return acc;
  }, []);

const getManagedClusterInfo = (
  cluster: ACMManagedClusterKind,
  requiredODFVersion: string
): ManagedClusterInfoType => ({
  name: getName(cluster),
  namesapce: getNamespace(cluster),
  region: getValueFromClusterClaim(
    cluster?.status?.clusterClaims,
    MANAGED_CLUSTER_REGION_CLAIM
  ),
  isManagedClusterAvailable: ValidateManagedClusterCondition(
    cluster,
    MANAGED_CLUSTER_CONDITION_AVAILABLE
  ),
  odfInfo: getODFInfo(cluster, requiredODFVersion),
});

const isChecked = (clusters: ManagedClusterInfoType[], clusterName: string) =>
  clusters?.some((cluster) => cluster?.name === clusterName);

const isDisabled = (
  clusters: ManagedClusterInfoType[],
  clusterName: string,
  storageClusterCount: number
) =>
  (clusters.length === MAX_ALLOWED_CLUSTERS &&
    !clusters.some((cluster) => cluster?.name === clusterName)) ||
  storageClusterCount > 1;

export const SelectClusterList: React.FC<SelectClusterListProps> = ({
  selectedClusters,
  requiredODFVersion,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isRegionOpen, setIsRegionOpen] = React.useState(false);
  const [region, setRegion] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');

  const [managedClusters, loaded, loadError] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const clusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (!!requiredODFVersion && loaded && !loadError) {
      return managedClusters?.reduce(
        (acc, cluster) =>
          ValidateManagedClusterCondition(cluster, MANAGED_CLUSTER_JOINED)
            ? [...acc, getManagedClusterInfo(cluster, requiredODFVersion)]
            : acc,
        []
      );
    }
    return [];
  }, [requiredODFVersion, managedClusters, loaded, loadError]);

  const filteredClusters: ManagedClusterInfoType[] = React.useMemo(
    () => getFilteredClusters(clusters, region, nameSearch),
    [clusters, region, nameSearch]
  );

  const onChange: DataListCheckProps['onChange'] = (event, checked) => {
    const selectedClusterInfo = filteredClusters.find(
      (filteredCluster) => filteredCluster.name === event.currentTarget.id
    );
    const selectedClusterList = checked
      ? [...selectedClusters, selectedClusterInfo]
      : selectedClusters.filter(
          (cluster) => cluster?.name !== selectedClusterInfo.name
        );
    dispatch({
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
      payload: selectedClusterList,
    });
  };

  // **Note: PatternFly change the fn signature
  // From: (value: string, event: React.FormEvent<HTMLInputElement>) => void
  // To: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  // both cases need to be handled for backwards compatibility
  const onSearch = (input: any) => {
    const searchValue =
      typeof input === 'string'
        ? input
        : (input.target as HTMLInputElement)?.value;
    setNameSearch(searchValue);
  };

  const onSelect = (selection: string, isPlaceholder: boolean) => {
    setRegion(isPlaceholder ? '' : selection);
    setIsRegionOpen(false);
  };

  return (
    <div className="mco-select-cluster-list">
      <Toolbar isSticky>
        <ToolbarContent>
          <ToolbarItem className="mco-select-cluster-list__filter-toolbar-item">
            <Select
              toggleId="region-select"
              isOpen={isRegionOpen}
              onToggle={(_event, open) => {
                setIsRegionOpen(open);
              }}
              onSelect={(_event, value, placeholder) =>
                onSelect(value as string, placeholder)
              }
              selections={region}
            >
              <SelectOption
                value={t('Region')}
                isPlaceholder
                data-test="region-default-select-option"
              />
              <>
                {filterRegions(filteredClusters).map((clusterRegion) => (
                  <SelectOption
                    value={clusterRegion}
                    key={clusterRegion}
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
              onChange={onSearch}
              value={nameSearch}
              onClear={() => setNameSearch('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <StatusBox
        data={!!nameSearch ? filteredClusters : managedClusters}
        loadError={loadError}
        loaded={loaded && !!clusters.length}
      >
        <DataList
          aria-label={t('Select cluster list')}
          isCompact
          className="mco-select-cluster-list__data-list"
        >
          {filteredClusters.map((filteredCluster) => (
            <DataListItem key={filteredCluster?.name}>
              <DataListItemRow>
                <Tooltip
                  content={t(
                    'You cannot select this cluster as it has multiple storage instances.'
                  )}
                  trigger={
                    filteredCluster?.odfInfo?.storageClusterCount > 1
                      ? 'mouseenter'
                      : 'manual'
                  }
                >
                  <>
                    <DataListCheck
                      data-test="managed-cluster-checkbox"
                      aria-labelledby={t('Checkbox to select cluster')}
                      id={filteredCluster?.name}
                      onChange={onChange}
                      isChecked={isChecked(
                        selectedClusters,
                        filteredCluster?.name
                      )}
                      isDisabled={isDisabled(
                        selectedClusters,
                        filteredCluster?.name,
                        filteredCluster?.odfInfo?.storageClusterCount
                      )}
                    />
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key={filteredCluster.name}>
                          <TextContent>
                            <Text component={TextVariants.p}>
                              {filteredCluster.name}
                            </Text>
                            <Text component={TextVariants.small}>
                              {filteredCluster.region}
                            </Text>
                          </TextContent>
                        </DataListCell>,
                      ]}
                    />
                  </>
                </Tooltip>
              </DataListItemRow>
            </DataListItem>
          ))}
        </DataList>
      </StatusBox>
    </div>
  );
};

type SelectClusterListProps = {
  selectedClusters: ManagedClusterInfoType[];
  requiredODFVersion: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

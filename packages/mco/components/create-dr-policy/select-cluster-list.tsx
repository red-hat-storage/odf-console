import * as React from 'react';
import {
  getManagedClusterResourceObj,
  getManagedClusterViewResourceObj,
} from '@odf/mco/hooks';
import {
  getMajorVersion,
  getManagedClusterCondition,
  getValueFromClusterClaim,
  isMinimumSupportedODFVersion,
} from '@odf/mco/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ConfigMapKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
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
  Tooltip,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  MANAGED_CLUSTER_REGION_CLAIM,
  MANAGED_CLUSTER_JOINED,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  ODF_CONFIG_MCV_REF_LABEL,
} from '../../constants';
import {
  ACMManagedClusterKind,
  ACMManagedClusterViewKind,
  ODFConfigKind,
} from '../../types';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from './reducer';
import './select-cluster-list.scss';

const getClusterWiseODFInfo = (
  managedClusterViews: ACMManagedClusterViewKind[]
): ClusterWiseODFConfigType =>
  managedClusterViews?.reduce((acc, mcv) => {
    const configMap: ConfigMapKind = mcv?.status?.result;
    return {
      ...acc,
      [getNamespace(mcv)]: [
        ...(acc[getNamespace(mcv)] || []),
        configMap?.data as ODFConfigKind,
      ],
    };
  }, {} as ClusterWiseODFConfigType);

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

const filterRegions = (filteredClusters: ManagedClusterInfoType[]) =>
  filteredClusters?.reduce((acc, cluster) => {
    if (!acc.includes(cluster?.region) && cluster?.region !== '') {
      acc.push(cluster?.region);
    }
    return acc;
  }, []);

const getManagedClusterInfo = (
  cluster: ACMManagedClusterKind,
  requiredODFVersion: string,
  odfConfigInfo: ODFConfigKind[]
): ManagedClusterInfoType => ({
  name: getName(cluster),
  namesapce: getNamespace(cluster),
  region: getValueFromClusterClaim(cluster, MANAGED_CLUSTER_REGION_CLAIM),
  isManagedClusterAvailable: !!getManagedClusterCondition(
    cluster,
    MANAGED_CLUSTER_CONDITION_AVAILABLE
  ),
  ...(!!odfConfigInfo
    ? {
        odfInfo: {
          odfConfigInfo,
          odfVersion: odfConfigInfo[0].ODFVersion,
          isValidODFVersion: isMinimumSupportedODFVersion(
            getMajorVersion(odfConfigInfo[0].ODFVersion),
            requiredODFVersion
          ),
        },
      }
    : {}),
});

const getResources = () => ({
  managedClusters: getManagedClusterResourceObj(),
  managedClusterViews: getManagedClusterViewResourceObj({
    selector: { matchLabels: { [ODF_CONFIG_MCV_REF_LABEL]: 'true' } },
  }),
});

export const SelectClusterList: React.FC<SelectClusterListProps> = ({
  selectedClusters,
  requiredODFVersion,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isRegionOpen, setIsRegionOpen] = React.useState(false);
  const [region, setRegion] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');

  const response = useK8sWatchResources<WatchResourceType>(getResources());

  const {
    data: managedClusters,
    loaded: managedClustersLoaded,
    loadError: managedClustersLoadError,
  } = response.managedClusters;

  const {
    data: managedClusterViews,
    loaded: managedClusterViewsLoaded,
    loadError: managedClusterViewsLoadError,
  } = response.managedClusterViews;

  const loaded = managedClustersLoaded && managedClusterViewsLoaded;
  const loadError = managedClustersLoadError || managedClusterViewsLoadError;

  const clusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (!!requiredODFVersion && loaded && !loadError) {
      const clusterWiseODFInfo = getClusterWiseODFInfo(managedClusterViews);
      return managedClusters?.reduce(
        (acc, cluster) =>
          !!getManagedClusterCondition(cluster, MANAGED_CLUSTER_JOINED)
            ? [
                ...acc,
                getManagedClusterInfo(
                  cluster,
                  requiredODFVersion,
                  clusterWiseODFInfo?.[getName(cluster)]
                ),
              ]
            : acc,
        []
      );
    }
    return [];
  }, [
    requiredODFVersion,
    managedClusters,
    managedClusterViews,
    loaded,
    loadError,
  ]);

  const filteredClusters: ManagedClusterInfoType[] = React.useMemo(
    () => getFilteredClusters(clusters, region, nameSearch),
    [clusters, region, nameSearch]
  );

  const onSelect: DataListCheckProps['onChange'] = (checked, event) => {
    const selectedClusterInfo =
      filteredClusters?.[Number(event.currentTarget.id)];
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
              onChange={onChange}
              value={nameSearch}
              onClear={() => setNameSearch('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <StatusBox
        data={!!nameSearch ? filteredClusters : managedClusters}
        loadError={loadError}
        loaded={loaded ? !!clusters.length : loaded}
      >
        <DataList
          aria-label={t('Select cluster list')}
          isCompact
          className="mco-select-cluster-list__data-list"
        >
          {filteredClusters.map((fc, index) => (
            <DataListItem key={fc?.name}>
              <DataListItemRow>
                <Tooltip
                  content={t(
                    'Cannot be selected as it has multiple storage instances.'
                  )}
                  trigger={
                    fc?.odfInfo?.odfConfigInfo.length > 1
                      ? 'mouseenter'
                      : 'manual'
                  }
                >
                  <>
                    <DataListCheck
                      data-testid={fc.name}
                      data-test="managed-cluster-checkbox"
                      aria-labelledby={t('Checkbox to select cluster')}
                      id={index.toString()}
                      onChange={onSelect}
                      isChecked={selectedClusters?.some(
                        (cluster) => cluster?.name === fc.name
                      )}
                      isDisabled={
                        (selectedClusters.length === MAX_ALLOWED_CLUSTERS &&
                          !selectedClusters.some(
                            (cluster) => cluster?.name === fc.name
                          )) ||
                        fc?.odfInfo?.odfConfigInfo.length > 1
                      }
                    />
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key={fc.name}>
                          <TextContent>
                            <Text component={TextVariants.p}>{fc.name}</Text>
                            <Text component={TextVariants.small}>
                              {fc.region}
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

type WatchResourceType = {
  managedClusters: ACMManagedClusterKind[];
  managedClusterViews: ACMManagedClusterViewKind[];
};

type ClusterWiseODFConfigType = {
  [name in string]: ODFConfigKind[];
};

import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
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
} from '../../../constants/dr-policy';
import { ACMManagedClusterModel } from '../../../models';
import { ACMManagedClusterKind } from '../../../types';
import './select-cluster-list.scss';

export type Cluster = {
  name: string;
  region: string;
} & ODFInfo;

type ODFInfo = {
  storageClusterName?: string;
  storageSystemName?: string;
  storageClusterId?: string;
  odfVersion?: string;
  isValidODFVersion?: boolean;
  storageSystemLoaded?: boolean;
  storageClusterIdLoaded?: boolean;
  csvLoaded?: boolean;
};

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
      region || (claim?.name === MANAGED_CLUSTER_REGION_CLAIM && claim?.value),
    ''
  );

const filterRegions = (filteredClusters: Cluster[]) =>
  filteredClusters?.reduce((acc, cluster) => {
    if (!acc.includes(cluster?.region) && cluster?.region !== '') {
      acc.push(cluster?.region);
    }
    return acc;
  }, []);

const getManagedClusterInfo = (cluster: ACMManagedClusterKind) => ({
  name: cluster?.metadata?.name,
  region: fetchRegion(cluster) ?? '',
});

export const SelectClusterList: React.FC<SelectClusterListProps> = ({
  selectedClusters,
  setSelectedClusters,
}) => {
  const { t } = useCustomTranslation();
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
  });

  React.useEffect(() => {
    if (acmManagedClustersLoaded && !acmManagedClustersLoadError) {
      setClusters(
        acmManagedClusters?.reduce(
          (obj, acmManagedCluster) => [
            ...obj,
            getManagedClusterInfo(acmManagedCluster),
          ],
          []
        )
      );
    }
  }, [
    acmManagedClusters,
    acmManagedClustersLoaded,
    acmManagedClustersLoadError,
  ]);

  const filteredClusters: Cluster[] = React.useMemo(
    () => getFilteredClusters(clusters, region, nameSearch),
    [clusters, region, nameSearch]
  );

  const onSelect: DataListCheckProps['onChange'] = (checked, event) => {
    const name = filteredClusters?.[Number(event.currentTarget.id)]?.name;
    const region = filteredClusters?.[Number(event.currentTarget.id)]?.region;
    if (checked)
      setSelectedClusters((selectedClusters) => ({
        ...selectedClusters,
        [name]: {
          name,
          region,
          storageClusterId: '',
          storageSystemName: '',
          storageClusterName: '',
          odfVersion: '',
        },
      }));
    else {
      const sc = _.cloneDeep(selectedClusters);
      delete sc?.[name];
      setSelectedClusters(sc);
    }
  };

  return (
    <div className="mco-select-cluster-list">
      <Toolbar isSticky>
        <ToolbarContent>
          <ToolbarItem className="mco-select-cluster-list__filter-toolbar-item">
            <Select
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
              <SelectOption value={t('Region')} isPlaceholder />
              <>
                {filterRegions(filteredClusters).map((region) => (
                  <SelectOption value={region} key={region} />
                ))}
              </>
            </Select>
          </ToolbarItem>
          <ToolbarItem className="mco-select-cluster-list__search-toolbar-item">
            <SearchInput
              placeholder={t('Cluster name')}
              onChange={(val) => setNameSearch(val)}
              value={nameSearch}
              onClear={(e) => setNameSearch('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredClusters.length === 0 ? (
        <Bullseye className="mco-select-cluster-list__bullseye">
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
                  aria-labelledby={t('Checkbox to select cluster')}
                  id={index.toString()}
                  onChange={onSelect}
                  isChecked={Object.keys(selectedClusters)?.some(
                    (scName) => scName === fc.name
                  )}
                  isDisabled={
                    Object.keys(selectedClusters ?? [])?.length ===
                      MAX_ALLOWED_CLUSTERS &&
                    !Object.keys(selectedClusters ?? [])?.some(
                      (scName) => scName === fc.name
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

export type ManagedClusterMapping = {
  [name in string]: Cluster;
};

type SelectClusterListProps = {
  selectedClusters: ManagedClusterMapping;
  setSelectedClusters: React.Dispatch<
    React.SetStateAction<ManagedClusterMapping>
  >;
};

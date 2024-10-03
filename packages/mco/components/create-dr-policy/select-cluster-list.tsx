import * as React from 'react';
import { getManagedClusterResourceObj } from '@odf/mco/hooks';
import { ODFInfoYamlObject } from '@odf/mco/types';
import {
  getMajorVersion,
  ValidateManagedClusterCondition,
  getValueFromClusterClaim,
  isMinimumSupportedODFVersion,
  getManagedClusterViewName,
  getNameNamespace,
} from '@odf/mco/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ConfigMapKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { safeLoad } from 'js-yaml';
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
  MCO_CREATED_BY_LABEL_KEY,
  MCO_CREATED_BY_MC_CONTROLLER,
} from '../../constants';
import { ACMManagedClusterViewModel } from '../../models';
import { ACMManagedClusterKind, ACMManagedClusterViewKind } from '../../types';
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
  requiredODFVersion: string,
  odfInfoConfigData: { [key: string]: string }
): ODFConfigInfoType => {
  try {
    // Managed cluster with multiple StorageSystems is not currently supported for DR
    // ToDo: Update this once we add support for multiple clusters
    const odfInfoKey = Object.keys(odfInfoConfigData)[0];
    const odfInfoYaml = odfInfoConfigData[odfInfoKey];
    const odfInfo: ODFInfoYamlObject = safeLoad(odfInfoYaml);

    const storageClusterName = odfInfo?.storageCluster?.namespacedName?.name;
    const storageClusterNamespace =
      odfInfo?.storageCluster?.namespacedName?.namespace;
    const storageSystemName = odfInfo?.storageSystemName;

    const odfVersion = odfInfo?.version;
    const storageClusterCount = Object.keys(odfInfoConfigData).length;
    const storageClusterNamespacedName = getNameNamespace(
      storageClusterName,
      storageClusterNamespace
    );
    const storageSystemNamespacedName = getNameNamespace(
      storageSystemName,
      storageClusterNamespace
    );
    const cephFSID = odfInfo?.storageCluster?.cephClusterFSID;
    const isDrOptimized = odfInfo?.storageCluster?.isDrOptimized;

    return {
      odfVersion,
      isValidODFVersion: isMinimumSupportedODFVersion(
        getMajorVersion(odfVersion),
        requiredODFVersion
      ),
      storageClusterCount,
      storageClusterInfo: {
        storageClusterNamespacedName,
        storageSystemNamespacedName,
        cephFSID,
        isDrOptimized: isDrOptimized === 'true',
      },
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);

    return {
      odfVersion: '',
      isValidODFVersion: false,
      storageClusterCount: 0,
      storageClusterInfo: {
        storageClusterNamespacedName: '',
        storageSystemNamespacedName: '',
        cephFSID: '',
        isDrOptimized: false,
      },
    };
  }
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
  odfInfoConfigData: { [key: string]: string }
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
  odfInfo: getODFInfo(requiredODFVersion, odfInfoConfigData),
});

const getManagedClusterInfoTypes = (
  managedClusters: ACMManagedClusterKind[],
  mcvs: ACMManagedClusterViewKind[],
  requiredODFVersion: string
): ManagedClusterInfoType[] =>
  managedClusters?.reduce((acc, cluster) => {
    if (ValidateManagedClusterCondition(cluster, MANAGED_CLUSTER_JOINED)) {
      // OCS creates a ConfigMap on the managed clusters, with details about StorageClusters, Clients.
      // MCO creates ManagedClusterView on the hub cluster, referencing that ConfigMap.
      const managedClusterName = getName(cluster);
      const mcv =
        mcvs.find(
          (obj: ACMManagedClusterViewKind) =>
            getName(obj) === getManagedClusterViewName(managedClusterName) &&
            getNamespace(obj) === managedClusterName
        ) || {};
      const odfInfoConfigData =
        (mcv.status?.result as ConfigMapKind)?.data || {};
      return [
        ...acc,
        getManagedClusterInfo(cluster, requiredODFVersion, odfInfoConfigData),
      ];
    }

    return acc;
  }, []);

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

  const [mcvs, mcvsLoaded, mcvsLoadError] = useK8sWatchResource<
    ACMManagedClusterViewKind[]
  >({
    kind: referenceForModel(ACMManagedClusterViewModel),
    selector: {
      // https://github.com/red-hat-storage/odf-multicluster-orchestrator/blob/release-4.17/controllers/utils/managedclusterview.go#L43
      matchLabels: { [MCO_CREATED_BY_LABEL_KEY]: MCO_CREATED_BY_MC_CONTROLLER },
    },
    isList: true,
  });

  const allLoaded = loaded && mcvsLoaded;
  const anyError = loadError || mcvsLoadError;

  const clusters: ManagedClusterInfoType[] = React.useMemo(() => {
    if (!!requiredODFVersion && allLoaded && !anyError)
      return getManagedClusterInfoTypes(
        managedClusters,
        mcvs,
        requiredODFVersion
      );

    return [];
  }, [requiredODFVersion, managedClusters, mcvs, allLoaded, anyError]);

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
        loadError={anyError}
        loaded={allLoaded && !!clusters.length}
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

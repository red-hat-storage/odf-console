/**
 * Add components common between cluster-wise and appicaltion-wise card here
 */

import * as React from 'react';
import {
  ALL_APPS,
  ALL_APPS_ITEM_ID,
  GITOPS_OPERATOR_NAMESPACE,
  LEAST_SECONDS_IN_PROMETHEUS,
  DISCOVERED_APP_NS,
  ReplicationType,
  VolumeReplicationHealth,
} from '@odf/mco/constants';
import {
  DRClusterAppsMap,
  ProtectedAppsMap,
  ApplicationObj,
  ProtectedPVCData,
} from '@odf/mco/types';
import {
  filterPVCDataUsingApp,
  getVolumeReplicationHealth,
} from '@odf/mco/utils';
import {
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  DRPlacementControlModel,
  TypeaheadDropdown,
} from '@odf/shared';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { useScheduler } from '@odf/shared/hooks';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ChartDonut } from '@patternfly/react-charts/victory';
import {
  MenuToggle,
  MenuToggleElement,
  Flex,
  FlexItem,
  Content,
  ContentVariants,
  Select,
  SelectOption,
  SelectList,
  SelectGroup,
  Divider,
} from '@patternfly/react-core';
import { t_global_color_status_danger_100 as globalDanger100 } from '@patternfly/react-tokens';
import { t_global_color_status_info_100 as globalInfo100 } from '@patternfly/react-tokens';
import { t_global_color_status_warning_100 as globalWarning100 } from '@patternfly/react-tokens';

const NAMESPACE_NAME_SPLIT_CHAR = '%#%';

const namespaceToModelMapping = (namespace: string) => {
  if (namespace === DISCOVERED_APP_NS) {
    return DRPlacementControlModel;
  } else if (namespace === GITOPS_OPERATOR_NAMESPACE) {
    return ArgoApplicationSetModel;
  } else {
    return ACMSubscriptionModel;
  }
};

const colorScale = [
  globalDanger100.value,
  globalWarning100.value,
  globalInfo100.value,
];

const getNSAndNameFromId = (itemId: string): string[] => {
  if (itemId?.includes(NAMESPACE_NAME_SPLIT_CHAR)) {
    return itemId.split(NAMESPACE_NAME_SPLIT_CHAR);
  } else {
    return [undefined, ALL_APPS];
  }
};

export const StatusText: React.FC<StatusTextProps> = ({ children }) => {
  return (
    <Content
      component="p"
      className="mco-dashboard__statusText--size mco-dashboard__statusText--margin mco-dashboard__statusText--weight"
    >
      {children}
    </Content>
  );
};

export const VolumeSummarySection: React.FC<VolumeSummarySectionProps> = ({
  protectedPVCData,
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();
  const [summary, setSummary] = React.useState({
    critical: 0,
    warning: 0,
    healthy: 0,
  });

  const updateSummary = React.useCallback(() => {
    const volumeHealth = { critical: 0, warning: 0, healthy: 0 };
    protectedPVCData?.forEach((pvcData) => {
      const pvcLastSyncTime = pvcData?.lastSyncTime;
      // Only RDR(async) has volume replication
      const health =
        pvcData.replicationType === ReplicationType.ASYNC
          ? getVolumeReplicationHealth(
              !!pvcLastSyncTime
                ? getTimeDifferenceInSeconds(pvcLastSyncTime)
                : LEAST_SECONDS_IN_PROMETHEUS,
              pvcData?.schedulingInterval
            )[0]
          : VolumeReplicationHealth.HEALTHY;
      !!selectedApplication
        ? filterPVCDataUsingApp(pvcData, selectedApplication) &&
          volumeHealth[health]++
        : volumeHealth[health]++;
    });
    setSummary(volumeHealth);
  }, [selectedApplication, protectedPVCData, setSummary]);

  useScheduler(updateSummary);

  return (
    <div className="mco-dashboard__contentColumn">
      <Content component={ContentVariants.h3}>
        {t('Volume replication health')}
      </Content>
      <div className="mco-cluster-app__donut-chart">
        <ChartDonut
          ariaDesc="Volume replication health"
          constrainToVisibleArea={true}
          data={[
            { x: 'Critical', y: summary.critical },
            { x: 'Warning', y: summary.warning },
            { x: 'Healthy', y: summary.healthy },
          ]}
          labels={({ datum }) => `${datum.x}: ${datum.y}`}
          legendData={[
            {
              name: `Critical: ${summary.critical}`,
              symbol: { fill: colorScale[0] },
            },
            {
              name: `Warning: ${summary.warning}`,
              symbol: { fill: colorScale[1] },
            },
            {
              name: `Healthy: ${summary.healthy}`,
              symbol: { fill: colorScale[2] },
            },
          ]}
          legendOrientation="vertical"
          legendPosition="right"
          padding={{
            bottom: 0,
            left: 0,
            right: 200,
            top: 0,
          }}
          subTitle={t('Volumes')}
          colorScale={colorScale}
          title={`${summary.critical + summary.warning + summary.healthy}`}
          width={350}
        />
      </div>
    </div>
  );
};

const ClusterDropdown: React.FC<Partial<ClusterAppDropdownProps>> = ({
  clusterResources,
  clusterName,
  setCluster,
  setApplication,
  className,
}) => {
  const { t } = useCustomTranslation();

  const options = React.useMemo(
    () =>
      Object.keys(clusterResources)?.map((cluster) => (
        <SelectOption key={cluster} value={cluster}>
          {cluster}
        </SelectOption>
      )),
    [clusterResources]
  );

  React.useEffect(() => {
    if (!clusterName && !!options.length) {
      // initial selection or when current selection is cleared
      setCluster(options?.[0].props.value);
    }
  }, [options, clusterName, setCluster]);

  const onSelect = (selection: string) => {
    if (selection !== '') {
      setCluster(selection);
      setApplication({
        namespace: undefined,
        name: ALL_APPS,
      });
    } else {
      setCluster(null);
    }
  };

  return (
    <TypeaheadDropdown
      className={className}
      selectedValue={t('Cluster: {{clusterName}}', { clusterName })}
      onSelect={onSelect}
      items={options}
      placeholder={t('Select a cluster')}
    />
  );
};

const AppDropdown: React.FC<Partial<ClusterAppDropdownProps>> = ({
  clusterResources,
  clusterName,
  application,
  setApplication,
  className,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { name, namespace } = application;
  const selected = !namespace
    ? ALL_APPS_ITEM_ID
    : `${namespace}${NAMESPACE_NAME_SPLIT_CHAR}${name}`;

  const options: AppOptions = React.useMemo(
    () =>
      clusterResources[clusterName]?.protectedApps?.reduce(
        (acc, protectedApp) => {
          const appName = protectedApp?.appName;
          const appNs = protectedApp?.appNamespace;
          if (!acc.hasOwnProperty(appNs)) acc[appNs] = [appName];
          else acc[appNs].push(appName);
          return acc;
        },
        {}
      ) || {},
    [clusterResources, clusterName]
  );

  const namespaces = Object.keys(options);
  const isDiscoveredAppsFound = namespaces.includes(DISCOVERED_APP_NS);
  const isManagedAppsFound = namespaces.includes(DISCOVERED_APP_NS)
    ? namespaces.length > 1
    : namespaces.length > 0;

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    itemId: string
  ) => {
    const [itemNamespace, itemName] = getNSAndNameFromId(itemId);
    setApplication({ namespace: itemNamespace, name: itemName });
    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    const [selectedNamespace, selectedName] = getNSAndNameFromId(selected);

    return (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {t('Application:')}{' '}
        {!!selectedNamespace ? (
          <>
            <ResourceIcon
              resourceModel={namespaceToModelMapping(selectedNamespace)}
            />
            {selectedName}
          </>
        ) : (
          selectedName
        )}
      </MenuToggle>
    );
  };

  return (
    // ToDo: Add a search provision for the application name dropdown
    <Select
      id="single-select-next"
      ref={menuRef}
      isOpen={isOpen}
      selected={selected}
      onSelect={onSelect}
      onOpenChange={(isOpenFlag) => setIsOpen(isOpenFlag)}
      toggle={toggle}
    >
      <div className={className}>
        <SelectGroup label="Applications">
          <SelectList>
            <SelectOption itemId={ALL_APPS_ITEM_ID}>{ALL_APPS}</SelectOption>
          </SelectList>
        </SelectGroup>
        <Divider />
        {isDiscoveredAppsFound && (
          // Discovered application group
          <>
            <SelectGroup label={t('Discovered applications')}>
              <SelectList>
                {options[DISCOVERED_APP_NS]?.map((appName: string) => (
                  <SelectOption
                    key={DISCOVERED_APP_NS + appName}
                    value={`${DISCOVERED_APP_NS}${NAMESPACE_NAME_SPLIT_CHAR}${appName}`}
                    icon={
                      <ResourceIcon resourceModel={DRPlacementControlModel} />
                    }
                  >
                    {appName}
                  </SelectOption>
                ))}
              </SelectList>
            </SelectGroup>
            <Divider />
          </>
        )}
        {isManagedAppsFound && (
          // Managed application group
          <SelectGroup label={t('Managed applications')}>
            {Object.keys(options)?.map(
              (appNS: string) =>
                appNS !== DISCOVERED_APP_NS && (
                  <SelectGroup
                    key={appNS}
                    label={t('Namespace: ') + `${appNS}`}
                  >
                    <SelectList>
                      {options[appNS]?.map((appName: string) => (
                        <SelectOption
                          key={appNS + appName}
                          value={`${appNS}${NAMESPACE_NAME_SPLIT_CHAR}${appName}`}
                          icon={
                            <ResourceIcon
                              resourceModel={namespaceToModelMapping(appNS)}
                            />
                          }
                        >
                          {appName}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </SelectGroup>
                )
            )}
          </SelectGroup>
        )}
      </div>
    </Select>
  );
};

export const ClusterAppDropdown: React.FC<ClusterAppDropdownProps> = ({
  clusterResources,
  clusterName,
  application,
  setCluster,
  setApplication,
}) => {
  return (
    <Flex direction={{ default: 'column', sm: 'row' }}>
      <FlexItem>
        <ClusterDropdown
          clusterResources={clusterResources}
          clusterName={clusterName}
          setCluster={setCluster}
          setApplication={setApplication}
          className="mco-cluster-app__dropdown--padding"
        />
      </FlexItem>
      <FlexItem>
        <AppDropdown
          clusterResources={clusterResources}
          clusterName={clusterName}
          application={application}
          setApplication={setApplication}
          className="mco-cluster-app__dropdownHeight"
        />
      </FlexItem>
    </Flex>
  );
};

export const ProtectedPVCsSection: React.FC<ProtectedPVCsSectionProps> = ({
  protectedPVCData,
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();
  const [protectedPVC, setProtectedPVC] = React.useState([0, 0]);
  const [protectedPVCsCount, pvcsWithIssueCount] = protectedPVC;

  const updateProtectedPVC = React.useCallback(() => {
    const issueCount =
      protectedPVCData?.reduce((acc, protectedPVCItem) => {
        const pvcLastSyncTime = protectedPVCItem?.lastSyncTime;
        // Only RDR(async) has volume replication
        const replicationHealth =
          protectedPVCItem.replicationType === ReplicationType.ASYNC
            ? getVolumeReplicationHealth(
                !!pvcLastSyncTime
                  ? getTimeDifferenceInSeconds(pvcLastSyncTime)
                  : LEAST_SECONDS_IN_PROMETHEUS,
                protectedPVCItem?.schedulingInterval
              )[0]
            : VolumeReplicationHealth.HEALTHY;
        (!!selectedApplication
          ? !!filterPVCDataUsingApp(protectedPVCItem, selectedApplication) &&
            replicationHealth !== VolumeReplicationHealth.HEALTHY
          : replicationHealth !== VolumeReplicationHealth.HEALTHY) && acc++;

        return acc;
      }, 0) || 0;
    setProtectedPVC([protectedPVCData?.length || 0, issueCount]);
  }, [selectedApplication, protectedPVCData, setProtectedPVC]);

  useScheduler(updateProtectedPVC);

  return (
    <div className="mco-dashboard__contentColumn">
      <Content component={ContentVariants.h1}>{protectedPVCsCount}</Content>
      <StatusText>{t('Protected volumes')}</StatusText>
      <Content component="p" className="text-muted">
        {t('{{ pvcsWithIssueCount }} with issues', { pvcsWithIssueCount })}
      </Content>
    </div>
  );
};

type ProtectedPVCsSectionProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedApplication?: ProtectedAppsMap;
};

type VolumeSummarySectionProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedApplication?: ProtectedAppsMap;
};

type ClusterAppDropdownProps = {
  clusterResources: DRClusterAppsMap;
  clusterName: string;
  application: {
    name: string;
    namespace: string;
  };
  setCluster: React.Dispatch<React.SetStateAction<string>>;
  setApplication: React.Dispatch<React.SetStateAction<ApplicationObj>>;
  className?: string;
};

type AppOptions = {
  [namespace: string]: string[];
};

type StatusTextProps = {
  children: React.ReactNode;
};

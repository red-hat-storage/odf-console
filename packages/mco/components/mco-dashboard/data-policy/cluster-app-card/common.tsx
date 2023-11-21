/**
 * Add components common between cluster-wise and appicaltion-wise card here
 */

import * as React from 'react';
import {
  ALL_APPS,
  ALL_APPS_ITEM_ID,
  VOLUME_REPLICATION_HEALTH,
} from '@odf/mco/constants';
import {
  DrClusterAppsMap,
  ProtectedAppSetsMap,
  AppSetObj,
  ProtectedPVCData,
  PlacementInfo,
} from '@odf/mco/types';
import { getVolumeReplicationHealth } from '@odf/mco/utils';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { URL_POLL_DEFAULT_DELAY } from '@odf/shared/hooks/custom-prometheus-poll/use-url-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Select as SelectNext,
  SelectOption as SelectOptionNext,
  SelectList as SelectListNext,
  SelectGroup as SelectGroupNext,
} from '@patternfly/react-core/next';
import { global_danger_color_100 as globalDanger100 } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_warning_color_100 as globalWarning100 } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { ChartDonut } from '@patternfly/react-charts';
import {
  Select,
  SelectOption,
  SelectVariant,
  MenuToggle,
  MenuToggleElement,
  Flex,
  FlexItem,
  Text,
  TextVariants,
} from '@patternfly/react-core';

const colorScale = [globalDanger100.value, globalWarning100.value, '#0166cc'];

const getNSAndNameFromId = (itemId: string): string[] => {
  if (itemId?.includes('%#%')) {
    return itemId.split('%#%');
  } else {
    return [undefined, ALL_APPS];
  }
};

export const StatusText: React.FC<StatusTextProps> = ({ children }) => {
  return (
    <Text className="mco-dashboard__statusText--size mco-dashboard__statusText--margin mco-dashboard__statusText--weight">
      {children}
    </Text>
  );
};

export const VolumeSummarySection: React.FC<VolumeSummarySectionProps> = ({
  protectedPVCData,
  selectedAppSet,
}) => {
  const { t } = useCustomTranslation();
  const [summary, setSummary] = React.useState({
    critical: 0,
    warning: 0,
    healthy: 0,
  });
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();

  const updateSummary = React.useCallback(() => {
    const volumeHealth = { critical: 0, warning: 0, healthy: 0 };
    const placementInfo: PlacementInfo = selectedAppSet?.placementInfo?.[0];
    protectedPVCData?.forEach((pvcData) => {
      const health = getVolumeReplicationHealth(
        getTimeDifferenceInSeconds(pvcData?.lastSyncTime),
        pvcData?.schedulingInterval
      )[0];
      if (!!selectedAppSet) {
        pvcData?.drpcName === placementInfo?.drpcName &&
          pvcData?.drpcNamespace === placementInfo?.drpcNamespace &&
          volumeHealth[health]++;
      } else {
        volumeHealth[health]++;
      }
    });
    setSummary(volumeHealth);
  }, [selectedAppSet, protectedPVCData, setSummary]);

  React.useEffect(() => {
    updateSummary();
    clearSetIntervalId.current = setInterval(
      updateSummary,
      URL_POLL_DEFAULT_DELAY
    );
    return () => clearInterval(clearSetIntervalId.current);
  }, [updateSummary]);

  return (
    <div className="mco-dashboard__contentColumn">
      <Text component={TextVariants.h3}>{t('Volume replication health')}</Text>
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
  setAppSet,
  className,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const options = React.useMemo(
    () =>
      Object.keys(clusterResources)?.map((cluster) => (
        <SelectOption key={cluster} value={cluster} />
      )),
    [clusterResources]
  );

  React.useEffect(() => {
    if (!clusterName && !!options.length) {
      // initial selection or when current selection is cleared
      setCluster(options?.[0].props.value);
    }
  }, [options, clusterName, setCluster]);

  const onToggle = (isOpenFlag: boolean) => setIsOpen(isOpenFlag);
  const clearSelection = () => {
    setCluster(null);
    setIsOpen(false);
  };
  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    selection: string
  ) => {
    setCluster(selection);
    setAppSet({
      namespace: undefined,
      name: ALL_APPS,
    });
    setIsOpen(false);
  };
  const customFilter = (
    _event: React.ChangeEvent<HTMLInputElement> | null,
    value: string
  ) => {
    if (!value) {
      return options;
    }
    const input = new RegExp(value, 'i');
    return options.filter((child) => input.test(child.props.value));
  };

  return (
    <Select
      variant={SelectVariant.typeahead}
      onToggle={onToggle}
      onSelect={onSelect}
      onClear={clearSelection}
      onFilter={customFilter}
      selections={t('Cluster: {{clusterName}}', { clusterName })}
      isOpen={isOpen}
      placeholderText={t('Select a cluster')}
      className={className}
    >
      {options}
    </Select>
  );
};

/**
 * Imports: Select as SelectNext, SelectOption as SelectOptionNext, SelectList as SelectListNext.
 * From "react-core/next" which is the newer implementation of "Select" component offering a
 * lot more flexibility and easily implemented configuration options. In few releases, it will be
 * promoted to become the official recommended solution for the "Select" component and the current
 * "Select" component from "react-core" will be deprecated.
 */
const AppDropdown: React.FC<Partial<ClusterAppDropdownProps>> = ({
  clusterResources,
  clusterName,
  appSet,
  setAppSet,
  className,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { name, namespace } = appSet;
  const selected = !namespace ? ALL_APPS_ITEM_ID : `${namespace}%#%${name}`;

  const options: AppOptions = React.useMemo(
    () =>
      clusterResources[clusterName]?.protectedAppSets?.reduce(
        (acc, protectedAppSet) => {
          const appName = protectedAppSet?.appName;
          const appNs = protectedAppSet?.appNamespace;
          if (!acc.hasOwnProperty(appNs)) acc[appNs] = [appName];
          else acc[appNs].push(appName);
          return acc;
        },
        {}
      ) || {},
    [clusterResources, clusterName]
  );

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    itemId: string
  ) => {
    const [itemNamespace, itemName] = getNSAndNameFromId(itemId);
    setAppSet({ namespace: itemNamespace, name: itemName });
    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    const [selectedNamespace, selectedName] = getNSAndNameFromId(selected);
    return (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {t('Application:')}{' '}
        {!!selectedNamespace
          ? `${selectedName} (${selectedNamespace})`
          : selectedName}
      </MenuToggle>
    );
  };

  return (
    <SelectNext
      id="single-select-next"
      ref={menuRef}
      isOpen={isOpen}
      selected={selected}
      onSelect={onSelect}
      onOpenChange={(isOpenFlag) => setIsOpen(isOpenFlag)}
      toggle={toggle}
      className={className}
    >
      <SelectGroupNext label="Applications">
        <SelectListNext>
          <SelectOptionNext itemId={ALL_APPS_ITEM_ID}>
            {ALL_APPS}
          </SelectOptionNext>
        </SelectListNext>
      </SelectGroupNext>
      {Object.keys(options)?.map((appNS: string) => (
        <SelectGroupNext key={appNS} label={t('Namespace: ') + `${appNS}`}>
          <SelectListNext>
            {options[appNS]?.map((appName: string) => (
              <SelectOptionNext
                key={appNS + appName}
                itemId={`${appNS}%#%${appName}`}
              >
                {appName}
              </SelectOptionNext>
            ))}
          </SelectListNext>
        </SelectGroupNext>
      ))}
    </SelectNext>
  );
};

export const ClusterAppDropdown: React.FC<ClusterAppDropdownProps> = ({
  clusterResources,
  clusterName,
  appSet,
  setCluster,
  setAppSet,
}) => {
  return (
    <Flex direction={{ default: 'column', sm: 'row' }}>
      <FlexItem>
        <ClusterDropdown
          clusterResources={clusterResources}
          clusterName={clusterName}
          setCluster={setCluster}
          setAppSet={setAppSet}
          className="mco-cluster-app__dropdown--padding"
        />
      </FlexItem>
      <FlexItem>
        <AppDropdown
          clusterResources={clusterResources}
          clusterName={clusterName}
          appSet={appSet}
          setAppSet={setAppSet}
        />
      </FlexItem>
    </Flex>
  );
};

export const ProtectedPVCsSection: React.FC<ProtectedPVCsSectionProps> = ({
  protectedPVCData,
  selectedAppSet,
}) => {
  const { t } = useCustomTranslation();
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();
  const [protectedPVC, setProtectedPVC] = React.useState([0, 0]);
  const [protectedPVCsCount, pvcsWithIssueCount] = protectedPVC;

  const updateProtectedPVC = React.useCallback(() => {
    const placementInfo = selectedAppSet?.placementInfo?.[0];
    const issueCount =
      protectedPVCData?.reduce((acc, protectedPVCItem) => {
        const replicationHealth = getVolumeReplicationHealth(
          getTimeDifferenceInSeconds(protectedPVCItem?.lastSyncTime),
          protectedPVCItem?.schedulingInterval
        )[0];

        (!!selectedAppSet
          ? protectedPVCItem?.drpcName === placementInfo?.drpcName &&
            protectedPVCItem?.drpcNamespace === placementInfo?.drpcNamespace &&
            replicationHealth !== VOLUME_REPLICATION_HEALTH.HEALTHY
          : replicationHealth !== VOLUME_REPLICATION_HEALTH.HEALTHY) && acc++;

        return acc;
      }, 0) || 0;
    setProtectedPVC([protectedPVCData?.length || 0, issueCount]);
  }, [selectedAppSet, protectedPVCData, setProtectedPVC]);

  React.useEffect(() => {
    updateProtectedPVC();
    clearSetIntervalId.current = setInterval(
      updateProtectedPVC,
      URL_POLL_DEFAULT_DELAY
    );
    return () => clearInterval(clearSetIntervalId.current);
  }, [updateProtectedPVC]);

  return (
    <div className="mco-dashboard__contentColumn">
      <Text component={TextVariants.h1}>{protectedPVCsCount}</Text>
      <StatusText>{t('Protected PVCs')}</StatusText>
      <Text className="text-muted">
        {t('{{ pvcsWithIssueCount }} with issues', { pvcsWithIssueCount })}
      </Text>
    </div>
  );
};

type ProtectedPVCsSectionProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedAppSet?: ProtectedAppSetsMap;
};

type VolumeSummarySectionProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedAppSet?: ProtectedAppSetsMap;
};

type ClusterAppDropdownProps = {
  clusterResources: DrClusterAppsMap;
  clusterName: string;
  appSet: {
    name: string;
    namespace: string;
  };
  setCluster: React.Dispatch<React.SetStateAction<string>>;
  setAppSet: React.Dispatch<React.SetStateAction<AppSetObj>>;
  className?: string;
};

type AppOptions = {
  [namespace: string]: string[];
};

type StatusTextProps = {
  children: React.ReactNode;
};

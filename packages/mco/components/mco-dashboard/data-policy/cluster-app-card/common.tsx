/**
 * Add components common between cluster-wise and appicaltion-wise card here
 */

import * as React from 'react';
import { ALL_APPS, ALL_APPS_ITEM_ID } from '@odf/mco/constants';
import {
  DrClusterAppsMap,
  ProtectedAppSetsMap,
  AppSetObj,
} from '@odf/mco/types';
import {
  getSLAStatus,
  getRemoteNSFromAppSet,
  getProtectedPVCsFromDRPC,
} from '@odf/mco/utils';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  PrometheusResponse,
  PrometheusResult,
} from '@openshift-console/dynamic-plugin-sdk';
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
} from '@patternfly/react-core';

const colorScale = [globalDanger100.value, globalWarning100.value, '#0166cc'];

const getNSAndNameFromId = (itemId: string): string[] => {
  if (itemId?.includes('%#%')) {
    return itemId.split('%#%');
  } else {
    return [undefined, ALL_APPS];
  }
};

export const VolumeSummarySection: React.FC<VolumeSummarySectionProps> = ({
  pvcSLAData,
  selectedAppSet,
}) => {
  const { t } = useCustomTranslation();

  const { critical, warning, healthy } = React.useMemo(() => {
    const slaStatus = { critical: 0, warning: 0, healthy: 0 };
    const selectedAppSetPVCsList: string[] = getProtectedPVCsFromDRPC(
      selectedAppSet?.drPlacementControl
    );
    const remoteNS: string = getRemoteNSFromAppSet(selectedAppSet?.application);

    pvcSLAData?.data?.result?.forEach((item: PrometheusResult) => {
      /** FIX THIS */
      if (!!selectedAppSet) {
        item?.metric?.pvc_namespace === remoteNS &&
          selectedAppSetPVCsList.includes(item?.metric?.pvc_name) &&
          slaStatus[getSLAStatus(item)[0]]++;
      } else {
        slaStatus[getSLAStatus(item)[0]]++;
      }
    });

    return slaStatus;
  }, [pvcSLAData, selectedAppSet]);

  return (
    <div className="volume-summary-section mco-dashboard__contentColumn">
      <div className="mco-dashboard__title">
        {t('Volume replication summary')}
      </div>
      <ChartDonut
        ariaDesc="SLAs summary"
        ariaTitle="SLAs status"
        constrainToVisibleArea
        data={[
          { x: 'Critical', y: critical },
          { x: 'Warning', y: warning },
          { x: 'Healthy', y: healthy },
        ]}
        labels={({ datum }) => `${datum.x}: ${datum.y}`}
        legendData={[
          { name: `Critical: ${critical}`, symbol: { fill: colorScale[0] } },
          { name: `Warning: ${warning}`, symbol: { fill: colorScale[1] } },
          { name: `Healthy: ${healthy}`, symbol: { fill: colorScale[2] } },
        ]}
        legendOrientation="vertical"
        legendPosition="right"
        name="Volume Summary"
        subTitle={t('SLAs')}
        colorScale={colorScale}
        title={`${critical + warning + healthy}`}
      />
    </div>
  );
};

const ClusterDropdown: React.FC<Partial<ClusterAppDropdownProps>> = ({
  clusterResources,
  clusterName,
  setCluster,
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

  const onToggle = (isOpen: boolean) => setIsOpen(isOpen);
  const clearSelection = () => {
    setCluster(null);
    setIsOpen(false);
  };
  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    selection: string
  ) => {
    setCluster(selection);
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
      selections={clusterName}
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
          const appName = getName(protectedAppSet?.application);
          const appNs = getNamespace(protectedAppSet?.application);
          if (!acc.hasOwnProperty(appNs)) acc[appNs] = [appName];
          else acc[appNs] = acc[appNs].push(appName);
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
    const [namespace, name] = getNSAndNameFromId(itemId);
    setAppSet({ namespace, name });
    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => {
    const [namespace, name] = getNSAndNameFromId(selected);
    return (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {!!namespace ? `${name} (${namespace})` : name}
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
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
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

type VolumeSummarySectionProps = {
  clusterResources?: DrClusterAppsMap;
  pvcSLAData: PrometheusResponse;
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

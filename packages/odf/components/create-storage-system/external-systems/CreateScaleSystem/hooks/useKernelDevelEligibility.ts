import * as React from 'react';
import {
  MachineConfigKind,
  MachineConfigNodeKind,
} from '@odf/core/types/scale';
import { MachineConfigModel, MachineConfigNodeModel } from '@odf/shared/models';
import { isNotFoundError } from '@odf/shared/utils';
import {
  WatchK8sResource,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../../reducer';
import { KernelDevelEligibility } from '../types';

const KERNEL_DEVEL = 'kernel-devel';

type MachineConfigNodeWatchResults = Record<string, MachineConfigNodeKind>;
type MachineConfigWatchResults = Record<string, MachineConfigKind>;

const machineConfigNodeKey = (nodeName: string) => `mcn-${nodeName}`;
const machineConfigKey = (configName: string) => `mc-${configName}`;

const machineConfigNodeResource = (name: string): WatchK8sResource => ({
  groupVersionKind: {
    group: MachineConfigNodeModel.apiGroup,
    version: MachineConfigNodeModel.apiVersion,
    kind: MachineConfigNodeModel.kind,
  },
  isList: false,
  name,
  namespaced: false,
});

const machineConfigResource = (name: string): WatchK8sResource => ({
  groupVersionKind: {
    group: MachineConfigModel.apiGroup,
    version: MachineConfigModel.apiVersion,
    kind: MachineConfigModel.kind,
  },
  isList: false,
  name,
  namespaced: false,
});

const hasKernelDevelExtension = (extensions?: string[]): boolean =>
  Array.isArray(extensions) && extensions.includes(KERNEL_DEVEL);

const getLoadErrorMessage = (loadError: { message?: string }): string =>
  loadError?.message || String(loadError);

/**
 * Checks whether kernel-devel packages are installed on the selected nodes
 * by inspecting MachineConfigNode and MachineConfig resources.
 *
 * A node is considered to have kernel-devel installed if its currently applied
 * rendered MachineConfig includes 'kernel-devel' in spec.extensions.
 * Everything else (missing, unknown, not found) is treated as not installed.
 */
export const useKernelDevelEligibility = (
  selectedNodes: WizardNodeState[]
): KernelDevelEligibility => {
  const cachedNodeNames = React.useRef(new Set<string>());
  const cachedMachineConfigNames = React.useRef(new Set<string>());
  selectedNodes.forEach((node) => cachedNodeNames.current.add(node.name));

  const machineConfigNodeResources = Array.from(cachedNodeNames.current).reduce<
    Record<string, WatchK8sResource>
  >((acc, nodeName) => {
    acc[machineConfigNodeKey(nodeName)] = machineConfigNodeResource(nodeName);
    return acc;
  }, {});
  const machineConfigNodeResults =
    useK8sWatchResources<MachineConfigNodeWatchResults>(
      machineConfigNodeResources
    );

  Object.values(machineConfigNodeResults).forEach((result) => {
    const currentConfigName = result.data?.status?.configVersion?.current;
    if (currentConfigName) {
      cachedMachineConfigNames.current.add(currentConfigName);
    }
  });

  const machineConfigResources = Array.from(
    cachedMachineConfigNames.current
  ).reduce<Record<string, WatchK8sResource>>((acc, configName) => {
    acc[machineConfigKey(configName)] = machineConfigResource(configName);
    return acc;
  }, {});
  const machineConfigResults = useK8sWatchResources<MachineConfigWatchResults>(
    machineConfigResources
  );

  let isLoading = false;
  let error = '';
  const ineligibleNodeNames: string[] = [];

  selectedNodes.forEach((node) => {
    const machineConfigNodeResult =
      machineConfigNodeResults[machineConfigNodeKey(node.name)];

    if (!machineConfigNodeResult?.loaded) {
      isLoading = true;
      return;
    }
    if (machineConfigNodeResult.loadError) {
      if (isNotFoundError(machineConfigNodeResult.loadError)) {
        ineligibleNodeNames.push(node.name);
      } else {
        error ||= getLoadErrorMessage(machineConfigNodeResult.loadError);
      }
      return;
    }

    const currentConfigName =
      machineConfigNodeResult.data?.status?.configVersion?.current;
    if (!currentConfigName) {
      ineligibleNodeNames.push(node.name);
      return;
    }

    const machineConfigResult =
      machineConfigResults[machineConfigKey(currentConfigName)];
    if (!machineConfigResult?.loaded) {
      isLoading = true;
      return;
    }
    if (machineConfigResult.loadError) {
      if (isNotFoundError(machineConfigResult.loadError)) {
        ineligibleNodeNames.push(node.name);
      } else {
        error ||= getLoadErrorMessage(machineConfigResult.loadError);
      }
      return;
    }

    if (!hasKernelDevelExtension(machineConfigResult.data?.spec?.extensions)) {
      ineligibleNodeNames.push(node.name);
    }
  });

  const nodesWithoutKernelDevel = isLoading || error ? [] : ineligibleNodeNames;
  const areSelectedNodesEligible =
    selectedNodes.length > 0 &&
    !isLoading &&
    !error &&
    nodesWithoutKernelDevel.length === 0;

  return {
    areSelectedNodesEligible,
    isLoading,
    error,
    nodesWithoutKernelDevel,
  };
};

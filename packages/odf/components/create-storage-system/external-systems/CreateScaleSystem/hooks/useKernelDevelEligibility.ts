import { getName } from '@odf/shared';
import { MachineConfigModel, MachineConfigNodeModel } from '@odf/shared/models';
import { MachineConfigKind, MachineConfigNodeKind } from '@odf/shared/types';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../../reducer';
import { KernelDevelEligibility } from '../types';

const KERNEL_DEVEL = 'kernel-devel';

const resources = {
  machineConfigNodes: {
    groupVersionKind: {
      group: MachineConfigNodeModel.apiGroup,
      version: MachineConfigNodeModel.apiVersion,
      kind: MachineConfigNodeModel.kind,
    },
    isList: true,
    namespaced: false,
  },
  machineConfigs: {
    groupVersionKind: {
      group: MachineConfigModel.apiGroup,
      version: MachineConfigModel.apiVersion,
      kind: MachineConfigModel.kind,
    },
    isList: true,
    namespaced: false,
  },
};

type KernelDevelWatchResources = {
  machineConfigNodes: MachineConfigNodeKind[];
  machineConfigs: MachineConfigKind[];
};

const getLoadErrorMessage = (loadError: { message?: string }): string =>
  loadError?.message || String(loadError);

/**
 * Checks whether kernel-devel packages are installed on the selected nodes
 * by inspecting MachineConfigNode and MachineConfig resources.
 */
export const useKernelDevelEligibility = (
  selectedNodes: WizardNodeState[]
): KernelDevelEligibility => {
  const results = useK8sWatchResources<KernelDevelWatchResources>(resources);
  const machineConfigNodes = results.machineConfigNodes.data || [];
  const machineConfigs = results.machineConfigs.data || [];
  const isLoading =
    selectedNodes.length > 0 &&
    (!results.machineConfigNodes.loaded || !results.machineConfigs.loaded);
  const loadError =
    results.machineConfigNodes.loadError || results.machineConfigs.loadError;
  const error =
    selectedNodes.length > 0 && loadError ? getLoadErrorMessage(loadError) : '';

  const machineConfigNodesByName = new Map(
    machineConfigNodes.map((machineConfigNode) => [
      getName(machineConfigNode),
      machineConfigNode,
    ])
  );
  const machineConfigsByName = new Map(
    machineConfigs.map((machineConfig) => [
      getName(machineConfig),
      machineConfig,
    ])
  );

  const nodesWithoutKernelDevel =
    isLoading || error
      ? []
      : selectedNodes
          .filter((node) => {
            const currentConfigName = machineConfigNodesByName.get(node.name)
              ?.status?.configVersion?.current;
            return !machineConfigsByName
              .get(currentConfigName)
              ?.spec?.extensions?.includes(KERNEL_DEVEL);
          })
          .map((node) => node.name);

  return {
    areSelectedNodesEligible:
      selectedNodes.length > 0 &&
      !isLoading &&
      !error &&
      nodesWithoutKernelDevel.length === 0,
    isLoading,
    error,
    nodesWithoutKernelDevel,
  };
};

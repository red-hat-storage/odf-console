import { LocalVolumeSetModel, LocalVolumeDiscovery } from '@odf/shared';
import { Toleration } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  k8sGet,
  k8sPatch,
  k8sCreate,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  HOSTNAME_LABEL_KEY,
  DISCOVERY_CR_NAME,
  LABEL_OPERATOR,
  deviceTypeDropdownItems,
} from '../constants';
import {
  DISK_TYPES,
  LocalVolumeSetKind,
  DeviceType,
  LocalVolumeDiscoveryKind,
} from '../types';

const getDeviceTypes = (deviceType: string[]) => {
  const { DISK, PART, MPATH } = deviceTypeDropdownItems;
  if (
    (deviceType.includes(DISK) && deviceType.includes(PART)) ||
    deviceType.length === 0
  ) {
    return [DeviceType.RawDisk, DeviceType.Partition];
  }
  if (deviceType.includes(PART)) {
    return [DeviceType.Partition];
  }
  if (deviceType.includes(MPATH)) {
    return [DeviceType.Multipath];
  }
  return [DeviceType.RawDisk];
};

/**
 * Updates the "selectedValues" based on allowed combinations
 * @param selectedValues list of all the current selected values (including the combinations which are not allowed)
 * @param prevSelection previously selected list of values (before we got current updated "selectedValues")
 * @returns list of all the allowed values, filtered from "selectedValues" and whether device types are valid or not
 */
export const getValidatedDeviceTypes = (
  selectedValues: string[],
  prevSelection: string[]
): [string[], boolean] => {
  /**
   * Allowed combinations are "disk", "part", "disk + part" and "mpath".
   * If any of "disk" or "part" is/are already selected and then "mpath" is selected as well >> auto-remove "disk" and "part".
   * If "mpath" is only the selected item and then any other item is selected >> display error message and disable "Next" button.
   * If none are selected >> disable "Next" button.
   * "disk" + "part" are the default.
   */
  const { MPATH } = deviceTypeDropdownItems;
  if (!prevSelection.includes(MPATH) && selectedValues.includes(MPATH))
    return [[MPATH], true];
  if (selectedValues.includes(MPATH) && selectedValues.length !== 1)
    return [selectedValues, false];
  if (selectedValues.length === 0) return [selectedValues, false];
  return [selectedValues, true];
};

export const getLocalVolumeSetRequestData = (
  // @TODO: (afreen23) Fix the typings , this chanfge will require refactoring at mutiple places
  state: any,
  nodes: string[],
  ns: string,
  toleration?: Toleration
): LocalVolumeSetKind => {
  const deviceTypes = getDeviceTypes(state.deviceType);
  const requestData = {
    apiVersion: getAPIVersionForModel(LocalVolumeSetModel),
    kind: LocalVolumeSetModel.kind,
    metadata: { name: state.volumeSetName, namespace: ns },
    spec: {
      storageClassName: state.storageClassName || state.volumeSetName,
      volumeMode: state.diskMode,
      deviceInclusionSpec: {
        deviceTypes,
      },
      nodeSelector: {
        nodeSelectorTerms: [
          {
            matchExpressions: [
              {
                key: HOSTNAME_LABEL_KEY,
                operator: LABEL_OPERATOR,
                values: nodes,
              },
            ],
          },
        ],
      },
    },
  } as LocalVolumeSetKind;

  if (state.fsType) requestData.spec.fsType = state.fsType;
  if (!_.isEmpty(toleration)) requestData.spec.tolerations = [toleration];
  if (state.maxDiskLimit) requestData.spec.maxDeviceCount = +state.maxDiskLimit;
  if (state.minDiskSize)
    requestData.spec.deviceInclusionSpec.minSize = `${state.minDiskSize}${state.diskSizeUnit}`;
  if (state.maxDiskSize)
    requestData.spec.deviceInclusionSpec.maxSize = `${state.maxDiskSize}${state.diskSizeUnit}`;
  if (DISK_TYPES[state.diskType]?.property) {
    requestData.spec.deviceInclusionSpec.deviceMechanicalProperties = [
      DISK_TYPES[state.diskType].property,
    ];
  }

  return requestData;
};

export const getNodeSelectorTermsIndices = (
  nodeSelectorTerms: {
    matchExpressions: MatchExpression[];
    matchFields?: MatchExpression[];
  }[] = []
) => {
  let [selectorIndex, expIndex] = [-1, -1];

  nodeSelectorTerms.forEach((selector, index) => {
    expIndex = selector?.matchExpressions?.findIndex(
      (exp: MatchExpression) =>
        exp.key === HOSTNAME_LABEL_KEY && exp.operator === LABEL_OPERATOR
    );
    if (expIndex !== -1) {
      selectorIndex = index;
    }
  });

  return [selectorIndex, expIndex];
};

export const getDiscoveryRequestData = (
  nodes: string[],
  ns: string,
  toleration?: Toleration
): LocalVolumeDiscoveryKind => {
  const request: LocalVolumeDiscoveryKind = {
    apiVersion: getAPIVersionForModel(LocalVolumeDiscovery),
    kind: LocalVolumeDiscovery.kind,
    metadata: { name: DISCOVERY_CR_NAME, namespace: ns },
    spec: {
      nodeSelector: {
        nodeSelectorTerms: [
          {
            matchExpressions: [
              {
                key: HOSTNAME_LABEL_KEY,
                operator: LABEL_OPERATOR,
                values: nodes,
              },
            ],
          },
        ],
      },
    },
  };
  if (!_.isEmpty(toleration)) request.spec.tolerations = [toleration];
  return request;
};

export const updateLocalVolumeDiscovery = async (nodes, ns, setError) => {
  const lvd: LocalVolumeDiscoveryKind = await k8sGet({
    model: LocalVolumeDiscovery,
    name: DISCOVERY_CR_NAME,
    ns: ns,
  });
  const nodeSelectorTerms = lvd?.spec?.nodeSelector?.nodeSelectorTerms;
  const [selectorIndex, expIndex] =
    getNodeSelectorTermsIndices(nodeSelectorTerms);
  if (selectorIndex !== -1 && expIndex !== -1) {
    const existingNodes = new Set(
      lvd?.spec?.nodeSelector?.nodeSelectorTerms?.[selectorIndex]
        ?.matchExpressions?.[expIndex]?.values
    );
    nodes.forEach((name) => existingNodes.add(name));
    const patch = [
      {
        op: 'replace',
        path: `/spec/nodeSelector/nodeSelectorTerms/${selectorIndex}/matchExpressions/${expIndex}/values`,
        value: [...existingNodes],
      },
    ];
    await k8sPatch({ model: LocalVolumeDiscovery, resource: lvd, data: patch });
    setError('');
  } else {
    throw new Error(
      'Could not find matchExpression of type key: "kubernetes.io/hostname" and operator: "In"'
    );
  }
};

export const createLocalVolumeDiscovery = async (nodes, ns, toleration?) => {
  const requestData = getDiscoveryRequestData(nodes, ns, toleration);
  await k8sCreate({ model: LocalVolumeDiscovery, data: requestData });
};

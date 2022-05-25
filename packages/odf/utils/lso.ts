import { Toleration } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  k8sGet,
  k8sPatch,
  k8sCreate,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import {
  HOSTNAME_LABEL_KEY,
  DISCOVERY_CR_NAME,
  LABEL_OPERATOR,
  deviceTypeDropdownItems,
} from '../constants';
import { LocalVolumeSetModel, LocalVolumeDiscovery } from '../models';
import {
  DISK_TYPES,
  LocalVolumeSetKind,
  DiskType,
  LocalVolumeDiscoveryKind,
} from '../types';

const getDeviceTypes = (deviceType: string[]) => {
  const { DISK, PART } = deviceTypeDropdownItems;
  if (
    (deviceType.includes(DISK) && deviceType.includes(PART)) ||
    deviceType.length === 0
  ) {
    return [DiskType.RawDisk, DiskType.Partition];
  }
  if (deviceType.includes(PART)) {
    return [DiskType.Partition];
  }
  return [DiskType.RawDisk];
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
      lvd?.spec?.nodeSelector?.nodeSelectorTerms?.[
        selectorIndex
      ]?.matchExpressions?.[expIndex]?.values
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

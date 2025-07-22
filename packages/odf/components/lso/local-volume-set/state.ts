import { diskModeDropdownItems } from '@odf/core/constants';
import { DiskType } from '@odf/core/types';
import { NodeKind } from '@openshift-console/dynamic-plugin-sdk';

export const initialState = {
  volumeSetName: '',
  storageClassName: '',
  isValidDiskSize: true,
  diskType: DiskType.All,
  diskMode: diskModeDropdownItems.BLOCK,
  deviceType: [],
  fsType: '',
  maxDiskLimit: '',
  minDiskSize: '1',
  maxDiskSize: '',
  diskSizeUnit: 'Gi',
  lvsSelectNodes: [],
  lvsAllNodes: [],
  lvsIsSelectNodes: false,
};

export type State = {
  volumeSetName: string;
  storageClassName: string;
  isValidDiskSize: boolean;
  diskType: DiskType;
  diskMode: string;
  fsType: string;
  deviceType: string[];
  maxDiskLimit: string;
  minDiskSize: string;
  maxDiskSize: string;
  diskSizeUnit: string;
  lvsSelectNodes: NodeKind[];
  lvsAllNodes: NodeKind[];
  lvsIsSelectNodes: boolean;
};

export type Action =
  | { type: 'setVolumeSetName'; name: string }
  | { type: 'setStorageClassName'; name: string }
  | { type: 'setIsValidDiskSize'; value: boolean }
  | { type: 'setDiskType'; value: DiskType }
  | { type: 'setDiskMode'; value: string }
  | { type: 'setFsType'; value: string }
  | { type: 'setMaxDiskLimit'; value: string }
  | { type: 'setMinDiskSize'; value: string }
  | { type: 'setMaxDiskSize'; value: string }
  | { type: 'setDiskSizeUnit'; value: string }
  | { type: 'setDeviceType'; value: string[] }
  | { type: 'setLvsSelectNodes'; value: NodeKind[] }
  | { type: 'setLvsAllNodes'; value: NodeKind[] }
  | { type: 'setLvsIsSelectNodes'; value: boolean };

export const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'setVolumeSetName':
      return Object.assign({}, state, { volumeSetName: action.name });
    case 'setStorageClassName':
      return Object.assign({}, state, { storageClassName: action.name });
    case 'setIsValidDiskSize':
      return Object.assign({}, state, { isValidDiskSize: action.value });
    case 'setDiskType':
      return Object.assign({}, state, { diskType: action.value });
    case 'setDiskMode':
      return Object.assign({}, state, { diskMode: action.value });
    case 'setDeviceType':
      return Object.assign({}, state, { deviceType: action.value });
    case 'setFsType':
      return Object.assign({}, state, { fsType: action.value });
    case 'setMaxDiskLimit':
      return Object.assign({}, state, { maxDiskLimit: action.value });
    case 'setMinDiskSize':
      return Object.assign({}, state, { minDiskSize: action.value });
    case 'setMaxDiskSize':
      return Object.assign({}, state, { maxDiskSize: action.value });
    case 'setDiskSizeUnit':
      return Object.assign({}, state, { diskSizeUnit: action.value });
    case 'setLvsAllNodes':
      return Object.assign({}, state, { lvsAllNodes: action.value });
    case 'setLvsSelectNodes':
      return Object.assign({}, state, { lvsSelectNodes: action.value });
    case 'setLvsIsSelectNodes':
      return Object.assign({}, state, { lvsIsSelectNodes: action.value });
    default:
      return initialState;
  }
};

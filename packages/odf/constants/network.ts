import { NetworkType } from '../types';

export enum IPFamily {
  IPV4 = 'IPV4',
  IPV6 = 'IPV6',
}

export const NetworkTypeLabels = {
  [NetworkType.DEFAULT]: 'Default (OVN)',
  [NetworkType.MULTUS]: 'Custom (Multus)',
  [NetworkType.HOST]: 'Host',
};

export const MON_IP_ANNOTATION = 'network.rook.io/mon-ip';

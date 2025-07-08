import { StoragePool } from '../../../types';

// Pool table row data for storage pool list components
export type StoragePoolTableData = StoragePool & {
  utilization: number;
  usedCapacity: string;
  totalCapacity: string;
  critical: boolean;
  warning: boolean;
};

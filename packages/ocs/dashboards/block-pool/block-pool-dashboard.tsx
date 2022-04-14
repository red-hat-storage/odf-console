import * as React from 'react';
import { Overview, OverviewGrid } from '@openshift-console/dynamic-plugin-sdk';
import { StoragePoolKind } from '../../types';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';
import { CompressionDetailsCard } from './compression-details-card';
import { DetailsCard } from './details-card';
import { InventoryCard } from './inventory-card';
import { MirroringCard } from './mirroring-card';
import { RawCapacityCard } from './raw-capacity-card';
import { StatusCard } from './status-card';
import { UtilizationCard } from './utilization-card';

const leftCards = [
  { Card: DetailsCard },
  { Card: InventoryCard },
  { Card: CompressionDetailsCard },
];
const mainCards = [{ Card: StatusCard }, { Card: RawCapacityCard }, { Card: UtilizationCard }];
const rightCards = [{ Card: MirroringCard }];

export const BlockPoolDashboard: React.FC<PoolDashboardProps> = ({ obj }) => {
  return (
    <BlockPoolDashboardContext.Provider value={{ obj }}>
      <Overview>
        <OverviewGrid mainCards={mainCards} leftCards={leftCards} rightCards={rightCards} />
      </Overview>
    </BlockPoolDashboardContext.Provider>
  );
};

type PoolDashboardProps = {
  obj: StoragePoolKind;
};

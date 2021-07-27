import * as React from 'react';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import { WatchK8sResource } from 'badhikar-dynamic-plugin-sdk';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import CapacityCard from '../../common/capacity-card/capacity-card';
import { referenceForModel } from '../../utils';
import { ODFStorageSystem } from '../../../models';
import { StorageSystemKind } from '../../../types';

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

const SystemCapacityCard: React.FC = () => {
  const [systems, loaded] = useK8sWatchResource<StorageSystemKind[]>(
    storageSystemResource
  );

  const data = systems.map((system) => {
    const datum = {
      name: system.metadata.name,
      managedSystemName: system.spec.name,
      managedSystemKind: system.spec.kind,

      // Todo: (bipuladh) Replace with real metrics
      usedValue: {
        value: 100,
        unit: 'GiB',
        string: '100 GiB',
      },

      // Todo: (bipuladh) Replace with real metrics
      totalValue: {
        value: 512,
        unit: 'GiB',
        string: '512 GiB',
      },
    };
    return datum;
  });

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>System Capacity</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody isLoading={!loaded}>
        <CapacityCard data={data} isPercentage />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default SystemCapacityCard;

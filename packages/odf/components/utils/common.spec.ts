import {
  OCS_DEVICE_SET_FLEXIBLE_REPLICA,
  OCS_DEVICE_SET_MINIMUM_REPLICAS,
  OCS_DEVICE_SET_ARBITER_REPLICAS,
} from '../../constants';
import { WizardNodeState } from '../create-storage-system/reducer';
import { getDeviceSetReplica, getReplicasFromSelectedNodes } from './common';

type ReplicasTest = {
  wizardNodeStates: Partial<WizardNodeState>[];
  expectedReplicas: number;
};

describe('ODF common utilities', () => {
  it('getReplicasFromSelectedNodes returns the correct amount of replicas', () => {
    const dataTest: ReplicasTest[] = [
      {
        // No zones, no racks.
        wizardNodeStates: [{}, {}, {}, {}, {}, {}],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
      {
        // 1 zone.
        wizardNodeStates: [{ zone: '1' }, { zone: '1' }],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
      {
        // 1 rack.
        wizardNodeStates: [{ rack: '1' }, { rack: '1' }],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
      {
        // 4 zones.
        wizardNodeStates: [
          { zone: '1' },
          { zone: '2' },
          { zone: '3' },
          { zone: '4' },
        ],
        expectedReplicas: 4,
      },
      {
        // 5 racks, no zones.
        wizardNodeStates: [
          { rack: '1' },
          { rack: '2' },
          { rack: '3' },
          { rack: '4' },
          { rack: '5' },
        ],
        expectedReplicas: 5,
      },
      {
        // 1 zone, racks ignored (this shouldn't happen: we should receive either zones or racks).
        wizardNodeStates: [
          { zone: 'zone1', rack: 'rack1' },
          { zone: 'zone1', rack: 'rack2' },
          { zone: 'zone1', rack: 'rack3' },
          { zone: 'zone1', rack: 'rack4' },
        ],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
    ];
    dataTest.forEach((test) => {
      expect(
        getReplicasFromSelectedNodes(test.wizardNodeStates as WizardNodeState[])
      ).toBe(test.expectedReplicas);
    });
  });

  it('getDeviceSetReplica returns the correct amount of replicas', () => {
    const wizardNodeStates: Partial<WizardNodeState>[] = [
      { zone: '1' },
      { zone: '2' },
      { zone: '3' },
      { zone: '4' },
    ];
    // Stretch cluster.
    expect(
      getDeviceSetReplica(true, false, wizardNodeStates as WizardNodeState[])
    ).toBe(OCS_DEVICE_SET_ARBITER_REPLICAS);

    // Flexible scaling.
    expect(
      getDeviceSetReplica(false, true, wizardNodeStates as WizardNodeState[])
    ).toBe(OCS_DEVICE_SET_FLEXIBLE_REPLICA);

    // Stretch cluster + Flexible scaling.
    expect(
      getDeviceSetReplica(true, true, wizardNodeStates as WizardNodeState[])
    ).toBe(OCS_DEVICE_SET_FLEXIBLE_REPLICA);

    // No stretch cluster, no flexible scaling.
    expect(
      getDeviceSetReplica(false, false, wizardNodeStates as WizardNodeState[])
    ).toBe(4);
  });
});

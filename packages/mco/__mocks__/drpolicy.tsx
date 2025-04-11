import { DRPolicyModel } from '@odf/shared';
import { DRPolicyKind } from '../types';

// RDR
export const mockDRPolicy1: DRPolicyKind = {
  apiVersion: `${DRPolicyModel.apiGroup}/${DRPolicyModel.apiVersion}`,
  kind: DRPolicyModel.kind,
  metadata: {
    uid: '1',
    name: 'mock-policy-1',
  },
  spec: {
    drClusters: ['east-1', 'west-1'],
    schedulingInterval: '5m',
  },
  status: {
    phase: '',
    conditions: [
      {
        status: 'True',
        type: 'Validated',
      },
    ],
  },
};

// MDR
export const mockDRPolicy2: DRPolicyKind = {
  apiVersion: `${DRPolicyModel.apiGroup}/${DRPolicyModel.apiVersion}`,
  kind: DRPolicyModel.kind,
  metadata: {
    uid: '1',
    name: 'mock-policy-1',
  },
  spec: {
    drClusters: ['east-1', 'east-2'],
    schedulingInterval: '0m',
  },
  status: {
    phase: '',
    conditions: [
      {
        status: 'True',
        type: 'Validated',
      },
    ],
  },
};

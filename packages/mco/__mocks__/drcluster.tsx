import { DRClusterModel } from '@odf/shared';
import { DRClusterKind } from '../types';

export const mockDRClusterEast1: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'east-1',
  },
  spec: {
    s3ProfileName: '',
  },
};

export const mockDRClusterWest1: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'west-1',
  },
  spec: {
    s3ProfileName: '',
  },
};

export const mockDRClusterEast2: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'east-2',
  },
  spec: {
    s3ProfileName: '',
  },
  status: {
    phase: 'Fenced',
  },
};

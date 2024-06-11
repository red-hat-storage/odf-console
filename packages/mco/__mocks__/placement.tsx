import { ACMPlacementModel } from '../models';
import { ACMPlacementKind } from '../types';

export const mockPlacement1: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-1',
    namespace: 'test-ns',
  },
  spec: {},
};

export const mockPlacement2: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-2',
    namespace: 'test-ns',
  },
  spec: {},
};

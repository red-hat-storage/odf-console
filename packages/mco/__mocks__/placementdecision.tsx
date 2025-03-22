import { ACMPlacementDecisionModel } from '@odf/shared';
import { PLACEMENT_REF_LABEL } from '../constants';
import { ACMPlacementDecisionKind } from '../types';

export const mockPlacementDecision1: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-1',
    namespace: 'test-ns',
    labels: {
      [PLACEMENT_REF_LABEL]: 'mock-placement-1',
    },
  },
  status: {
    decisions: [
      {
        clusterName: 'east-1',
        reason: '',
      },
    ],
  },
};

export const mockPlacementDecision2: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-2',
    namespace: 'test-ns',
    labels: {
      [PLACEMENT_REF_LABEL]: 'mock-placement-2',
    },
  },
  status: {
    decisions: [
      {
        clusterName: 'east-1',
        reason: '',
      },
    ],
  },
};

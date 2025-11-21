import { SubscriptionKind } from '@odf/shared/types';

const SCALE_FEATURE_GATE_ANNOTATION = 'scale.odf.io/feature-gate';

export const isScaleFeatureGateEnabled = (sub: SubscriptionKind) => {
  const annotations =
    sub?.metadata?.annotations?.[SCALE_FEATURE_GATE_ANNOTATION];
  return annotations ? JSON.parse(annotations) : false;
};

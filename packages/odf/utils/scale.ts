import { SubscriptionKind } from '@odf/shared/types';

const SCALE_FEATURE_GATE_ANNOTATION = 'scale.odf.io/feature-gate';

export const isScaleFeatureGateEnabled = (sub: SubscriptionKind) => {
  const annotation =
    sub?.metadata?.annotations?.[SCALE_FEATURE_GATE_ANNOTATION];
  return annotation ? JSON.parse(annotation) : false;
};

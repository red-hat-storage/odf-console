import { SubscriptionModel } from '@odf/shared/models/console-models';
import { referenceForModel } from '@odf/shared/utils/common';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';

export const subscriptionResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(SubscriptionModel),
  namespaced: false,
};

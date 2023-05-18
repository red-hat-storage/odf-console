import * as React from 'react';
import { getOperandStatus } from '@odf/core/components/utils';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { PodModel } from '@odf/shared/models';
import { PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { getRunningPodHealthState } from '@odf/shared/utils/pod-health';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

const nfsPodResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(PodModel),
  namespace: 'openshift-storage',
  selector: {
    matchLabels: {
      app: 'rook-ceph-nfs',
      ceph_nfs: 'ocs-storagecluster-cephnfs',
    },
  },
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [nfsPod, nfsPodLoaded, nfsPodLoadError] =
    useK8sWatchResource<PodKind>(nfsPodResource);

  const serverHealthState = getRunningPodHealthState(
    getOperandStatus(nfsPod?.[0])?.value,
    !nfsPodLoaded,
    nfsPodLoadError
  );

  return (
    <Card data-test="nfs-status-card">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <HealthItem
          title={t('Server health')}
          state={serverHealthState.state}
        />
      </CardBody>
    </Card>
  );
};

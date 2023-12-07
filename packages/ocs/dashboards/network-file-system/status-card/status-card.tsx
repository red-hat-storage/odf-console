import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { K8sResourceObj } from '@odf/core/types';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { PodModel } from '@odf/shared/models';
import { PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  referenceForModel,
  getPodStatus,
  getPodHealthState,
} from '@odf/shared/utils';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

const nfsPodResource: K8sResourceObj = (ns) => ({
  isList: true,
  kind: referenceForModel(PodModel),
  namespace: ns,
  selector: {
    matchLabels: {
      app: 'rook-ceph-nfs',
      ceph_nfs: 'ocs-storagecluster-cephnfs',
    },
  },
});

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [nfsPods, nfsPodsLoaded, nfsPodsLoadError] =
    useSafeK8sWatchResource<PodKind[]>(nfsPodResource);

  const serverHealthState = getPodHealthState(
    getPodStatus(nfsPods?.[0]),
    !nfsPodsLoaded,
    nfsPodsLoadError
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

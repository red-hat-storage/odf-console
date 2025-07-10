import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { PodModel } from '@odf/shared/models';
import { PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  referenceForModel,
  getPodStatus,
  getPodHealthState,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { OCSDashboardContext } from '../../ocs-dashboard-providers';

const nfsPodResource = (clusterNs: string, clusterName: string) => ({
  isList: true,
  kind: referenceForModel(PodModel),
  namespace: clusterNs,
  selector: {
    matchLabels: {
      app: 'rook-ceph-nfs',
      ceph_nfs: `${clusterName}-cephnfs`,
    },
  },
});

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const {
    selectedCluster: { clusterNamespace: clusterNs },
  } = React.useContext(OCSDashboardContext);
  const { systemFlags } = useODFSystemFlagsSelector();
  const clusterName = systemFlags[clusterNs]?.ocsClusterName;

  const [nfsPods, nfsPodsLoaded, nfsPodsLoadError] = useK8sWatchResource<
    PodKind[]
  >(nfsPodResource(clusterNs, clusterName));

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

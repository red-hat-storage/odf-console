import * as React from 'react';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  HealthState,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { NFS_STATUS_QUERY, NFSDashboardQuery } from '../../../queries';

export const getServerHealthState = (
  state: string,
  loading,
  loadError
): SubsystemHealth => {
  if (loading) {
    return { state: HealthState.LOADING };
  }
  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!!state && state !== '0') {
    return { state: HealthState.OK };
  }
  return { state: HealthState.ERROR };
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [workerThreads, workerThreadsError, workerThreadsLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: NFS_STATUS_QUERY[NFSDashboardQuery.WORKER_THREADS_TOTAL],
      basePath: usePrometheusBasePath(),
    });

  const serverHealthState = getServerHealthState(
    workerThreads?.data?.result[0]?.value[1],
    workerThreadsLoading,
    workerThreadsError
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

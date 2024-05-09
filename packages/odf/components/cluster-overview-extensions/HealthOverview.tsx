import * as React from 'react';
import { getNooBaaState } from '@odf/ocs/dashboards/object-service/status-card/statuses';
import { getCephsHealthState } from '@odf/ocs/utils';
import { healthStateMapping } from '@odf/shared/dashboards';
import { CephClusterModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  StatusPopupSection,
  HealthState,
  SubsystemHealth,
  PrometheusHealthPopupProps,
  FirehoseResource,
  K8sResourceCommon,
  PrometheusHealthHandler,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom-v5-compat';
import { Stack, StackItem } from '@patternfly/react-core';
import '@odf/shared/popup/status-popup.scss';

export const getStorageSystemHealthState: PrometheusHealthHandler = (
  promMetrics,
  t,
  ceph
) => {
  const isNoobaaOnly = _.isEmpty(ceph?.data);
  if (!isNoobaaOnly) {
    return getCephsHealthState({
      ceph: {
        data: ceph.data as K8sResourceCommon[],
        loaded: ceph.loaded,
        loadError: ceph.loadError,
      },
    });
  } else {
    return getNooBaaState(promMetrics, t, {
      loaded: true,
      loadError: '',
      data: {},
    });
  }
};

export const StoragePopover: React.FC<PrometheusHealthPopupProps> = ({
  responses,
  k8sResult,
}) => {
  const { t } = useCustomTranslation();

  const noobaaHealth = getNooBaaState(responses, t, {
    loaded: true,
    loadError: '',
    data: {},
  });
  const cephData = k8sResult.data;
  const isNoobaaOnly = _.isEmpty(k8sResult);
  const cephHealthState: SubsystemHealth = getCephsHealthState(
    {
      ceph: {
        data: cephData as K8sResourceCommon[],
        loaded: k8sResult?.loaded,
        loadError: k8sResult?.loadError,
      },
    },
    t
  );
  const healthStatus: HealthState = isNoobaaOnly
    ? noobaaHealth?.state
    : cephHealthState?.state;
  const operatorName = t('Data Foundation');

  return (
    <Stack hasGutter>
      <StackItem>
        {t(
          "Storage status represents the health status of Data Foundation's StorageCluster."
        )}
      </StackItem>
      <StackItem>
        <StatusPopupSection
          firstColumn={t('Provider')}
          secondColumn={t('Health')}
        >
          <div className="odf-status-popup__row">
            <Link to="/odf">{operatorName}</Link>
            {healthStateMapping[healthStatus]?.icon}
          </div>
        </StatusPopupSection>
      </StackItem>
    </Stack>
  );
};

export { getStorageSystemHealthState as healthHandler };

export const healthResource: FirehoseResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
  prop: 'ceph',
};

import * as React from 'react';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import {
  healthStateMap,
  csvStatusMap,
} from '@odf/shared/dashboards/status-card/states';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { OCSStorageClusterModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGVK } from '@odf/shared/utils';
import {
  PrometheusResult,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import { HealthBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  Flex,
  FlexItem,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { ACM_ENDPOINT, HUB_CLUSTER_NAME } from '../../../../constants';
import { StorageDashboard, STATUS_QUERIES } from '../../queries';
import {
  StorageSystemPopup,
  ODFOperatorPopup,
  SystemHealthMap,
  CSVStatusMap,
} from './storage-system-popup';
import './status-card.scss';

type SubSystemMap = {
  [key: string]: string;
};

const getUniqueKey = (namespace: string, clusterName: string) =>
  `${namespace}-${clusterName}`;

const getWorstHealth = (healthData: SystemHealthMap[]) =>
  healthData.reduce(
    (acc: string, item: SystemHealthMap) =>
      acc < item?.rawHealthData ? item?.rawHealthData : acc,
    '0'
  );

const getUnifiedHealthValue = (sysHealthVal: string, subSysHealthVal: string) =>
  !!subSysHealthVal
    ? sysHealthVal < subSysHealthVal
      ? subSysHealthVal
      : sysHealthVal
    : sysHealthVal;

const setSubSystemMap = (
  subSysHealthData: PrometheusResponse,
  subSystemMap: SubSystemMap
) =>
  // ToDo (epic 4422): Assuming "namespace" in "odf_system.*"" metrics (except "odf_system_map" which is pushed by ODF opr and already has "target_namespace")
  // is where system is deployed (update query if needed).
  subSysHealthData?.data?.result?.forEach(
    (item: PrometheusResult) =>
      !item?.metric.managedBy &&
      item?.metric.system_type === 'OCS' &&
      (subSystemMap[
        getUniqueKey(item?.metric.target_namespace, item?.metric.cluster)
      ] = item?.value[1])
  );

const setHealthData = (
  sysHealthData: PrometheusResponse,
  healthData: SystemHealthMap[],
  subSystemMap: SubSystemMap
) =>
  // ToDo (epic 4422): Assuming "namespace" in "odf_system.*"" metrics (except "odf_system_map" which is pushed by ODF opr and already has "target_namespace")
  // is where system is deployed (update query if needed).
  sysHealthData?.data?.result?.forEach((item: PrometheusResult) => {
    const { apiGroup } = getGVK(item?.metric.target_kind);
    const healthVal = item?.value[1];
    const unifiedHealthVal = getUnifiedHealthValue(
      healthVal,
      subSystemMap[
        getUniqueKey(item?.metric.target_namespace, item?.metric.cluster)
      ]
    );
    healthData.push({
      systemName: item?.metric?.storage_system,
      rawHealthData:
        apiGroup === OCSStorageClusterModel.apiGroup
          ? unifiedHealthVal
          : healthVal,
    });
  });

const StorageSystemHealthItem: React.FC = () => {
  const { t } = useCustomTranslation();

  const [worstHealth, setWorstHealth] = React.useState<string>('');
  const [sysHealthData, sysHealthError, sysHealthLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: STATUS_QUERIES[StorageDashboard.SYSTEM_HEALTH],
      basePath: ACM_ENDPOINT,
      cluster: HUB_CLUSTER_NAME,
    });
  const [subSysHealthData, subSysHealthError, subSysHealthLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: STATUS_QUERIES[StorageDashboard.HEALTH],
      basePath: ACM_ENDPOINT,
      cluster: HUB_CLUSTER_NAME,
    });

  const parsedHealthData = React.useMemo(() => {
    const healthData: SystemHealthMap[] = [];
    const subSystemMap = {};
    !subSysHealthError &&
      !subSysHealthLoading &&
      setSubSystemMap(subSysHealthData, subSystemMap);
    !sysHealthError &&
      !sysHealthLoading &&
      setHealthData(sysHealthData, healthData, subSystemMap);
    setWorstHealth(getWorstHealth(healthData));
    return healthData;
  }, [
    sysHealthData,
    subSysHealthData,
    sysHealthError,
    subSysHealthError,
    sysHealthLoading,
    subSysHealthLoading,
  ]);

  return parsedHealthData.length > 0 ? (
    <HealthItem
      title={t('Systems')}
      state={healthStateMap(worstHealth)}
      maxWidth="25rem"
    >
      <StorageSystemPopup systemHealthMap={parsedHealthData} />
    </HealthItem>
  ) : (
    <></>
  );
};

/**
 * For system health metrics, '0' means healthy.
 * For csv status metrics, '0' means unhealthy.
 */
const getWorstStatus = (csvStatusData: CSVStatusMap[]) =>
  csvStatusData.some((item: CSVStatusMap) => item?.rawCSVData !== '1')
    ? '0'
    : '1';

const setCSVStatusData = (
  csvData: PrometheusResponse,
  csvStatusData: CSVStatusMap[]
) =>
  csvData?.data?.result?.forEach((item: PrometheusResult) =>
    csvStatusData.push({
      rawCSVData: item?.value[1],
    })
  );

const CSVStatusHealthItem: React.FC = () => {
  const { t } = useCustomTranslation();

  const [worstStatus, setWorstStatus] = React.useState<string>('');
  const [csvData, csvError, csvLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as any,
    query: STATUS_QUERIES[StorageDashboard.CSV_STATUS],
    basePath: ACM_ENDPOINT,
    cluster: HUB_CLUSTER_NAME,
  });

  const parsedCSVData = React.useMemo(() => {
    let csvStatusData = [];
    !csvError && !csvLoading && setCSVStatusData(csvData, csvStatusData);
    setWorstStatus(getWorstStatus(csvStatusData));
    return csvStatusData;
  }, [csvData, csvError, csvLoading]);

  return parsedCSVData.length > 0 ? (
    <HealthItem title={t('Data Foundation')} state={csvStatusMap(worstStatus)}>
      <ODFOperatorPopup csvStatusMap={parsedCSVData} />
    </HealthItem>
  ) : (
    <></>
  );
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card data-test="status-card">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <HealthBody>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            className="odf-StatusCard__items--width"
          >
            <FlexItem>
              <CSVStatusHealthItem />
            </FlexItem>
            <FlexItem>
              <StorageSystemHealthItem />
            </FlexItem>
          </Flex>
        </HealthBody>
      </CardBody>
    </Card>
  );
};

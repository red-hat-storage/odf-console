import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { useGetClusterDetails } from '@odf/core/redux/utils';
import { K8sResourceObj } from '@odf/core/types';
import {
  Breakdown,
  DataConsumption,
  Metrics,
  ServiceType,
} from '@odf/ocs/constants';
import { DATA_CONSUMPTION_QUERIES } from '@odf/ocs/queries';
import { getRangeVectorStats } from '@odf/shared/charts';
import { OCS_OPERATOR } from '@odf/shared/constants';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { ClusterServiceVersionModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { ClusterServiceVersionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DataPoint } from '@odf/shared/utils';
import { referenceForModel } from '@odf/shared/utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { DataConsumptionDropdown } from './data-consumption-card-dropdown';
import DataConsumptionGraph from './data-consumption-graph';
import PerformanceGraph from './performance-graph';
import './data-consumption-card.scss';

const timeSpan = {
  [ServiceType.RGW]: 60 * 60 * 1000,
  [ServiceType.MCG]: null,
};

const csvResource: K8sResourceObj = (ns) => ({
  isList: true,
  namespace: ns,
  kind: referenceForModel(ClusterServiceVersionModel),
});

type ServiceTypeProps = {
  queries: string[];
  breakdownBy?: Breakdown;
  metric: Metrics;
};

type Response = (PrometheusResponse | DataPoint<Date>[])[];

const MCGCommonComponent: React.FC<ServiceTypeProps> = ({
  queries,
  breakdownBy,
  metric,
}) => {
  const [queryA, queryAError, queryALoading] = useCustomPrometheusPoll({
    query: queries?.[0],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [queryB, queryBError, queryBLoading] = useCustomPrometheusPoll({
    query: queries?.[1],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [queryC, queryCError, queryCLoading] = useCustomPrometheusPoll({
    query: queries?.[2],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [queryD, queryDError, queryDLoading] = useCustomPrometheusPoll({
    query: queries?.[3],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loading =
    queryALoading || queryBLoading || queryCLoading || queryDLoading;
  const error =
    !!queryAError || !!queryBError || !!queryCError || !!queryDError;
  const data = !!queryA && !!queryB && !!queryC && !!queryD;
  const response: Response = React.useMemo(() => {
    return !loading && !error && data ? [queryA, queryB, queryC, queryD] : [];
  }, [queryA, queryB, queryC, queryD, loading, error, data]);

  return (
    <DataConsumptionGraph
      prometheusResponse={response as PrometheusResponse[]}
      loading={loading}
      loadError={error}
      breakdownBy={breakdownBy}
      metric={metric}
    />
  );
};

const AccountsLogical: React.FC<ServiceTypeProps> = ({
  queries,
  breakdownBy,
  metric,
}) => {
  const [usage, usageError, usageLoading] = useCustomPrometheusPoll({
    query: queries?.[0],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [totalUsage, totalUsageError, totalUsageLoading] =
    useCustomPrometheusPoll({
      query: queries?.[1],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const loading = usageLoading || totalUsageLoading;
  const error = !!usageError || !!totalUsageError;
  const data = !!usage && !!totalUsage;
  const response: Response = React.useMemo(() => {
    return !loading && !error && data ? [usage, totalUsage] : [];
  }, [usage, totalUsage, loading, error, data]);

  return (
    <DataConsumptionGraph
      prometheusResponse={response as PrometheusResponse[]}
      loading={loading}
      loadError={error}
      breakdownBy={breakdownBy}
      metric={metric}
    />
  );
};

const ProvidersEgress: React.FC<ServiceTypeProps> = ({
  queries,
  breakdownBy,
  metric,
}) => {
  const [egress, egressError, egressLoading] = useCustomPrometheusPoll({
    query: queries?.[0],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const response: Response = React.useMemo(() => {
    return !egressLoading && !egressError && egress ? [egress] : [];
  }, [egress, egressError, egressLoading]);

  return (
    <DataConsumptionGraph
      prometheusResponse={response as PrometheusResponse[]}
      loading={egressLoading}
      loadError={egressError}
      breakdownBy={breakdownBy}
      metric={metric}
    />
  );
};

const MCGBreakdownMetricMap = (queries: string[]) => {
  return {
    [Breakdown.ACCOUNTS]: {
      [Metrics.IOPS]: (
        <MCGCommonComponent
          queries={queries}
          metric={Metrics.IOPS}
          breakdownBy={Breakdown.ACCOUNTS}
        />
      ),
      [Metrics.LOGICAL]: (
        <AccountsLogical
          queries={queries}
          metric={Metrics.LOGICAL}
          breakdownBy={Breakdown.ACCOUNTS}
        />
      ),
    },
    [Breakdown.PROVIDERS]: {
      [Metrics.IOPS]: (
        <MCGCommonComponent
          queries={queries}
          metric={Metrics.IOPS}
          breakdownBy={Breakdown.PROVIDERS}
        />
      ),
      [Metrics.PHY_VS_LOG]: (
        <MCGCommonComponent
          queries={queries}
          metric={Metrics.PHY_VS_LOG}
          breakdownBy={Breakdown.PROVIDERS}
        />
      ),
      [Metrics.EGRESS]: (
        <ProvidersEgress
          queries={queries}
          metric={Metrics.EGRESS}
          breakdownBy={Breakdown.PROVIDERS}
        />
      ),
    },
  };
};

const ServiceTypeRGW: React.FC<ServiceTypeProps> = ({ queries, metric }) => {
  const [get, getError, getLoading] = useCustomPrometheusPoll({
    query: queries?.[0],
    endpoint: 'api/v1/query_range' as any,
    timespan: timeSpan[ServiceType.RGW],
    basePath: usePrometheusBasePath(),
  });
  const [put, putError, putLoading] = useCustomPrometheusPoll({
    query: queries?.[1],
    endpoint: 'api/v1/query_range' as any,
    timespan: timeSpan[ServiceType.RGW],
    basePath: usePrometheusBasePath(),
  });

  const loading = getLoading || putLoading;
  const error = !!getError || !!putError;
  const data = !!get && !!put;
  const response: DataPoint<Date>[][] = React.useMemo(() => {
    return !loading && !error && data
      ? [...getRangeVectorStats(get), ...getRangeVectorStats(put)]
      : [];
  }, [get, put, loading, error, data]);

  return (
    <PerformanceGraph
      loading={loading}
      loadError={error}
      dataPoints={response}
      metricType={metric}
    />
  );
};

const DataConsumptionCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [breakdownBy, setBreakdownBy] = React.useState(Breakdown.PROVIDERS);
  const [metric, setMetric] = React.useState(Metrics.IOPS);
  const [serviceType, setServiceType] = React.useState(ServiceType.MCG);

  const { clusterNamespace: clusterNs } = useGetClusterDetails();
  const { systemFlags } = useODFSystemFlagsSelector();
  const RGW = systemFlags[clusterNs]?.isRGWAvailable;
  const MCG = systemFlags[clusterNs]?.isNoobaaAvailable;
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const [csvList, csvLoaded, csvLoadError] =
    useSafeK8sWatchResource<ClusterServiceVersionKind[]>(csvResource);
  const isOCS45 =
    csvLoaded &&
    !csvLoadError &&
    csvList?.find((obj) => _.startsWith(getName(obj), `${OCS_OPERATOR}.v4.5`));

  React.useEffect(() => {
    if (RGW && !MCG) {
      setServiceType(ServiceType.RGW);
      setMetric(DataConsumption.defaultMetrics[ServiceType.RGW]);
      setBreakdownBy(null);
    }
  }, [RGW, MCG]);

  const queries: string[] = React.useMemo(() => {
    return serviceType === ServiceType.MCG
      ? Object.values(
          DATA_CONSUMPTION_QUERIES[ServiceType.MCG][breakdownBy][metric] ??
            DATA_CONSUMPTION_QUERIES[ServiceType.MCG][breakdownBy][Metrics.IOPS]
        )
      : Object.values(
          DATA_CONSUMPTION_QUERIES[ServiceType.RGW](managedByOCS)[metric] ??
            DATA_CONSUMPTION_QUERIES[ServiceType.MCG][Metrics.BANDWIDTH]
        );
  }, [breakdownBy, metric, serviceType, managedByOCS]);

  return (
    <Card>
      <CardHeader>
        <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between">
          <CardTitle>
            {t('Performance')}
            <FieldLevelHelp>
              {t(
                'Shows an overview of the data consumption per provider or account collected from the day of the entity creation.'
              )}
            </FieldLevelHelp>
          </CardTitle>
          <DataConsumptionDropdown
            selectedService={serviceType}
            setSelectedService={setServiceType}
            selectedBreakdown={breakdownBy}
            setSelectedBreakdown={setBreakdownBy}
            selectedMetric={metric}
            setSelectedMetric={setMetric}
            isRgwSupported={RGW && !isOCS45}
            isMcgSupported={MCG}
          />
        </div>
      </CardHeader>
      <CardBody>
        {serviceType === ServiceType.MCG &&
          MCGBreakdownMetricMap(queries)[breakdownBy][metric]}
        {serviceType === ServiceType.RGW && (
          <ServiceTypeRGW queries={queries} metric={metric} />
        )}
      </CardBody>
    </Card>
  );
};

export default DataConsumptionCard;

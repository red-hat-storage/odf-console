import * as React from 'react';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { useGetClusterDetails } from '@odf/core/redux/utils';
import { secretResource } from '@odf/core/resources';
import { OCS_OPERATOR } from '@odf/shared/constants';
import { BreakdownCardBody } from '@odf/shared/dashboards/breakdown-card/breakdown-body';
import { LabelPadding } from '@odf/shared/dashboards/breakdown-card/breakdown-chart';
import { getGroupedSelectOptions } from '@odf/shared/dashboards/breakdown-card/breakdown-dropdown';
import { Colors } from '@odf/shared/dashboards/breakdown-card/consts';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { subscriptionResource } from '@odf/shared/resources/common';
import { K8sResourceKind, SubscriptionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DataPoint, getInstantVectorStats } from '@odf/shared/utils';
import { humanizeBinaryBytes, isFunctionThenApply } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  MenuToggle,
  MenuToggleElement,
  SelectList,
  Select,
  SelectGroup,
  SelectOption,
  SelectProps,
} from '@patternfly/react-core';
import { ServiceType, CapacityBreakdown } from '../../../constants';
import { breakdownQueryMapMCG } from '../../../queries';
import { decodeRGWPrefix, getStackChartStats } from '../../../utils';
import './capacity-breakdown-card.scss';

type DropdownItems = {
  group: string;
  items: {
    name: string;
    id: string;
    disabled: boolean;
  }[];
}[];

const getDisableableSelectOptions = (dropdownItems: DropdownItems) => {
  return dropdownItems.map(({ group, items }) => (
    <SelectGroup key={group} label={group} className="co-filter-dropdown-group">
      <SelectList>
        {items.map(({ name, id, disabled }) => (
          <SelectOption key={id} value={id} isDisabled={disabled}>
            {name}
          </SelectOption>
        ))}
      </SelectList>
    </SelectGroup>
  ));
};

type ServiceTypeProps = {
  metricType: CapacityBreakdown.Metrics;
  prometheusQueries?: string[];
  model: K8sModel;
  metric: string;
  ocsVersion: string;
  labelPadding: LabelPadding;
};

type DataPointResponse = DataPoint<string | number | Date>[][];

type CapacityBreakdownCardBodyProps = ServiceTypeProps & {
  response: DataPointResponse;
  serviceType: ServiceType;
  loading: boolean;
  error: boolean;
};

const CapacityBreakdownCardBody: React.FC<CapacityBreakdownCardBodyProps> = ({
  response,
  serviceType,
  loading,
  error,
  model,
  metricType,
  ocsVersion,
  labelPadding,
}) => {
  const { t } = useCustomTranslation();

  const { odfNamespace } = useODFNamespaceSelector();

  // For charts whose datapoints are composed of multiple queries
  const flattenedResponse = response.reduce(
    (acc, curr, ind) => (ind < response?.length - 1 ? [...acc, ...curr] : acc),
    []
  );
  const top5MetricsStats = getStackChartStats(
    flattenedResponse,
    humanizeBinaryBytes,
    CapacityBreakdown.serviceMetricMap?.[serviceType]?.[metricType]
  );
  const totalUsed = String(response?.[response?.length - 1]?.[0]?.y);

  const ind = top5MetricsStats.findIndex((v) => v.name === 'Others');
  if (ind !== -1) {
    top5MetricsStats[ind].name = t('Cluster-wide');
    top5MetricsStats[ind].link = t(
      'Any NON Object bucket claims that were created via an S3 client or via the NooBaa UI system.'
    );
    top5MetricsStats[ind].color = Colors.OTHER;
  }

  return (
    <BreakdownCardBody
      isLoading={loading}
      hasLoadError={error}
      top5MetricsStats={top5MetricsStats}
      capacityUsed={totalUsed}
      metricTotal={totalUsed}
      metricModel={model}
      humanize={humanizeBinaryBytes}
      ocsVersion={ocsVersion}
      labelPadding={labelPadding}
      odfNamespace={odfNamespace}
    />
  );
};

const ServiceTypeALL: React.FC<ServiceTypeProps> = ({
  metricType,
  prometheusQueries,
  model,
  metric,
  ocsVersion,
  labelPadding,
}) => {
  const [rgw, rgwLoadError, rgwLoading] = useCustomPrometheusPoll({
    query: prometheusQueries?.[0],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [noobaa, noobaaLoadError, noobaaLoading] = useCustomPrometheusPoll({
    query: prometheusQueries?.[1],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [object, objectLoadError, objectLoading] = useCustomPrometheusPoll({
    query: prometheusQueries?.[2],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loading = rgwLoading || noobaaLoading || objectLoading;
  const error = !!rgwLoadError || !!noobaaLoadError || !!objectLoadError;
  const data = !!rgw && !!noobaa && !!object;
  const response: DataPointResponse = React.useMemo(() => {
    return !loading && !error && data
      ? [
          getInstantVectorStats(rgw, metric),
          getInstantVectorStats(noobaa, metric),
          getInstantVectorStats(object, metric),
        ]
      : [];
  }, [rgw, noobaa, object, loading, error, data, metric]);

  return (
    <CapacityBreakdownCardBody
      response={response}
      serviceType={ServiceType.ALL}
      loading={loading}
      error={error}
      metricType={metricType}
      model={model}
      metric={metric}
      ocsVersion={ocsVersion}
      labelPadding={labelPadding}
    />
  );
};

const ServiceTypeMCG: React.FC<ServiceTypeProps> = ({
  metricType,
  prometheusQueries,
  model,
  metric,
  ocsVersion,
  labelPadding,
}) => {
  const [byUsed, byUsedError, byUsedLoading] = useCustomPrometheusPoll({
    query: prometheusQueries?.[0],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [totalUsed, totalUsedError, totalUsedLoading] = useCustomPrometheusPoll(
    {
      query: prometheusQueries?.[1],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );

  const loading = byUsedLoading || totalUsedLoading;
  const error = !!byUsedError || !!totalUsedError;
  const data = !!byUsed && !!totalUsed;
  const response: DataPointResponse = React.useMemo(() => {
    return !loading && !error && data
      ? [
          getInstantVectorStats(byUsed, metric),
          getInstantVectorStats(totalUsed, metric),
        ]
      : [];
  }, [byUsed, totalUsed, loading, error, data, metric]);

  return (
    <CapacityBreakdownCardBody
      response={response}
      serviceType={ServiceType.MCG}
      loading={loading}
      error={error}
      metricType={metricType}
      model={model}
      metric={metric}
      ocsVersion={ocsVersion}
      labelPadding={labelPadding}
    />
  );
};

const ServiceTypeRGW: React.FC<ServiceTypeProps> = ({
  metricType,
  prometheusQueries,
  model,
  metric,
  ocsVersion,
  labelPadding,
}) => {
  const [totalUsed, totalUsedError, totalUsedLoading] = useCustomPrometheusPoll(
    {
      query: prometheusQueries?.[0],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const [used, usedError, usedLoading] = useCustomPrometheusPoll({
    query: prometheusQueries?.[1],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loading = usedLoading || totalUsedLoading;
  const error = !!usedError || !!totalUsedError;
  const data = !!totalUsed && !!used;
  const response: DataPointResponse = React.useMemo(() => {
    return !loading && !error && data
      ? [
          getInstantVectorStats(used, metric),
          getInstantVectorStats(totalUsed, metric),
        ]
      : [];
  }, [used, totalUsed, loading, error, data, metric]);

  return (
    <CapacityBreakdownCardBody
      response={response}
      serviceType={ServiceType.RGW}
      loading={loading}
      error={error}
      metricType={metricType}
      model={model}
      metric={metric}
      ocsVersion={ocsVersion}
      labelPadding={labelPadding}
    />
  );
};

const BreakdownCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [serviceType, setServiceType] = React.useState(ServiceType.MCG);
  const [metricType, setMetricType] = React.useState<CapacityBreakdown.Metrics>(
    CapacityBreakdown.defaultMetrics[ServiceType.MCG]
  );
  const [isOpenServiceSelect, setServiceSelect] = React.useState(false);
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);

  const { clusterNamespace: clusterNs } = useGetClusterDetails();
  const { systemFlags } = useODFSystemFlagsSelector();
  const isRGWSupported = systemFlags[clusterNs]?.isRGWAvailable;
  const isMCGSupported = systemFlags[clusterNs]?.isNoobaaAvailable;
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  React.useEffect(() => {
    if (isRGWSupported && isMCGSupported) {
      setServiceType(ServiceType.ALL);
      setMetricType(CapacityBreakdown.defaultMetrics[ServiceType.ALL]);
    } else if (isMCGSupported) {
      setServiceType(ServiceType.MCG);
      setMetricType(CapacityBreakdown.defaultMetrics[ServiceType.MCG]);
    } else if (isRGWSupported) {
      setServiceType(ServiceType.RGW);
      setMetricType(CapacityBreakdown.defaultMetrics[ServiceType.RGW]);
    }
  }, [isRGWSupported, isMCGSupported]);

  const [secretData, secretLoaded, secretLoadError] =
    useK8sWatchResource<K8sResourceKind>(secretResource(clusterNs));
  const rgwPrefix = React.useMemo(
    () =>
      isRGWSupported && secretLoaded && !secretLoadError
        ? decodeRGWPrefix(secretData)
        : '',
    [secretData, secretLoaded, secretLoadError, isRGWSupported]
  );

  const { queries, model, metric } = React.useMemo(() => {
    const {
      queries: q,
      model: mo,
      metric: me,
    } = breakdownQueryMapMCG[serviceType][metricType] ??
    breakdownQueryMapMCG[serviceType][
      CapacityBreakdown.defaultMetrics[serviceType]
    ];
    return {
      queries: isFunctionThenApply(q)(rgwPrefix, managedByOCS),
      model: mo,
      metric: me,
    };
  }, [serviceType, metricType, rgwPrefix, managedByOCS]);

  const prometheusQueries = React.useMemo(
    () => Object.values(queries) as string[],
    [queries]
  );

  const [subscription, loaded, loadError] =
    useK8sWatchResource<SubscriptionKind>(subscriptionResource);

  const breakdownItems = React.useMemo(
    () => [
      {
        group: t('Break by'),
        items: [
          {
            id: CapacityBreakdown.Metrics.TOTAL,
            name: t('Total'),
            disabled: false,
          },
          {
            id: CapacityBreakdown.Metrics.PROJECTS,
            name: t('Projects'),
            disabled: serviceType !== ServiceType.MCG,
          },
          {
            id: CapacityBreakdown.Metrics.BC,
            name: t('BucketClasses'),
            disabled: serviceType !== ServiceType.MCG,
          },
        ],
      },
    ],
    [serviceType, t]
  );

  const ServiceItems = [
    {
      group: t('Service type'),
      items: [
        { name: t('All'), id: ServiceType.ALL },
        { name: ServiceType.MCG, id: ServiceType.MCG },
        { name: ServiceType.RGW, id: ServiceType.RGW },
      ],
    },
  ];

  const serviceSelectItems = getGroupedSelectOptions(ServiceItems);
  const breakdownSelectItems = getDisableableSelectOptions(breakdownItems);

  const handleServiceChange = (_e: React.MouseEvent, service: ServiceType) => {
    setServiceType(service);
    setMetricType(CapacityBreakdown.defaultMetrics[service]);
    setServiceSelect(!isOpenServiceSelect);
  };

  const handleMetricsChange: SelectProps['onSelect'] = (_e, breakdown) => {
    setMetricType(breakdown as CapacityBreakdown.Metrics);
    setBreakdownSelect(!isOpenBreakdownSelect);
  };

  const padding =
    serviceType !== ServiceType.MCG
      ? { top: 0, bottom: 0, left: 0, right: 50 }
      : undefined;

  const ocsVersion =
    loaded && !loadError
      ? (() => {
          const operator = _.find(
            subscription,
            (item) => _.get(item, 'spec.name') === OCS_OPERATOR
          );
          return _.get(operator, 'status.installedCSV');
        })()
      : '';

  const getMetricDisplayName = (metricName: string): string => {
    switch (metricName) {
      case CapacityBreakdown.Metrics.TOTAL:
        return 'Total';
      case CapacityBreakdown.Metrics.PROJECTS:
        return 'Projects';
      case CapacityBreakdown.Metrics.BC:
        return 'BucketClasses';
      default:
        return 'Total';
    }
  };

  const serviceTypeToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setServiceSelect(!isOpenServiceSelect)}
      isExpanded={isOpenServiceSelect}
      className="nb-capacity-breakdown-card-header__dropdown nb-capacity-breakdown-card-header__dropdown--margin"
      aria-label={t('Service Type Dropdown Toggle')}
    >
      {t('{{serviceType}}', {
        serviceType,
      })}
    </MenuToggle>
  );

  const breakDownToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setBreakdownSelect(!isOpenBreakdownSelect)}
      isExpanded={isOpenBreakdownSelect}
      className="nb-capacity-breakdown-card-header__dropdown"
      aria-label={t('Break By Dropdown Toggle')}
    >
      {t('{{metricName}}', { metricName: getMetricDisplayName(metricType) })}
    </MenuToggle>
  );

  return (
    <Card>
      <CardHeader>
        <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between">
          <CardTitle>
            {t('Capacity breakdown')}
            <FieldLevelHelp>
              {t(
                'This card shows used capacity for different resources. The available capacity is based on cloud services therefore it cannot be shown.'
              )}
            </FieldLevelHelp>
          </CardTitle>
          {isRGWSupported && isMCGSupported && (
            <Select
              isOpen={isOpenServiceSelect}
              onOpenChange={setServiceSelect}
              selected={serviceType}
              onSelect={handleServiceChange}
              aria-label={t('Service Type Dropdown')}
              toggle={serviceTypeToggle}
            >
              {serviceSelectItems}
            </Select>
          )}
          <Select
            isOpen={isOpenBreakdownSelect}
            onSelect={handleMetricsChange}
            selected={metricType}
            onOpenChange={setBreakdownSelect}
            aria-label={t('Break By Dropdown')}
            toggle={breakDownToggle}
          >
            {breakdownSelectItems}
          </Select>
        </div>
      </CardHeader>
      <CardBody className="nb-capacity-breakdown-card__body">
        {serviceType === ServiceType.ALL && (
          <ServiceTypeALL
            metricType={metricType}
            prometheusQueries={prometheusQueries}
            model={model}
            metric={metric}
            ocsVersion={ocsVersion}
            labelPadding={padding}
          />
        )}
        {serviceType === ServiceType.MCG && (
          <ServiceTypeMCG
            metricType={metricType}
            prometheusQueries={prometheusQueries}
            model={model}
            metric={metric}
            ocsVersion={ocsVersion}
            labelPadding={padding}
          />
        )}
        {serviceType === ServiceType.RGW && (
          <ServiceTypeRGW
            metricType={metricType}
            prometheusQueries={prometheusQueries}
            model={model}
            metric={metric}
            ocsVersion={ocsVersion}
            labelPadding={padding}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default BreakdownCard;

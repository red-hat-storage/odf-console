import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { secretResource } from '@odf/core/resources';
import { OCS_OPERATOR } from '@odf/shared/constants';
import { BreakdownCardBody } from '@odf/shared/dashboards/breakdown-card/breakdown-body';
import { LabelPadding } from '@odf/shared/dashboards/breakdown-card/breakdown-chart';
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
  Select,
  SelectList,
  SelectGroup,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ServiceType, CapacityBreakdown } from '../../../constants';
import { breakdownQueryMapMCG } from '../../../queries';
import { decodeRGWPrefix, getStackChartStats } from '../../../utils';
import { OCSDashboardContext } from '../../ocs-dashboard-providers';
import './capacity-breakdown-card.scss';

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

const ServiceTypeALL: React.FC<ServiceTypeProps> = (props) => {
  const { prometheusQueries, metric } = props;
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

  const response: DataPointResponse = React.useMemo(
    () =>
      !loading && !error && data
        ? [
            getInstantVectorStats(rgw, metric),
            getInstantVectorStats(noobaa, metric),
            getInstantVectorStats(object, metric),
          ]
        : [],
    [rgw, noobaa, object, loading, error, data, metric]
  );

  return (
    <CapacityBreakdownCardBody
      {...props}
      response={response}
      serviceType={ServiceType.ALL}
      loading={loading}
      error={error}
    />
  );
};

const ServiceTypeMCG: React.FC<ServiceTypeProps> = (props) => {
  const { prometheusQueries, metric } = props;
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

  const response: DataPointResponse = React.useMemo(
    () =>
      !loading && !error && data
        ? [
            getInstantVectorStats(byUsed, metric),
            getInstantVectorStats(totalUsed, metric),
          ]
        : [],
    [byUsed, totalUsed, loading, error, data, metric]
  );

  return (
    <CapacityBreakdownCardBody
      {...props}
      response={response}
      serviceType={ServiceType.MCG}
      loading={loading}
      error={error}
    />
  );
};

const ServiceTypeRGW: React.FC<ServiceTypeProps> = (props) => {
  const { prometheusQueries, metric } = props;
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

  const response: DataPointResponse = React.useMemo(
    () =>
      !loading && !error && data
        ? [
            getInstantVectorStats(used, metric),
            getInstantVectorStats(totalUsed, metric),
          ]
        : [],
    [used, totalUsed, loading, error, data, metric]
  );

  return (
    <CapacityBreakdownCardBody
      {...props}
      response={response}
      serviceType={ServiceType.RGW}
      loading={loading}
      error={error}
    />
  );
};

const ServiceTypeDropdown: React.FC<{
  serviceType: ServiceType;
  setServiceType: (s: ServiceType) => void;
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
}> = ({ serviceType, setServiceType, isOpen, setIsOpen }) => {
  const { t } = useCustomTranslation();

  const serviceLabels: Record<ServiceType, string> = {
    [ServiceType.ALL]: t('All'),
    [ServiceType.MCG]: ServiceType.MCG,
    [ServiceType.RGW]: ServiceType.RGW,
  };

  const onSelect = (_e: any, value: string) => {
    setServiceType(value as ServiceType);
    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      isExpanded={isOpen}
      onClick={() => setIsOpen(!isOpen)}
      style={{ width: '170px' }}
    >
      {serviceLabels[serviceType] || t('Select')}
    </MenuToggle>
  );

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      selected={serviceType}
      onSelect={onSelect}
      toggle={toggle}
    >
      <SelectList>
        <SelectGroup label={t('Service type')}>
          <SelectOption value={ServiceType.ALL}>{t('All')}</SelectOption>
          <SelectOption value={ServiceType.MCG}>{ServiceType.MCG}</SelectOption>
          <SelectOption value={ServiceType.RGW}>{ServiceType.RGW}</SelectOption>
        </SelectGroup>
      </SelectList>
    </Select>
  );
};

const BreakdownDropdown: React.FC<{
  metricType: CapacityBreakdown.Metrics;
  setMetricType: (m: CapacityBreakdown.Metrics) => void;
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  serviceType: ServiceType;
}> = ({ metricType, setMetricType, isOpen, setIsOpen, serviceType }) => {
  const { t } = useCustomTranslation();

  const metricLabels: Record<string, string> = {
    [CapacityBreakdown.Metrics.TOTAL]: t('Total'),
    [CapacityBreakdown.Metrics.PROJECTS]: t('Projects'),
    [CapacityBreakdown.Metrics.BC]: t('BucketClasses'),
  };

  const onSelect = (_e: any, value: string) => {
    setMetricType(value as CapacityBreakdown.Metrics);
    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      isExpanded={isOpen}
      onClick={() => setIsOpen(!isOpen)}
      style={{ width: '170px' }}
    >
      {metricLabels[metricType] || t('Select')}
    </MenuToggle>
  );

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      selected={metricType}
      onSelect={onSelect}
      toggle={toggle}
    >
      <SelectList>
        <SelectGroup label={t('Break by')}>
          <SelectOption value={CapacityBreakdown.Metrics.TOTAL}>
            {t('Total')}
          </SelectOption>
          <SelectOption
            value={CapacityBreakdown.Metrics.PROJECTS}
            isDisabled={serviceType !== ServiceType.MCG}
          >
            {t('Projects')}
          </SelectOption>
          <SelectOption
            value={CapacityBreakdown.Metrics.BC}
            isDisabled={serviceType !== ServiceType.MCG}
          >
            {t('BucketClasses')}
          </SelectOption>
        </SelectGroup>
      </SelectList>
    </Select>
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

  const {
    selectedCluster: { clusterNamespace: clusterNs },
  } = React.useContext(OCSDashboardContext);
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

  return (
    <Card>
      <CardHeader>
        <div className="pf-v5-u-display-flex pf-v5-u-justify-content-space-between">
          <CardTitle>
            {t('Capacity breakdown')}
            <FieldLevelHelp>
              {t(
                'This card shows used capacity for different resources. The available capacity is based on cloud services therefore it cannot be shown.'
              )}
            </FieldLevelHelp>
          </CardTitle>

          {isRGWSupported && isMCGSupported && (
            <ServiceTypeDropdown
              serviceType={serviceType}
              setServiceType={(s) => {
                setServiceType(s);
                setMetricType(CapacityBreakdown.defaultMetrics[s]);
              }}
              isOpen={isOpenServiceSelect}
              setIsOpen={setServiceSelect}
            />
          )}

          <BreakdownDropdown
            metricType={metricType}
            setMetricType={setMetricType}
            isOpen={isOpenBreakdownSelect}
            setIsOpen={setBreakdownSelect}
            serviceType={serviceType}
          />
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

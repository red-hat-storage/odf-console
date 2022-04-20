import * as React from 'react';
import {
  StorageDashboard,
  CAPACITY_QUERIES,
} from '@odf/mco/components/mco-dashboard/queries';
import { ACMManagedClusterModel } from '@odf/mco/models';
import { ACMManagedClusterKind } from '@odf/mco/types';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { ODFStorageSystem } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import Table from '@odf/shared/table/table';
import { HumanizeResult } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes, referenceForModel } from '@odf/shared/utils';
import {
  PrometheusResult,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import {
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  Tooltip,
  Button,
  ButtonVariant,
  TextInput,
} from '@patternfly/react-core';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { SortByDirection } from '@patternfly/react-table';
import { ACM_ENDPOINT, CLUSTER_CLAIM_URL_NAME } from '../../../constants';
import './capacity-card.scss';

type CapacityMetricDatum = {
  systemName: string;
  clusterName: string;
  totalValue: HumanizeResult;
  usedValue: HumanizeResult;
  clusterURL: string;
};

type GetRow = (
  args: CapacityMetricDatum,
  index: number
) => [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode];

type CapacityMetricDatumMap = { string: CapacityMetricDatum };

type ManagedClusterLinkMap = { string: string };

type ClusterClaimObject = { name: string; value: string };

const getClusterURL = (clusterClaimsList: ClusterClaimObject[]) =>
  clusterClaimsList?.find(
    (claimObj: ClusterClaimObject) => claimObj?.name === CLUSTER_CLAIM_URL_NAME
  )?.value || undefined;

const getPercentage = (usedValue: HumanizeResult, totalValue: HumanizeResult) =>
  (humanizeBinaryBytes(usedValue.value, usedValue.unit, totalValue.unit).value /
    totalValue.value) *
  100;

const systemNameSort = (
  a: CapacityMetricDatum,
  b: CapacityMetricDatum,
  c: SortByDirection
) => {
  const negation = c !== SortByDirection.asc;
  const sortVal = a.systemName.localeCompare(b.systemName);
  return negation ? -sortVal : sortVal;
};

const clusterNameSort = (
  a: CapacityMetricDatum,
  b: CapacityMetricDatum,
  c: SortByDirection
) => {
  const negation = c !== SortByDirection.asc;
  const sortVal = a.clusterName.localeCompare(b.clusterName);
  return negation ? -sortVal : sortVal;
};

const metricsSort = (
  a: CapacityMetricDatum,
  b: CapacityMetricDatum,
  c: SortByDirection
) => {
  const negation = c !== SortByDirection.asc;
  /**
   * If total capacity is not present (mcg standalone),
   * setting percentage as 100, will be used for sorting the rows based on used capacity %.
   */
  const percentageA = !!a?.totalValue
    ? getPercentage(a?.usedValue, a?.totalValue)
    : 100;
  const percentageB = !!b?.totalValue
    ? getPercentage(b?.usedValue, b?.totalValue)
    : 100;
  const sortVal = percentageA - percentageB || 0;
  return negation ? -sortVal : sortVal;
};

const headerColumns = (t: TFunction) => [
  {
    columnName: t('plugin__odf-console~Name'),
    className: 'pf-u-w-25',
    sortFunction: systemNameSort,
  },
  {
    columnName: t('plugin__odf-console~Cluster name'),
    className: 'pf-u-w-20',
    sortFunction: clusterNameSort,
  },
  {
    columnName: t('plugin__odf-console~Used Capacity %'),
    className: 'pf-u-w-25',
    sortFunction: metricsSort,
  },
  {
    columnName: t('plugin__odf-console~Used / Total'),
    className: 'pf-u-w-30',
  },
];

const getRow: GetRow = (
  { systemName, clusterName, totalValue, usedValue, clusterURL },
  index
) => {
  const isPercentage = !!totalValue;
  const progress = isPercentage ? getPercentage(usedValue, totalValue) : 100;
  const value = isPercentage
    ? `${usedValue.string} / ${totalValue.string}`
    : usedValue.string;
  const variant = (() => {
    if (!totalValue) {
      return null;
    }
    if (progress >= 80) {
      return ProgressVariant.danger;
    }
    if (progress >= 75) {
      return ProgressVariant.warning;
    }
  })();
  const dataUnavailable = _.isNaN(progress);

  return [
    <Tooltip key={`${systemName}${index}`} content={systemName}>
      <ResourceLink
        link={clusterURL}
        resourceModel={ODFStorageSystem}
        resourceName={systemName}
        className="odf-capacityCardLink--ellipsis"
        isExternalLink
      />
    </Tooltip>,

    <Tooltip key={`${clusterName}${index}`} content={clusterName}>
      <div>{clusterName}</div>
    </Tooltip>,

    !isPercentage ? (
      <Progress
        value={dataUnavailable ? null : progress}
        label={!dataUnavailable ? `${progress.toFixed(2)} %` : ''}
        size="md"
        measureLocation={
          !isPercentage
            ? ProgressMeasureLocation.none
            : ProgressMeasureLocation.outside
        }
        variant={variant}
      />
    ) : (
      <Tooltip
        key={index}
        content={!dataUnavailable ? <>{progress.toFixed(2)} %</> : null}
      >
        <Progress
          value={dataUnavailable ? null : progress}
          label={!dataUnavailable ? `${progress.toFixed(2)} %` : ''}
          size="md"
          measureLocation={ProgressMeasureLocation.outside}
          variant={variant}
        />
      </Tooltip>
    ),

    <>{dataUnavailable ? '-' : value}</>,
  ];
};

const SystemCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [updatefilteredData, setUpdateFilteredData] =
    React.useState<boolean>(true);
  const [unfilteredData, setUnfilteredData] = React.useState<
    CapacityMetricDatum[]
  >([]);
  const [filteredData, setFilteredData] = React.useState<CapacityMetricDatum[]>(
    []
  );

  const [managedClusters, managedClustersLoaded, managedClustersError] =
    useK8sWatchResource<ACMManagedClusterKind[]>({
      kind: referenceForModel(ACMManagedClusterModel),
      isList: true,
      namespaced: false,
    });

  const [usedCapacity, errorUsedCapacity, loadingUsedCapacity] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_FILE_BLOCK],
      basePath: ACM_ENDPOINT,
    });
  const [totalCapacity, errorTotalCapacity, loadingTotalCapacity] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: CAPACITY_QUERIES[StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK],
      basePath: ACM_ENDPOINT,
    });

  React.useEffect(() => {
    const ManagedClusterLink: ManagedClusterLinkMap =
      managedClustersLoaded && !managedClustersError
        ? managedClusters?.reduce(
            (acc: ManagedClusterLinkMap, cluster: ACMManagedClusterKind) => {
              acc[cluster?.metadata?.name] = getClusterURL(
                cluster?.status?.clusterClaims
              );
              return acc;
            },
            {} as ManagedClusterLinkMap
          )
        : ({} as ManagedClusterLinkMap);

    const dataMap: CapacityMetricDatumMap =
      !loadingUsedCapacity && !errorUsedCapacity
        ? usedCapacity?.data?.result?.reduce(
            (acc: CapacityMetricDatumMap, usedMetric: PrometheusResult) => {
              const systemName = usedMetric?.metric?.storage_system;
              const clusterName = usedMetric?.metric?.cluster;
              const clusterURL = ManagedClusterLink.hasOwnProperty(clusterName)
                ? ManagedClusterLink[clusterName]
                : undefined;
              acc[systemName + clusterName] = {
                systemName,
                clusterName,
                usedValue: humanizeBinaryBytes(usedMetric?.value?.[1]),
                totalValue: undefined,
                clusterURL,
              };
              return acc;
            },
            {} as CapacityMetricDatumMap
          )
        : ({} as CapacityMetricDatumMap);

    !loadingTotalCapacity &&
      !errorTotalCapacity &&
      totalCapacity?.data?.result?.forEach((totalMetric: PrometheusResult) => {
        const dataMapKey =
          totalMetric?.metric?.storage_system + totalMetric?.metric?.cluster;
        dataMap.hasOwnProperty(dataMapKey) &&
          (dataMap[dataMapKey].totalValue = !!totalMetric?.value?.[1]
            ? humanizeBinaryBytes(totalMetric?.value?.[1])
            : undefined);
      });

    const data: CapacityMetricDatum[] = _.map(
      dataMap,
      (metricDatumMap: CapacityMetricDatum) => metricDatumMap
    );
    setUnfilteredData(data);
    updatefilteredData && setFilteredData(data);
  }, [
    loadingUsedCapacity,
    loadingTotalCapacity,
    errorUsedCapacity,
    errorTotalCapacity,
    usedCapacity,
    totalCapacity,
    updatefilteredData,
    managedClusters,
    managedClustersLoaded,
    managedClustersError,
    setUnfilteredData,
    setFilteredData,
  ]);

  const error = !_.isEmpty(errorTotalCapacity) || !_.isEmpty(errorUsedCapacity);
  const isLoading = loadingUsedCapacity && loadingTotalCapacity;

  const onChange = (searchValue: string) => {
    if (searchValue === '') {
      setUpdateFilteredData(true);
      setFilteredData(unfilteredData);
    } else {
      setUpdateFilteredData(false);
      setFilteredData(
        unfilteredData?.filter((capacityData) =>
          capacityData?.clusterName
            .toLocaleLowerCase()
            .includes(searchValue.toLocaleLowerCase())
        )
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="odf-capacityCard__header--width"
        >
          <FlexItem>
            <CardTitle>{t('Storage System capacity')}</CardTitle>
          </FlexItem>
          <FlexItem>
            <TextInput
              placeholder={t('Search by cluster name...')}
              name="clusterNameText"
              id="clusterNameText"
              type="text"
              className="odf-capacityCard__filter--width"
              aria-label={t('cluster name search')}
              onChange={onChange}
            />
            <Button
              variant={ButtonVariant.control}
              aria-label={t('cluster name search button')}
            >
              <SearchIcon />
            </Button>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody className="odf-capacityCard__table--overflow">
        {!error && !isLoading && (
          <Table
            columns={headerColumns(t)}
            rawData={filteredData as []}
            rowRenderer={getRow as any}
            ariaLabel={t('Capacity Card')}
          />
        )}
        {isLoading && !error && <CapacityCardLoading />}
        {((error && !isLoading) ||
          (!error && !isLoading && _.isEmpty(filteredData))) && (
          <div className="odf-capacityCard--error">
            <DataUnavailableError />
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default SystemCapacityCard;

const CapacityCardRowLoading: React.FC = () => (
  <div className="odf-capacityCardLoading-body__item">
    <div className="odf-capacityCardLoading-body__item-item__element odf-capacityCardLoading-body__item--thin" />
    <div className="odf-capacityCardLoading-body__item-item__element odf-capacityCardLoading-body__item--thin" />
    <div className="odf-capacityCardLoading-body__item-item__element odf-capacityCardLoading-body__item--thick" />
    <div className="odf-capacityCardLoading-body__item-item__element odf-capacityCardLoading-body__item--thin" />
  </div>
);
const CapacityCardLoading: React.FC = () => (
  <div className="odf-capacityCardLoading-body">
    <CapacityCardRowLoading />
    <CapacityCardRowLoading />
    <CapacityCardRowLoading />
    <CapacityCardRowLoading />
    <CapacityCardRowLoading />
  </div>
);

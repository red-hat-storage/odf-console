import * as React from 'react';
import { CAPACITY_QUERIES, StorageDashboard } from '@odf/mco/components/mco-dashboard/queries';
import { ODFStorageSystem } from '@odf/mco/models/models';
import { DataUnavailableError } from '@odf/shared/generic/Error'
import { useURLPoll } from '@odf/shared/hooks/use-url-poll/use-url-poll';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import Table from '@odf/shared/table/table';
import { HumanizeResult } from '@odf/shared/types';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
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
  CardTitle ,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { SortByDirection } from '@patternfly/react-table';
import './capacity-card.scss';

const ACM_ENDPOINT = '/acm-thanos-querier/api/v1/query?query';

type CapacityMetricDatum = {
  systemName: string;
  clusterName: string;
  totalValue: HumanizeResult;
  usedValue: HumanizeResult;
};

type GetRow = (
  args: CapacityMetricDatum,
  index: number,
) => [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode];

const getPercentage = (usedValue: HumanizeResult, totalValue: HumanizeResult) =>
  (humanizeBinaryBytes(
    usedValue.value,
    usedValue.unit,
    totalValue.unit
  ).value /
  totalValue.value) *100;

const nameSort = (a: CapacityMetricDatum, b: CapacityMetricDatum, c: SortByDirection) => {
  const negation = c !== SortByDirection.asc;
  const sortVal = a.systemName.localeCompare(b.systemName);
  return negation ? -sortVal : sortVal;
};

const metricsSort =
  (a: CapacityMetricDatum, b: CapacityMetricDatum, c: SortByDirection) => {
    const negation = c !== SortByDirection.asc;
    /**
     * If total capacity is not present (mcg standalone),
     * setting percentage as 100, will be used for sorting the rows based on used capacity %.
     */
    const percentageA = !!a?.totalValue
      ? getPercentage(a?.usedValue, a?.totalValue) : 100;
    const percentageB = !!b?.totalValue
      ? getPercentage(b?.usedValue, b?.totalValue) : 100;
    const sortVal = percentageA - percentageB || 0;
    return negation ? -sortVal : sortVal;
};

const headerColumns = (t: TFunction) => [
  {
    columnName: t('plugin__odf-console~Name'),
    className: 'pf-u-w-25',
    sortFunction: nameSort,
  },
  {
    columnName: t('plugin__odf-console~Cluster Name'),
    className: 'pf-u-w-20',
    sortFunction: nameSort,
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

const getRow: GetRow = ({
  systemName,
  clusterName,
  totalValue,
  usedValue,
}, index) => {
  const isPercentage = !!totalValue;
  const progress = isPercentage
      ? getPercentage(usedValue, totalValue)
      : 100;
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
        link={'/multicloud/clusters'}
        resourceModel={ODFStorageSystem}
        resourceName={systemName}
        className="odf-capacityCardLink--ellipsis"
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
  const { t } = useTranslation('plugin__odf-console');
  const [updatefilteredData, setUpdateFilteredData] = React.useState<boolean>(true);
  const [unfilteredData, setUnfilteredData] = React.useState<CapacityMetricDatum[]>([]);
  const [filteredData, setFilteredData] = React.useState<CapacityMetricDatum[]>([]);

  const [usedCapacity, errorUsedCapacity, loadingUsedCapacity] =
    useURLPoll<PrometheusResponse>(`${ACM_ENDPOINT}=${CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_FILE_BLOCK]}`);

  const [totalCapacity, errorTotalCapacity, loadingTotalCapacity] =
    useURLPoll<PrometheusResponse>(`${ACM_ENDPOINT}=${CAPACITY_QUERIES[StorageDashboard.TOTAL_CAP_FILE_BLOCK]}`);

  React.useEffect(() => {
    const data = !loadingUsedCapacity && !loadingTotalCapacity && !errorUsedCapacity && !errorTotalCapacity
    ? (usedCapacity?.data?.result?.reduce<CapacityMetricDatum[]>((acc, usedMetric) => {
      totalCapacity?.data?.result?.find((totalMetric) => {
        if(usedMetric?.metric?.cluster === totalMetric?.metric?.cluster &&
          usedMetric?.metric?.storage_system === totalMetric?.metric?.storage_system) {
            acc.push({
              systemName: usedMetric?.metric?.storage_system,
              clusterName: usedMetric?.metric?.cluster,
              usedValue: humanizeBinaryBytes(usedMetric?.value?.[1]),
              totalValue: !!totalMetric?.value?.[1]
              ? humanizeBinaryBytes(totalMetric?.value?.[1])
              : undefined,
            });
            return true;
          }
      });
      return acc;
    }, [])) : [];
    setUnfilteredData(data);
    updatefilteredData && setFilteredData(data);
  },
  [loadingUsedCapacity,
    loadingTotalCapacity,
    errorUsedCapacity,
    errorTotalCapacity,
    usedCapacity,
    totalCapacity,
    updatefilteredData,
    setUnfilteredData,
    setFilteredData]);

  const error =
    !_.isEmpty(errorTotalCapacity) ||
    !_.isEmpty(errorUsedCapacity);
  const isLoading =
    loadingUsedCapacity && loadingTotalCapacity;

  const onChange = (searchValue: string) => {
    if (searchValue === '') {
      setUpdateFilteredData(true);
      setFilteredData(unfilteredData);
    }
    else {
      setUpdateFilteredData(false);
      setFilteredData(unfilteredData?.filter((capacityData) => capacityData?.clusterName.toLocaleLowerCase().includes(searchValue.toLocaleLowerCase())));
    }
  }

  return (
    <Card>
      <CardHeader>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="odf-capacityCard__header--width"
        >
          <FlexItem>
            <CardTitle>{t('Storage System Capacity')}</CardTitle>
          </FlexItem>
          <FlexItem>
            <TextInput
            placeholder={t("Search by cluster name...")}
            name="clusterNameText"
            id="clusterNameText"
            type="text"
            className="odf-capacityCard__filter--width"
            aria-label={t("cluster name search")}
            onChange={onChange}/>
            <Button variant={ButtonVariant.control} aria-label={t("cluster name search button")}>
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
        {((error && !isLoading) || (!error && !isLoading && _.isEmpty(filteredData))) && 
          (<div className="odf-capacityCard--error">
              <DataUnavailableError />
        </div>)}
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
    <CapacityCardRowLoading/>
    <CapacityCardRowLoading/>
    <CapacityCardRowLoading/>
    <CapacityCardRowLoading/>
    <CapacityCardRowLoading/>
  </div>
);

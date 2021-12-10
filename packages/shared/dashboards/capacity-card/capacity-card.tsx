import * as React from 'react';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import classNames from 'classnames';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  Grid,
  GridItem,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { DataUnavailableError } from '../../generic/Error';
import ResourceLink from '../../resource-link/resource-link';
import { HumanizeResult } from '../../types';
import { getDashboardLink } from '../../utils';
import { humanizeBinaryBytes } from '../../utils/humanize';
import './capacity-card.scss';

export type CapacityMetricDatum = {
  name: string;
  managedSystemName?: string;
  managedSystemKind?: string;
  totalValue?: HumanizeResult;
  usedValue: HumanizeResult;
};

type CapacityCardProps = {
  data: CapacityMetricDatum[];
  relative?: boolean;
  isPercentage?: boolean;
  loading?: boolean;
  resourceModel?: K8sKind;
};

const getPercentage = (item: CapacityMetricDatum) =>
  (humanizeBinaryBytes(
    item.usedValue.value,
    item.usedValue.unit,
    item.totalValue.unit
  ).value /
    item.totalValue.value) *
  100;

const sortMetrics = (
  metrics: CapacityMetricDatum[],
  direction: 'ASC' | 'DESC' = 'ASC',
  relative = false
): CapacityMetricDatum[] => {
  metrics.sort((a, b) => {
    let comparatorA = a.usedValue.value;
    const comparatorB = humanizeBinaryBytes(
      b.usedValue.value,
      b.usedValue.unit,
      a.usedValue.unit
    ).value;
    if (!relative) {
      comparatorA = getPercentage(a);
      comparatorA = getPercentage(b);
    }
    if (comparatorA < comparatorB) {
      return direction === 'ASC' ? -1 : 1;
    }
    if (comparatorB > comparatorA) {
      return direction === 'ASC' ? 1 : -1;
    }
    return 0;
  });
  return metrics;
};

type CapacityCardHeaderProps = {
  showPercentage: boolean;
};

const CapacityCardHeader: React.FC<CapacityCardHeaderProps> = ({
  showPercentage,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  return (
    <>
      <GridItem span={2}>
        <Title headingLevel="h3" size="md">
          {t('Name')}
        </Title>
      </GridItem>
      <GridItem span={7}>
        <Title headingLevel="h3" size="md">
          {t('Used Capacity')} {showPercentage && <>%</>}
        </Title>
      </GridItem>
      <GridItem span={3}>
        <Title headingLevel="h3" size="md">
          {t('Used / Total')}
        </Title>
      </GridItem>
    </>
  );
};

type CapacityCardRowProps = {
  data: CapacityMetricDatum;
  isRelative?: boolean;
  isPercentage?: boolean;
  largestValue?: HumanizeResult;
  resourceModel?: K8sKind;
};

const getProgress = (
  data: CapacityMetricDatum,
  isRelative: boolean,
  largestValue: HumanizeResult
) => {
  if (isRelative) {
    return (
      (humanizeBinaryBytes(
        data.usedValue.value,
        data.usedValue.unit,
        largestValue.unit
      ).value /
        largestValue.value) *
      100
    );
  }
  return getPercentage(data);
};

const CapacityCardRow: React.FC<CapacityCardRowProps> = ({
  data,
  isPercentage,
  isRelative,
  largestValue,
  resourceModel,
}) => {
  const progress = getProgress(data, isRelative, largestValue);
  const value = isPercentage
    ? `${data.usedValue.string} / ${data.totalValue.string}`
    : data.usedValue.string;
  const variant = (() => {
    if (!isPercentage) {
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
  return (
    <>
      <GridItem key={`${data.name}~name`} span={2}>
        {data.managedSystemKind ? (
          <Tooltip content={data.name}>
            <ResourceLink
              link={getDashboardLink(data.managedSystemKind, data.name)}
              resourceModel={resourceModel}
              resourceName={data.name}
              className="odf-capacityCardLink--ellipsis"
              hideIcon
            />
          </Tooltip>
        ) : (
          data.name
        )}
      </GridItem>
      <GridItem key={`${data.name}~progress`} span={7}>
        <Tooltip
          content={!dataUnavailable ? <>{progress.toFixed(2)} %</> : '-'}
        >
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
        </Tooltip>
      </GridItem>
      <GridItem span={3} key={`${data.name}~value`}>
        {dataUnavailable ? '-' : value}
      </GridItem>
    </>
  );
};

const CapacityCardLoading: React.FC = () => (
  <div className="odf-capacityCardLoading-body">
    <div className="odf-capacityCardLoading-body__item">
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin odf-capacityCardLoading-body-item__element--header" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thick odf-capacityCardLoading-body-item__element--header" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin odf-capacityCardLoading-body-item__element--header" />
    </div>
    <div className="odf-capacityCardLoading-body__item">
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thick" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
    </div>
    <div className="odf-capacityCardLoading-body__item">
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thick" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
    </div>
    <div className="odf-capacityCardLoading-body__item">
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thick" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
    </div>
    <div className="odf-capacityCardLoading-body__item">
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thick" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
    </div>
    <div className="odf-capacityCardLoading-body__item">
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thick" />
      <div className="odf-capacityCardLoading-body-item__element odf-capacityCardLoading-body-item__element--thin" />
    </div>
  </div>
);

const CapacityCard: React.FC<CapacityCardProps> = ({
  data,
  relative,
  isPercentage = true,
  loading,
  resourceModel,
}) => {
  let secureRelative = relative;
  if (relative === undefined) {
    secureRelative = data[0]?.totalValue === undefined;
  }
  const sortedMetrics = sortMetrics(data, 'ASC', secureRelative);
  const error = _.isEmpty(sortedMetrics);
  return (
    <div
      className={classNames('o-capacityCard', {
        'o-capacityCard--centered': error,
      })}
    >
      {!error && !loading && (
        <Grid hasGutter>
          <CapacityCardHeader showPercentage={isPercentage} />
          {sortedMetrics.map((item) => (
            <CapacityCardRow
              key={item.name}
              data={item}
              isPercentage={isPercentage}
              isRelative={relative}
              largestValue={sortedMetrics[0].usedValue}
              resourceModel={resourceModel}
            />
          ))}
        </Grid>
      )}
      {error && !loading && <DataUnavailableError />}
      {loading && <CapacityCardLoading />}
    </div>
  );
};

export default CapacityCard;

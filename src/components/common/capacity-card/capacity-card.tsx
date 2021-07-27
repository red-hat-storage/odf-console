// eslint-disable-next-line no-use-before-define
import * as React from 'react';
import {
  Grid,
  GridItem,
  Progress,
  ProgressMeasureLocation,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDashboardLink } from '../../utils';
import { humanizeBinaryBytes } from '../../../humanize';
import './capacity-card.scss';
import { DataUnavailableError } from '../generic/Error';

// Temporary soon to be part of the SDK
type HumanizeResult = {
  value: number;
  unit: string;
  string: string;
};

type CapacityMetricDatum = {
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
};

const getPercentage = (item: CapacityMetricDatum) => (humanizeBinaryBytes(
  item.usedValue.value,
  item.usedValue.unit,
  item.totalValue.unit,
).value
    / item.totalValue.value)
  * 100;

const sortMetrics = (
  metrics: CapacityMetricDatum[],
  direction: 'ASC' | 'DESC' = 'ASC',
  relative = false,
): CapacityMetricDatum[] => {
  metrics.sort((a, b) => {
    let comparatorA = a.usedValue.value;
    const comparatorB = humanizeBinaryBytes(
      b.usedValue.value,
      b.usedValue.unit,
      a.usedValue.unit,
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
}) => (
  <>
    <GridItem span={3}>
      <Title headingLevel="h3" size="md">
        Name
      </Title>
    </GridItem>
    <GridItem span={7}>
      <Title headingLevel="h3" size="md">
        Used Capacity
        {' '}
        {showPercentage && <> %</>}
      </Title>
    </GridItem>
    <GridItem span={2} />
  </>
);

type CapacityCardRowProps = {
  data: CapacityMetricDatum;
  isRelative?: boolean;
  isPercentage?: boolean;
  largestValue?: HumanizeResult;
};

const getProgress = (
  data: CapacityMetricDatum,
  isRelative: boolean,
  largestValue: HumanizeResult,
) => {
  if (isRelative) {
    return (
      (humanizeBinaryBytes(
        data.usedValue.value,
        data.usedValue.unit,
        largestValue.unit,
      ).value
        / largestValue.value)
      * 100
    );
  }
  return getPercentage(data);
};

const CapacityCardRow: React.FC<CapacityCardRowProps> = ({
  data,
  isPercentage,
  isRelative,
  largestValue,
}) => (
  <>
    <GridItem key={`${data.name}~name`} span={3}>
      {data.managedSystemKind ? (
        <Link
          to={getDashboardLink(data.managedSystemKind, data.managedSystemName)}
        >
          {data.name}
        </Link>
      ) : (
        data.name
      )}
    </GridItem>
    <GridItem key={`${data.name}~progress`} span={7}>
      <Progress
        value={getProgress(data, isRelative, largestValue)}
        measureLocation={ProgressMeasureLocation.none}
      />
    </GridItem>
    <GridItem span={2} key={`${data.name}~value`}>
      {isPercentage
        ? `${getProgress(data, isRelative, largestValue).toFixed(2)} %`
        : data.usedValue.string}
    </GridItem>
  </>
);

const CapacityCard: React.FC<CapacityCardProps> = ({
  data,
  relative,
  isPercentage = true,
}) => {
  let secureRelative = relative;
  if (relative === undefined) {
    secureRelative = data[0]?.totalValue === undefined;
  }
  const sortedMetrics = sortMetrics(data, 'ASC', secureRelative);
  return (
    <div className="o-capacityCard">
      {sortedMetrics.length > 0 ? (
        <Grid hasGutter>
          <CapacityCardHeader showPercentage={isPercentage} />
          {sortedMetrics.map((item) => (
            <CapacityCardRow
              key={item.name}
              data={item}
              isPercentage={isPercentage}
              isRelative={relative}
              largestValue={sortedMetrics[0].usedValue}
            />
          ))}
        </Grid>
      ) : (
        <DataUnavailableError />
      )}
    </div>
  );
};

export default CapacityCard;

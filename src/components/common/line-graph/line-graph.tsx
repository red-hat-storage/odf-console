import {
  Chart,
  ChartVoronoiContainer,
  ChartAxis,
  ChartGroup,
  ChartLine,
} from "@patternfly/react-charts";
import { Flex, FlexItem, Grid, GridItem, Title } from "@patternfly/react-core";
import * as _ from "lodash";
import * as React from "react";
import { useRefWidth } from "../../../hooks/ref-width";

export type HumanizeResult = {
  value: number;
  unit: string;
  string: string;
};

type LineDataType = {
  y: HumanizeResult;
  timestamp: Date;
};

export type LineGraphProps = {
  data: LineDataType[];
  loading?: boolean;
  error?: string;
};

const getTickPoints = (data: LineDataType[]) => {
  const iteratee = (item: LineDataType) => item.y.value;
  const max = _.maxBy(data, iteratee);
  const min = _.minBy(data, iteratee);
  const mid = (max.y.value + min.y.value) / 2;
  return [min.y.value, mid, max.y.value];
};

const LineGraph: React.FC<LineGraphProps> = ({ data }) => {
  const [ref, width] = useRefWidth();
  const lineData = data.map((datum, i) => ({
    x: String(i + 1),
    ...datum,
  }));
  const mappedLineData = lineData.map((datum) => ({
    ...datum,
    y: datum.y.value,
  }));
  const tickPoints = getTickPoints(lineData);
  const latestValue = lineData[lineData.length - 1].y.string;
  return (
    <Grid>
      <GridItem span={10} ref={ref}>
        <Chart
          containerComponent={
            <ChartVoronoiContainer
              labels={({ datum }) => `${datum.y.string}: ${datum.timestamp}`}
              constrainToVisibleArea
            />
          }
          height={150}
          minDomain={{ y: tickPoints[0] }}
          maxDomain={{ y: tickPoints[tickPoints.length - 1] + 10 }}
          padding={{
            bottom: 20,
            left: 50,
            right: 20, // Adjusted to accommodate legend
            top: 20,
          }}
          width={width}
        >
          <ChartAxis dependentAxis showGrid tickValues={tickPoints} />
          <ChartGroup>
            <ChartLine data={mappedLineData} />
          </ChartGroup>
        </Chart>
      </GridItem>
      <GridItem span={2}>
        <Flex
          direction={{ default: "column" }}
          justifyContent={{ default: "justifyContentCenter" }}
        >
          <FlexItem>
            <Title headingLevel="h4" size="md">
              {latestValue}
            </Title>
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h5" size="md">
              Current
            </Title>
          </FlexItem>
        </Flex>
      </GridItem>
    </Grid>
  );
};

export default LineGraph;

// Mostly just a copy-paste from patternfly.
import * as React from 'react';
import { ChartLegendTooltipStyles } from '@patternfly/react-charts/dist/js/victory/components/ChartTheme/ChartStyles';
import {
  getLegendTooltipSize,
  getLegendTooltipDataProps,
  getLegendTooltipVisibleData,
  getLegendTooltipVisibleText,
} from '@patternfly/react-charts/dist/js/victory/components/ChartUtils/chart-tooltip';
import {
  ChartLegend,
  ChartLabel,
  getTheme,
  ChartCursorTooltip,
  ChartTooltip,
  ChartLegendTooltipContentProps,
  ChartLegendTooltipProps,
  ChartLegendTooltipLabelProps,
} from '@patternfly/react-charts/victory';
import { defaults } from 'lodash-es';
//@ts-ignore
import { Helpers } from 'victory-core';
import { DataPoint } from '../utils';

export const ChartLegendTooltipContent: React.FunctionComponent<
  ChartLegendTooltipContentProps & {
    stack?: boolean;
    mainDataName?: string;
  }
> = (props) => {
  const {
    activePoints,
    center,
    dx = 0,
    dy = 0,
    flyoutHeight,
    flyoutWidth,
    height,
    labelComponent = <ChartLegendTooltipLabel />,
    legendComponent = <ChartLegend />,
    legendData,
    text,
    themeColor,
    title,
    titleComponent = <ChartLabel />,
    width,
    stack,
    mainDataName,
    // destructure last
    theme = getTheme(themeColor),
    ...rest
  } = props;

  const pointerLength = theme?.tooltip
    ? Helpers.evaluateProp(theme.tooltip.pointerLength, props)
    : 10;
  const legendProps = getLegendTooltipDataProps(legendComponent.props);
  const visibleLegendData = getLegendTooltipVisibleData({
    activePoints,
    colorScale: legendProps.colorScale,
    legendData,
    text,
    theme,
  });

  const hasMainData = mainDataName
    ? activePoints[0].childName === mainDataName
    : false;

  if (stack) {
    visibleLegendData.reverse();
  } else if (hasMainData) {
    visibleLegendData.shift();
  }

  // Component offsets
  const legendOffsetX = 0;
  const legendOffsetY = title ? 9 : -10;
  const titleOffsetX = 10;
  const titleOffsetY = 0;

  // Returns x position of flyout
  const getX = () => {
    if (!(center || flyoutWidth || width)) {
      const x = (rest as any).x;
      return x ? x : undefined;
    }
    const finalFlyoutWidth = Helpers.evaluateProp(flyoutWidth, props);
    if (width > center.x + finalFlyoutWidth + pointerLength) {
      return center.x + ChartLegendTooltipStyles.flyout.padding / 2;
    } else if (center.x < finalFlyoutWidth + pointerLength) {
      return ChartLegendTooltipStyles.flyout.padding / 2 - pointerLength;
    }
    return center.x - finalFlyoutWidth;
  };

  // Returns y position
  const getY = () => {
    if (!(center || flyoutHeight || height)) {
      const y = (rest as any).y;
      return y ? y : undefined;
    }
    const finalFlyoutHeight = Helpers.evaluateProp(flyoutHeight, props);
    if (center.y < finalFlyoutHeight / 2) {
      return ChartLegendTooltipStyles.flyout.padding / 2;
    } else if (center.y > height - finalFlyoutHeight / 2) {
      return (
        height - finalFlyoutHeight + ChartLegendTooltipStyles.flyout.padding / 2
      );
    }
    return (
      center.y -
      finalFlyoutHeight / 2 +
      ChartLegendTooltipStyles.flyout.padding / 2
    );
  };

  // Min & max dimensions do not include flyout padding
  const maxLegendDimensions = getLegendTooltipSize({
    legendData: visibleLegendData,
    legendProps,
    text: getLegendTooltipVisibleText({ activePoints, legendData, text }),
    theme,
  });
  const minLegendDimensions = getLegendTooltipSize({
    legendData: [{ name: '' }],
    legendProps,
    theme,
  });

  // Returns the label component
  const getLabelComponent = () =>
    React.cloneElement(labelComponent, {
      dx: maxLegendDimensions.width - minLegendDimensions.width,
      legendData: visibleLegendData,
      ...labelComponent.props,
    });

  // Returns the title component
  const getTitleComponent = () => {
    const titleText = title instanceof Function ? title(activePoints) : title;

    return React.cloneElement(titleComponent, {
      style: {
        fill: ChartLegendTooltipStyles.label.fill,
      },
      text: titleText,
      textAnchor: 'start',
      x: getX() + titleOffsetX + Helpers.evaluateProp(dx, props),
      y: getY() + titleOffsetY + Helpers.evaluateProp(dy, props),
      ...titleComponent.props,
    });
  };

  const tooltipLegendData = getLegendTooltipVisibleData({
    activePoints,
    colorScale: legendProps.colorScale,
    legendData,
    text,
    textAsLegendData: true,
    theme,
  });

  if (stack) {
    tooltipLegendData.reverse();
  } else if (hasMainData) {
    tooltipLegendData.shift();
  }

  // Returns the legend component
  const getLegendComponent = () =>
    React.cloneElement(legendComponent, {
      data: tooltipLegendData,
      labelComponent: getLabelComponent(),
      standalone: false,
      theme,
      x: getX() + legendOffsetX + Helpers.evaluateProp(dx, props),
      y: getY() + legendOffsetY + Helpers.evaluateProp(dy, props),
      ...legendProps,
    });

  return (
    <>
      {getTitleComponent()}
      {getLegendComponent()}
    </>
  );
};
ChartLegendTooltipContent.displayName = 'ChartLegendTooltipContent';

export const ChartLegendTooltipLabel: React.FunctionComponent<
  ChartLegendTooltipLabelProps
> = ({
  index = 0,
  legendData,
  style,
  text,
  textAnchor = 'start',
  x,
  y,

  // destructure last
  ...rest
}: ChartLegendTooltipLabelProps) => {
  const getStyle = (styles: any) => {
    const applyDefaultStyle = (customStyle: React.CSSProperties) =>
      defaults(
        {
          ...customStyle,
        },
        {
          fill: ChartLegendTooltipStyles.label.fill,
        }
      );
    return Array.isArray(styles)
      ? styles.map(applyDefaultStyle)
      : applyDefaultStyle(styles);
  };

  const label =
    legendData && legendData.length ? legendData[index as any].name : undefined;
  return (
    <ChartLabel
      style={getStyle(style)}
      text={`${text} ${label}`}
      textAnchor={textAnchor}
      x={x}
      y={y}
      {...rest}
      dx={undefined}
    />
  );
};
ChartLegendTooltipLabel.displayName = 'ChartLegendTooltipLabel';

export const ChartLegendTooltip: React.FunctionComponent<
  Omit<ChartLegendTooltipProps, 'title'> & {
    stack?: boolean;
    formatDate: (data: DataPoint<Date>[]) => string;
    getLabel?: (prop: { datum: DataPoint<Date> }) => string;
    mainDataName: string;
  }
> = (props) => {
  const {
    activePoints,
    datum,
    center = { x: 0, y: 0 },
    flyoutHeight,
    flyoutWidth,
    height,
    isCursorTooltip = true,
    mainDataName,
    labelComponent = <ChartLegendTooltipContent mainDataName={mainDataName} />,
    legendData,
    text,
    themeColor,
    width,
    stack,
    formatDate,
    getLabel,
    // destructure last
    theme = getTheme(themeColor),
    ...rest
  } = props;

  const title = (d) => {
    if (stack) {
      return formatDate(d);
    }
    const mainDatum = mainDataName
      ? d.find((uDatum) => uDatum.childName === mainDataName)
      : d[0];
    return mainDatum
      ? getLabel({ datum: mainDatum })
      : `No ${mainDataName || 'data'} available`;
  };
  const pointerLength = theme?.tooltip
    ? Helpers.evaluateProp(theme.tooltip.pointerLength, props)
    : 10;
  const legendTooltipProps = {
    legendData: getLegendTooltipVisibleData({
      activePoints,
      legendData,
      text,
      theme,
    }),
    legendProps: getLegendTooltipDataProps(
      labelComponent.props.legendComponent
    ),
    text: getLegendTooltipVisibleText({
      activePoints,
      legendData,
      text,
    }) as any[],
    theme,
  };

  // Returns flyout height based on legend size
  const getFlyoutHeight = () => {
    const sizeProps = stack
      ? legendTooltipProps
      : {
          ...legendTooltipProps,
          // For non-stack graphs, remove the text for "mainDataName"
          text: legendTooltipProps.text?.filter(
            (_t, i) => legendTooltipProps.legendData[i].name !== mainDataName
          ),
        };
    const legendFlyoutHeight =
      getLegendTooltipSize(sizeProps).height +
      ChartLegendTooltipStyles.flyout.padding;
    return title ? legendFlyoutHeight + 4 : legendFlyoutHeight - 10;
  };

  // Returns flyout width based on legend size
  const getFlyoutWidth = () =>
    getLegendTooltipSize(legendTooltipProps).width +
    ChartLegendTooltipStyles.flyout.padding +
    (stack ? 20 : 0);

  // Returns the tooltip content component
  const getTooltipContentComponent = () =>
    React.cloneElement(labelComponent, {
      center,
      flyoutHeight: flyoutHeight || getFlyoutHeight(),
      flyoutWidth: flyoutWidth || getFlyoutWidth(),
      height,
      legendData,
      title,
      width,
      stack,
      ...labelComponent.props,
    });

  // Returns the tooltip component
  const getTooltipComponent = () => {
    const legendFlyoutWidth = getFlyoutWidth();
    const tooltipComponent = isCursorTooltip ? (
      <ChartCursorTooltip />
    ) : (
      <ChartTooltip constrainToVisibleArea />
    );
    return React.cloneElement(tooltipComponent, {
      activePoints,
      center,
      datum,
      flyoutHeight: flyoutHeight || getFlyoutHeight(),
      flyoutWidth: flyoutWidth || getFlyoutWidth(),
      height,
      labelComponent: getTooltipContentComponent(),
      ...(flyoutWidth === undefined && {
        showPointer:
          width > legendFlyoutWidth + center.x + pointerLength ||
          center.x > legendFlyoutWidth + pointerLength,
      }),
      text,
      theme,
      width,
      ...rest,
    });
  };

  return getTooltipComponent();
};
ChartLegendTooltip.displayName = 'ChartLegendTooltip';

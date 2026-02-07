import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { ChartDonut, ChartLabel } from '@patternfly/react-charts/victory';
import classNames from 'classnames';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { t_global_color_status_danger_default as globalDanger100 } from '@patternfly/react-tokens';
import { t_global_color_disabled_100 as globalDisable100 } from '@patternfly/react-tokens';
import { t_global_color_status_info_100 as globalInfo100 } from '@patternfly/react-tokens';
import { t_global_color_status_warning_default as globalWarning100 } from '@patternfly/react-tokens';
import { DANGER_THRESHOLD, WARNING_THRESHOLD } from '../../../constants';
import './capacity-card.scss';

const generalColorScale = [globalInfo100.value, globalDisable100.value];
const warningColorScale = [globalWarning100.value, globalDisable100.value];
const dangerColorScale = [globalDanger100.value, globalDisable100.value];

const CapacityStatusIcon: React.FC<CapacityStatusIconProps> = React.memo(
  ({ ratio, warningThreshold, dangerThreshold }) => {
    const { t } = useCustomTranslation();

    const warnThreshold = warningThreshold ?? WARNING_THRESHOLD;
    const dangerThresh = dangerThreshold ?? DANGER_THRESHOLD;

    if (ratio < warnThreshold) return null;
    return (
      <>
        {ratio >= dangerThresh && (
          <RedExclamationCircleIcon title={t('Error')} />
        )}
        {ratio >= warnThreshold && ratio < dangerThresh && (
          <YellowExclamationTriangleIcon title={t('Warning')} />
        )}
      </>
    );
  }
);

CapacityStatusIcon.displayName = 'CapacityStatusIcon';

// Generic capacity card
export const CapacityCard: React.FC<CapacityCardProps> = React.memo((props) => {
  const {
    totalCapacityMetric,
    availableCapacityMetric,
    usedCapacityMetric,
    description,
    loadError,
    loading,
    warningThreshold,
    dangerThreshold,
  } = props;
  const { t } = useCustomTranslation();

  const totalCapacity = humanizeBinaryBytes(totalCapacityMetric);
  const availableCapacity = humanizeBinaryBytes(
    availableCapacityMetric,
    null,
    totalCapacity?.unit
  );
  const usedCapacity = humanizeBinaryBytes(
    usedCapacityMetric,
    null,
    totalCapacity?.unit
  );

  // Adjusted units
  const usedCapacityAdjusted = humanizeBinaryBytes(usedCapacityMetric);
  const availableCapacityAdjusted = humanizeBinaryBytes(
    totalCapacityMetric - usedCapacityMetric
  );
  const capacityRatio = parseFloat(
    (usedCapacity.value / totalCapacity.value).toFixed(2)
  );

  const colorScale = React.useMemo(() => {
    const warnThreshold = warningThreshold ?? WARNING_THRESHOLD;
    const dangerThresh = dangerThreshold ?? DANGER_THRESHOLD;

    if (capacityRatio >= dangerThresh) return dangerColorScale;
    if (capacityRatio >= warnThreshold && capacityRatio < dangerThresh)
      return warningColorScale;
    return generalColorScale;
  }, [capacityRatio, warningThreshold, dangerThreshold]);

  const donutData = [
    { x: 'Used', y: usedCapacity.value, string: usedCapacityAdjusted.string },
    {
      x: 'Available',
      y: availableCapacity.value,
      string: availableCapacityAdjusted.string,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('Raw capacity')}
          <FieldLevelHelp>{description}</FieldLevelHelp>
        </CardTitle>
      </CardHeader>
      <CardBody className="ceph-raw-usage__container">
        {!loading && !loadError && (
          <>
            <div className="ceph-raw-usage__item ceph-raw-usage__legend">
              <ChartLegend
                fill={colorScale[0]}
                title={t('Used')}
                text={usedCapacityAdjusted.string}
                titleClassName="ceph-raw-card-legend__title--pad"
              />
              <ChartLegend
                fill={colorScale[1]}
                title={t('Available')}
                text={availableCapacityAdjusted.string}
                capacityStatus={
                  <CapacityStatusIcon
                    ratio={capacityRatio}
                    warningThreshold={warningThreshold}
                    dangerThreshold={dangerThreshold}
                  />
                }
              />
            </div>
            <div className="ceph-raw-usage__item ceph-raw-usage__chart">
              <ChartDonut
                ariaDesc={t('Available versus Used Capacity')}
                ariaTitle={t('Available versus Used Capacity')}
                height={150}
                width={150}
                data={donutData}
                labels={({ datum }) => `${datum.string}`}
                title={usedCapacityAdjusted.string}
                subTitle={t('Used of {{capacity}}', {
                  capacity: totalCapacity.string,
                })}
                colorScale={colorScale}
                padding={{ top: 0, bottom: 0, left: 0, right: 0 }}
                constrainToVisibleArea
                titleComponent={
                  <ChartLabel
                    style={{
                      fill: `var(--pf-t--global--text--color--regular)`,
                    }}
                  />
                }
                subTitleComponent={
                  <ChartLabel
                    dy={5}
                    style={{ fill: `var(--pf-t--global--text--color--subtle)` }}
                  />
                }
              />
            </div>
          </>
        )}
        {loading && !loadError && <LoadingCardBody />}
        {loadError && <ErrorCardBody />}
      </CardBody>
    </Card>
  );
});

const LoadingCardBody: React.FC = () => (
  <div>
    <div className="ceph-raw-usage-loading__legend">
      <div className="ceph-raw-usage-loading-legend__item skeleton-activity" />
      <div className="ceph-raw-usage-loading-legend__item skeleton-activity" />
    </div>
    <div className="ceph-raw-usage-loading__chart skeleton-activity" />
  </div>
);

const ErrorCardBody: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <div className="ceph-raw-usage--error text-muted">{t('Not Available')}</div>
  );
};

const ChartLegend: React.FC<ChartLegendProps> = ({
  fill,
  title,
  text,
  titleClassName,
  capacityStatus,
}) => {
  return (
    <div className="ceph-raw-card-legend__container">
      <div className="ceph-raw-card-legend__index-block">
        <div
          className="ceph-raw-card-legend__color-square"
          style={{ backgroundColor: fill }}
        />
        <div
          className={classNames('ceph-raw-card-legend__title', titleClassName)}
        >
          {title}
        </div>
      </div>
      <div className="ceph-raw-card-legend__value-block">
        <div className="ceph-raw-card-legend__text">{text}</div>
      </div>
      {capacityStatus && (
        <div className="ceph-raw-card-legend__icon-block">{capacityStatus}</div>
      )}
    </div>
  );
};

export type CapacityCardProps = {
  totalCapacityMetric: number;
  usedCapacityMetric: number;
  availableCapacityMetric: number;
  description: string;
  loading: boolean;
  loadError: boolean;
  warningThreshold?: number;
  dangerThreshold?: number;
};

type ChartLegendProps = {
  fill: string;
  text: string;
  title: string;
  titleClassName?: string;
  capacityStatus?: JSX.Element;
};

type CapacityStatusIconProps = {
  ratio: number;
  warningThreshold?: number;
  dangerThreshold?: number;
};

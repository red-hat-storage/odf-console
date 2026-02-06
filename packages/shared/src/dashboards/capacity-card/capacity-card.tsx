import * as React from 'react';
import PlainResourceName from '@odf/shared/resource-link/plain-resource-link';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import {
  Grid,
  GridItem,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  Title,
  Tooltip,
  Button,
  Popover,
} from '@patternfly/react-core';
import { DataUnavailableError } from '../../generic/Error';
import ResourceLink from '../../resource-link/resource-link';
import { HumanizeResult } from '../../types';
import { useCustomTranslation } from '../../useCustomTranslationHook';
import { getDashboardLink } from '../../utils';
import { humanizeBinaryBytes } from '../../utils/humanize';
import './capacity-card.scss';

export type CapacityMetricDatum = {
  name: string;
  namespace?: string;
  managedSystemName?: string;
  managedSystemKind?: string;
  totalValue?: HumanizeResult;
  usedValue: HumanizeResult;
};

type CapacityCardProps = {
  data: CapacityMetricDatum[];
  relative?: boolean;
  loading?: boolean;
  resourceModel?: K8sKind;
  showPercentage?: boolean;
  isExternalObjectCapacityCard?: boolean;
};

const getPercentage = (item: CapacityMetricDatum) =>
  (humanizeBinaryBytes(
    item?.usedValue?.value,
    item?.usedValue?.unit,
    item?.totalValue?.unit
  )?.value /
    item?.totalValue?.value) *
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
  isExternalObjectCapacityCard: boolean;
};

const CapacityCardHeader: React.FC<CapacityCardHeaderProps> = ({
  showPercentage,
  isExternalObjectCapacityCard,
}) => {
  const { t } = useCustomTranslation();
  return !isExternalObjectCapacityCard ? (
    <>
      <GridItem span={2}>
        <Title headingLevel="h3" size="md">
          {t('Name')}
        </Title>
      </GridItem>
      <GridItem span={7}>
        <Title headingLevel="h3" size="md">
          {t('Used capacity')} {showPercentage && <>%</>}
        </Title>
      </GridItem>
      <GridItem span={3}>
        <Title headingLevel="h3" size="md">
          {t('Used / Total')}
        </Title>
      </GridItem>
    </>
  ) : (
    <Grid>
      <GridItem span={5}>
        <Title headingLevel="h3" size="md">
          {t('Name')}
        </Title>
      </GridItem>
      <GridItem span={5}>
        <Title headingLevel="h3" size="md">
          {t('Used capacity')}
        </Title>
      </GridItem>
    </Grid>
  );
};

type CapacityCardRowProps = {
  data: CapacityMetricDatum;
  isRelative?: boolean;
  isPercentage?: boolean;
  largestValue?: HumanizeResult;
  resourceModel?: K8sKind;
  isExternalObjectCapacityCard?: boolean;
};

const getProgress = (
  data: CapacityMetricDatum,
  isRelative: boolean,
  largestValue: HumanizeResult
) => {
  if (isRelative) {
    return (
      (humanizeBinaryBytes(
        data?.usedValue?.value,
        data?.usedValue?.unit,
        largestValue?.unit
      )?.value /
        largestValue?.value) *
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
  isExternalObjectCapacityCard,
}) => {
  const { t } = useCustomTranslation();
  const progress =
    (!isPercentage && isRelative) || (isPercentage && !isRelative)
      ? getProgress(data, isRelative, largestValue)
      : data?.usedValue?.value > 0
        ? 100
        : 0;
  const value = isPercentage
    ? `${data?.usedValue?.string} / ${data?.totalValue?.string}`
    : data?.usedValue?.string;
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
  return !isExternalObjectCapacityCard ? (
    <>
      <GridItem key={`${data?.name}~name`} span={2}>
        {data?.managedSystemKind ? (
          <Tooltip content={data?.name}>
            <ResourceLink
              link={getDashboardLink(
                data?.managedSystemKind,
                data?.name,
                data?.namespace
              )}
              resourceModel={resourceModel}
              resourceName={data?.name}
              className="odf-capacityCardLink--ellipsis"
              hideIcon
            />
          </Tooltip>
        ) : (
          <PlainResourceName resourceName={data?.name} />
        )}
      </GridItem>
      <GridItem key={`${data?.name}~progress`} span={7}>
        {isRelative || !isPercentage ? (
          <Progress
            value={dataUnavailable ? 0 : progress}
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
        )}
      </GridItem>
      <GridItem span={3} key={`${data?.name}~value`}>
        {dataUnavailable ? '-' : value}
        {value && !dataUnavailable && !isPercentage && (
          <span>
            &nbsp; / &nbsp;
            <Popover
              position="right"
              bodyContent={t(
                'For standalone MCG clusters, there is no set limit.'
              )}
            >
              <Button
                icon={t('No Limit')}
                variant="plain"
                className="details-item__popover-button"
              />
            </Popover>
          </span>
        )}
      </GridItem>
    </>
  ) : (
    <Grid>
      <GridItem key={`${data?.name}~name`} span={5}>
        <PlainResourceName resourceName={data?.name} />
      </GridItem>
      <GridItem span={5} key={`${data?.name}~value`}>
        {dataUnavailable ? '-' : value}
      </GridItem>
    </Grid>
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
  relative = false,
  loading,
  resourceModel,
  showPercentage,
  isExternalObjectCapacityCard,
}) => {
  const safeData = data.every(
    (item) => item.totalValue !== undefined && item.usedValue !== undefined
  );
  const sortedMetrics = safeData ? sortMetrics(data, 'ASC', relative) : data;
  const error = _.isEmpty(sortedMetrics);
  return (
    <div
      className={classNames('o-capacityCard', {
        'o-capacityCard--centered': error,
      })}
    >
      {!error && !loading && (
        <Grid hasGutter>
          <CapacityCardHeader
            showPercentage={showPercentage}
            isExternalObjectCapacityCard={isExternalObjectCapacityCard}
          />
          {sortedMetrics?.map((item) => {
            const isPercentage = !!item?.totalValue;
            return (
              <CapacityCardRow
                key={`${item.name}${item.namespace}`}
                data={item}
                isPercentage={isPercentage}
                isRelative={relative}
                largestValue={sortedMetrics?.[0]?.usedValue}
                resourceModel={resourceModel}
                isExternalObjectCapacityCard={isExternalObjectCapacityCard}
              />
            );
          })}
        </Grid>
      )}
      {error && !loading && <DataUnavailableError />}
      {loading && <CapacityCardLoading />}
    </div>
  );
};

export default CapacityCard;

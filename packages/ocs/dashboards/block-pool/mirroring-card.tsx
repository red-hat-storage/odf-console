import * as React from 'react';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import { Trans, useTranslation } from 'react-i18next';
import { ChartPie, ChartThemeColor } from '@patternfly/react-charts';
import {
  ExpandableSection,
  Popover,
  PopoverPosition,
  Button,
  List,
  ListItem,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { StoragePoolKind } from '../../types';
import { twelveHoursdateTimeNoYear } from '../../utils';
import { calcPercentage } from '../../utils/common';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';
import { MirroringCardBody } from './mirroring-card-body';
import { MirroringCardItem } from './mirroring-card-item';
import { healthStateMapping, ImageStateLegendMap } from './states';
import './mirroring-card.scss';

const MirroringImageStatePopover: React.FC<MirroringImageStatePopoverProps> = ({
  t,
}) => {
  return (
    <Popover
      maxWidth="32rem"
      position={PopoverPosition.left}
      aria-label={t('Image states info')}
      bodyContent={
        <List isPlain>
          <ListItem>
            <strong> {t('What does each state mean?')}</strong>
          </ListItem>
          <ListItem>
            <Trans t={t} ns="plugin__odf-console">
              <strong>Starting replay:</strong> Initiating image (PV)
              replication process.
            </Trans>
          </ListItem>
          <ListItem>
            <Trans t={t} ns="plugin__odf-console">
              <strong>Replaying:</strong> Image (PV) replication is ongoing or
              idle between clusters.
            </Trans>
          </ListItem>
          <ListItem>
            <Trans t={t} ns="plugin__odf-console">
              <strong>Stopping replay:</strong> Image (PV) replication process
              is shutting down.
            </Trans>
          </ListItem>
          <ListItem>
            <Trans t={t} ns="plugin__odf-console">
              <strong>Stopped:</strong> Image (PV) replication process has shut
              down.
            </Trans>
          </ListItem>
          <ListItem>
            <Trans t={t} ns="plugin__odf-console">
              <strong>Error:</strong> Image (PV) replication process stopped due
              to an error.
            </Trans>
          </ListItem>
          <ListItem>
            <Trans t={t} ns="plugin__odf-console">
              <strong>Unknown:</strong> Unable to determine image (PV) state due
              to an error. Check your network connection and remote cluster
              mirroring daemon.
            </Trans>
          </ListItem>
        </List>
      }
    >
      <Button
        aria-label={t('image states info')}
        variant="link"
        isInline
        className="odf-block-pool-mirroring-help"
      >
        <OutlinedQuestionCircleIcon className="odf-block-pool-mirroring-help__icon" />
        What does each state mean?
      </Button>
    </Popover>
  );
};

const MirroringImageHealthChart: React.FC<MirroringImageHealthChartProps> = ({
  t,
  poolObj,
}) => {
  const states: any = poolObj.status?.mirroringStatus?.summary?.states ?? {};
  const totalImageCount = Object.keys(states).reduce(
    (sum, state) => sum + states[state],
    0
  );

  if (totalImageCount > 0) {
    const { data, legendData } = Object.keys(states).reduce(
      (acc, state) => {
        const percentage = calcPercentage(states[state], totalImageCount);
        acc.data.push({
          x: ImageStateLegendMap(t)[state],
          y: percentage.value,
        });
        acc.legendData.push({
          name: `${ImageStateLegendMap(t)[state]}: ${
            calcPercentage(states[state], totalImageCount).string
          }`,
        });
        return acc;
      },
      { data: [], legendData: [] }
    );

    return (
      <div style={{ maxHeight: '210px', maxWidth: '300px' }}>
        <ChartPie
          ariaTitle={t('Image States')}
          constrainToVisibleArea
          data={data}
          labels={({ datum }) => `${datum.x}: ${datum.y}`}
          legendData={legendData}
          legendOrientation="vertical"
          legendPosition="right"
          height={210}
          width={300}
          padding={{
            right: 160,
          }}
          themeColor={ChartThemeColor.multi}
        />
      </div>
    );
  }
  return <></>;
};

export const MirroringCard: React.FC = () => {
  const { t } = useTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);

  const mirroringStatus: boolean = obj.spec?.mirroring?.enabled;
  const mirroringImageHealth: string =
    obj.status?.mirroringStatus?.summary?.image_health;
  const lastChecked: string = obj.status?.mirroringStatus?.lastChecked;
  const formatedDateTime = lastChecked
    ? twelveHoursdateTimeNoYear.format(new Date(lastChecked))
    : '-';

  return (
    <Card data-test-id="mirroring-card">
      <CardHeader>
        <CardTitle>{t('Mirroring')}</CardTitle>
      </CardHeader>
      <CardBody>
        <MirroringCardBody>
          <MirroringCardItem isLoading={!obj} title={t('Mirroring status')}>
            {mirroringStatus ? t('Enabled') : t('Disabled')}
          </MirroringCardItem>
          {mirroringStatus && (
            <>
              <MirroringCardItem
                isLoading={!obj}
                title={t('Overall image health')}
              >
                <StatusIconAndText
                  title={mirroringImageHealth}
                  icon={healthStateMapping[mirroringImageHealth]?.icon}
                />
              </MirroringCardItem>
              {!_.isEmpty(obj.status?.mirroringStatus?.summary?.states) && (
                <>
                  <MirroringCardItem>
                    <ExpandableSection toggleText={t('Show image states')}>
                      <MirroringImageHealthChart t={t} poolObj={obj} />
                    </ExpandableSection>
                  </MirroringCardItem>
                  <MirroringCardItem>
                    <MirroringImageStatePopover t={t} />
                  </MirroringCardItem>
                </>
              )}

              <MirroringCardItem isLoading={!obj} title={t('Last checked')}>
                {formatedDateTime}
              </MirroringCardItem>
            </>
          )}
        </MirroringCardBody>
      </CardBody>
    </Card>
  );
};

type MirroringImageStatePopoverProps = {
  t: TFunction;
};

type MirroringImageHealthChartProps = {
  t: TFunction;
  poolObj: StoragePoolKind;
};

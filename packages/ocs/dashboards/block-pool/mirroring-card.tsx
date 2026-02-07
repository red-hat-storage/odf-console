import * as React from 'react';
import { BLOCK_POOL_NAME_LABEL } from '@odf/ocs/constants';
import { CephBlockPoolRadosNamespaceModel } from '@odf/shared';
import { healthStateMapping, HealthStateMappingValues } from '@odf/shared';
import { getLatestDate } from '@odf/shared/details-page/datetime';
import { getName, getNamespace } from '@odf/shared/selectors';
import { GrayUnknownIcon } from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  StatusIconAndText,
  useK8sWatchResource,
  HealthState,
} from '@openshift-console/dynamic-plugin-sdk';
import { ChartPie, ChartThemeColor } from '@patternfly/react-charts/victory';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
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
import {
  CephBlockPoolRadosNamespaceKind,
  States,
  StoragePoolKind,
} from '../../types';
import { twelveHoursdateTimeNoYear } from '../../utils';
import { calcPercentage } from '../../utils/common';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';
import { MirroringCardBody } from './mirroring-card-body';
import { MirroringCardItem } from './mirroring-card-item';
import { getColor } from './states';
import { ImageStateLegendMap, healthStateMessage } from './states';
import './mirroring-card.scss';

const defaultState = {
  priority: -1,
  health: HealthState.UNKNOWN,
  icon: <GrayUnknownIcon title="Unknown" />,
};

const aggregateHealth = (
  poolObj: StoragePoolKind,
  radosNamespaces: CephBlockPoolRadosNamespaceKind[]
): HealthStateMappingValues[] => {
  let mirroringHealth: HealthStateMappingValues =
    healthStateMapping[poolObj.status?.mirroringStatus?.summary?.health] ||
    defaultState;
  let imageHealth: HealthStateMappingValues =
    healthStateMapping[
      poolObj.status?.mirroringStatus?.summary?.image_health
    ] || defaultState;
  radosNamespaces.forEach((radosNamespace) => {
    // Mirroring health
    const radosNamespaceMirroringHealth: HealthStateMappingValues =
      healthStateMapping[
        radosNamespace.status?.mirroringStatus?.summary?.health
      ] || defaultState;
    if (!!radosNamespaceMirroringHealth) {
      mirroringHealth =
        mirroringHealth.priority > radosNamespaceMirroringHealth.priority
          ? mirroringHealth
          : radosNamespaceMirroringHealth;
    }

    // Image health
    const radosNamespaceImageHealth: HealthStateMappingValues =
      healthStateMapping[
        radosNamespace.status?.mirroringStatus?.summary?.image_health
      ] || defaultState;
    if (!!radosNamespaceImageHealth) {
      imageHealth =
        imageHealth.priority > radosNamespaceImageHealth.priority
          ? imageHealth
          : radosNamespaceImageHealth;
    }
  });
  return [mirroringHealth, imageHealth];
};

const aggregateMirroringStatusCheckedTime = (
  poolObj: StoragePoolKind,
  radosNamespaces: CephBlockPoolRadosNamespaceKind[]
): string => {
  let lastChecked: string = poolObj.status?.mirroringStatus?.lastChecked;
  radosNamespaces.forEach((radosNamespace) => {
    const radosNamespaceLastChecked: string =
      radosNamespace.status?.mirroringStatus?.lastChecked;
    if (!!radosNamespaceLastChecked) {
      lastChecked = getLatestDate([lastChecked, radosNamespaceLastChecked]);
    }
  });
  return lastChecked;
};

const aggregateMirroringStates = (
  poolObj: StoragePoolKind,
  radosNamespaces: CephBlockPoolRadosNamespaceKind[]
): States => {
  const states: States =
    _.cloneDeep(poolObj.status?.mirroringStatus?.summary?.states) ?? {};
  radosNamespaces.forEach((radosNamespace) => {
    const radosNamespaceStates: States =
      radosNamespace.status?.mirroringStatus?.summary?.states ?? {};
    if (!!radosNamespaceStates) {
      Object.entries(radosNamespaceStates).forEach(([state, count]) => {
        const oldCount = states?.[state] || 0;
        states[state] = oldCount + count;
      });
    }
  });
  return states;
};

const getPieChartHeight = (numOfStates: number) => {
  if (numOfStates <= 3) {
    return 150;
  } else if (numOfStates <= 5) {
    return 200;
  }
  return 240;
};

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
        icon={
          <OutlinedQuestionCircleIcon className="odf-block-pool-mirroring-help__icon" />
        }
        aria-label={t('image states info')}
        variant="link"
        isInline
        className="odf-block-pool-mirroring-help"
      >
        What does each state mean?
      </Button>
    </Popover>
  );
};

const MirroringImageHealthChart: React.FC<MirroringImageHealthChartProps> = ({
  t,
  states,
}) => {
  const totalImageCount = Object.keys(states).reduce(
    (sum, state) => sum + states[state],
    0
  );

  if (totalImageCount > 0) {
    const { data, legendData, colorScale } = Object.keys(states).reduce(
      (acc, state) => {
        const percentage = calcPercentage(states[state], totalImageCount);
        const status = ImageStateLegendMap(t)[state];
        acc.data.push({
          x: status,
          y: percentage.value,
        });
        acc.legendData.push({
          name: `${status}: ${percentage.string}`,
          symbol: { fill: getColor(state) },
        });
        acc.colorScale.push(getColor(state));
        return acc;
      },
      { data: [], legendData: [], colorScale: [] }
    );

    return (
      <div style={{ maxHeight: '240px', maxWidth: '300px' }}>
        <ChartPie
          ariaTitle={t('Image States')}
          colorScale={colorScale}
          constrainToVisibleArea
          data={data}
          labels={({ datum }) => `${datum.x}: ${datum.y}`}
          legendData={legendData}
          legendOrientation="vertical"
          legendPosition="right"
          height={getPieChartHeight(data.length)}
          width={300}
          padding={{
            right: 190,
          }}
          themeColor={ChartThemeColor.multi}
        />
      </div>
    );
  }
  return null;
};

export const MirroringCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  // watch all cephradosnamespace
  const [radosNamespaces, isLoaded, isLoadError] = useK8sWatchResource<
    CephBlockPoolRadosNamespaceKind[]
  >({
    isList: true,
    kind: referenceForModel(CephBlockPoolRadosNamespaceModel),
    namespace: getNamespace(obj),
    selector: {
      matchLabels: {
        [BLOCK_POOL_NAME_LABEL]: getName(obj),
      },
    },
  });

  const mirroringStatus: boolean = obj.spec?.mirroring?.enabled;
  const [mirroringHealth, imageHealth]: HealthStateMappingValues[] =
    aggregateHealth(obj, radosNamespaces);
  const lastChecked: string = aggregateMirroringStatusCheckedTime(
    obj,
    radosNamespaces
  );
  const states: States = aggregateMirroringStates(obj, radosNamespaces);
  const formatedDateTime = !!lastChecked
    ? twelveHoursdateTimeNoYear.format(new Date(lastChecked))
    : '-';

  return (
    <Card data-test-id="mirroring-card">
      <CardHeader>
        <CardTitle>{t('Mirroring')}</CardTitle>
      </CardHeader>
      <CardBody>
        <MirroringCardBody>
          <MirroringCardItem
            isLoading={!isLoaded}
            error={!!isLoadError}
            title={t('Mirroring status')}
          >
            {mirroringStatus ? t('Enabled') : t('Disabled')}
          </MirroringCardItem>
          {mirroringStatus && (
            <>
              <MirroringCardItem
                isLoading={!isLoaded}
                error={!!isLoadError}
                title={t('Mirroring health')}
              >
                <StatusIconAndText
                  title={healthStateMessage(mirroringHealth?.health, t)}
                  icon={mirroringHealth?.icon as React.ReactElement}
                  className="pf-v6-u-ml-xs"
                />
              </MirroringCardItem>
              <MirroringCardItem
                isLoading={!isLoaded}
                error={!!isLoadError}
                title={t('Overall image health')}
              >
                <StatusIconAndText
                  title={healthStateMessage(imageHealth?.health, t)}
                  icon={imageHealth?.icon as React.ReactElement}
                  className="pf-v6-u-ml-xs"
                />
              </MirroringCardItem>
              {!_.isEmpty(states) && (
                <>
                  <MirroringCardItem
                    isLoading={!isLoaded}
                    error={!!isLoadError}
                  >
                    <ExpandableSection toggleText={t('Show image states')}>
                      <MirroringImageHealthChart t={t} states={states} />
                    </ExpandableSection>
                  </MirroringCardItem>
                  <MirroringCardItem
                    isLoading={!isLoaded}
                    error={!!isLoadError}
                  >
                    <MirroringImageStatePopover t={t} />
                  </MirroringCardItem>
                </>
              )}
              <MirroringCardItem
                isLoading={!isLoaded}
                error={!!isLoadError}
                title={t('Last checked')}
              >
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
  states: States;
};

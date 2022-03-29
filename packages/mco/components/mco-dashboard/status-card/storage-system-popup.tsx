import * as React from 'react';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import Status, { StatusPopupSection } from '@odf/shared/popup/status-popup';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { Flex, FlexItem } from '@patternfly/react-core';

export type SystemHealthMap = {
  systemName: string;
  rawHealthData: string;
};

export type CSVStatusMap = {
  rawCSVData: string;
};

type StorageSystemPopopProps = {
  systemHealthMap: SystemHealthMap[];
};

type ODFOperatorPopupProps = {
  csvStatusMap: CSVStatusMap[];
};

type SystemHealthCountProps = {
    value: string;
    health: HealthState;
    count: number;
}

type StatusIconProps = {
  health: HealthState,
  count: number,
}

const getSystemHealthCount = (systemHealthMap: SystemHealthMap[]) => 
  systemHealthMap.reduce((acc, item) => {
    if (item?.rawHealthData === '0') acc.normal++;
    else if (item?.rawHealthData === '1') acc.warning++;
    else if (item?.rawHealthData === '2') acc.critical++;
    return acc;
  }, {critical: 0, warning: 0, normal: 0});

const SystemHealthCount: React.FC<SystemHealthCountProps> = ({
    value,
    health,
    count,
}) => {
    return (
        <Flex spaceItems={{ default: 'spaceItemsXs' }}>
            <FlexItem>{value}</FlexItem>
            <FlexItem>{healthStateMapping[health].icon}</FlexItem>
            <FlexItem>{`(${count})`}</FlexItem>
        </Flex>
    )
};

export const StorageSystemPopup: React.FC<StorageSystemPopopProps> = ({
  systemHealthMap,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const [errorSysCount, setErrorSysCount] = React.useState(0);
  const [warnSysCount, setWarnSysCount] = React.useState(0);
  const [normalSysCount, setNormalSysCount] = React.useState(0);

  React.useEffect(() => {
    const systemHealthCount = getSystemHealthCount(systemHealthMap);
    setErrorSysCount(systemHealthCount.critical);
    setWarnSysCount(systemHealthCount.warning);
    setNormalSysCount(systemHealthCount.normal);
  }, [systemHealthMap, setErrorSysCount, setWarnSysCount, setNormalSysCount]);

  return (
    <Flex direction={{ default: 'column' }}>
        <Flex className="odf-status-popup__text--bold">{t('Storage System Status')}</Flex>
        <Flex>{t('StorageSystem is responsible for ensuring different types of file and block storage availability, storage capacity management and generic operations on storage.')}</Flex>
        <Flex className="odf-status-popup__text--bold">{t('Storage System')}{` (${systemHealthMap.length})`}</Flex>
        <Flex>
            <FlexItem>
                <SystemHealthCount value={t('Critical')} health={HealthState.ERROR} count={errorSysCount}/>
            </FlexItem>
            <FlexItem>
                <SystemHealthCount value={t('Warning')} health={HealthState.WARNING} count={warnSysCount}/>
            </FlexItem>
            <FlexItem>
                <SystemHealthCount value={t('Normal')} health={HealthState.OK} count={normalSysCount}/>
            </FlexItem>
        </Flex>
    </Flex>
  );
};

const getCsvStatusCount = (csvStatusMap: CSVStatusMap[]) => 
  csvStatusMap.reduce((acc, item) => {
    if (item?.rawCSVData === '1') acc.running++;
    else acc.degraded++;
    return acc;
  }, {running: 0, degraded: 0});

const StatusIcon: React.FC<StatusIconProps> = ({
    health,
    count,
}) => {
    return (
        <div className="odf-csv-status-popup__row">
          <div className="odf-csv-status-popup__icon">{healthStateMapping[health].icon}</div>
          <div className="odf-csv-status-popup__count">{count}</div>
        </div>
    )
};

export const ODFOperatorPopup: React.FC<ODFOperatorPopupProps> = ({
  csvStatusMap,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const [runningCount, setRunningCount] = React.useState(0);
  const [degradedCount, setDegradedCount] = React.useState(0);

  React.useEffect(() => {
    const csvStatusCount = getCsvStatusCount(csvStatusMap);
    setRunningCount(csvStatusCount.running);
    setDegradedCount(csvStatusCount.degraded);
  }, [csvStatusMap, setRunningCount, setDegradedCount]);

  return (
    <Flex direction={{ default: 'column' }}>
        <Flex className="odf-status-popup__text--bold">{t('OpenShift Data Foundation Status')}</Flex>
        <Flex>{t('The OpenShift Data Foundation operator is the primary operator of OpenShift Data Foundation')}</Flex>
        <Flex className="odf-status-popup__margin">
          <StatusPopupSection firstColumn={t('Operator Status')}>
            <Status icon={<StatusIcon health={HealthState.OK} count={runningCount}/>}>
              {t('Running')}
            </Status>
            <Status icon={<StatusIcon health={HealthState.ERROR} count={degradedCount}/>}>
              {t('Degraded')}
            </Status>
          </StatusPopupSection>
        </Flex>
    </Flex>
  );
};

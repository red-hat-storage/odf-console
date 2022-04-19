import * as React from 'react';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import Status, { StatusPopupSection } from '@odf/shared/popup/status-popup';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { Flex, FlexItem, Title } from '@patternfly/react-core';

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
};

type StatusIconProps = {
  health: HealthState;
  count: number;
};

const getSystemHealthCount = (systemHealthMap: SystemHealthMap[]) =>
  systemHealthMap.reduce(
    (acc, item) => {
      if (item?.rawHealthData === '0') acc.normal++;
      else if (item?.rawHealthData === '1') acc.warning++;
      else if (item?.rawHealthData === '2') acc.critical++;
      return acc;
    },
    { critical: 0, warning: 0, normal: 0 }
  );

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
  );
};

export const StorageSystemPopup: React.FC<StorageSystemPopopProps> = ({
  systemHealthMap,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const [sysCount, setSysCount] = React.useState({});

  React.useEffect(() => {
    setSysCount(getSystemHealthCount(systemHealthMap));
  }, [setSysCount, systemHealthMap]);

  return (
    <Flex direction={{ default: 'column' }}>
      <Title headingLevel="h3" size="md">
        {t('Storage System status')}
      </Title>
      <Flex>
        {t(
          'StorageSystem is responsible for ensuring different types of file and block storage availability, storage capacity management and generic operations on storage.'
        )}
      </Flex>
      <Title headingLevel="h3" size="md">
        {t('Storage System')}
        {` (${systemHealthMap.length})`}
      </Title>
      <Flex>
        <FlexItem>
          <SystemHealthCount
            value={t('Critical')}
            health={HealthState.ERROR}
            count={sysCount?.['critical']}
          />
        </FlexItem>
        <FlexItem>
          <SystemHealthCount
            value={t('Warning')}
            health={HealthState.WARNING}
            count={sysCount?.['warning']}
          />
        </FlexItem>
        <FlexItem>
          <SystemHealthCount
            value={t('Normal')}
            health={HealthState.OK}
            count={sysCount?.['normal']}
          />
        </FlexItem>
      </Flex>
    </Flex>
  );
};

const getCsvStatusCount = (csvStatusMap: CSVStatusMap[]) =>
  csvStatusMap.reduce(
    (acc, item) => {
      if (item?.rawCSVData === '1') acc.running++;
      else acc.degraded++;
      return acc;
    },
    { running: 0, degraded: 0 }
  );

const StatusIcon: React.FC<StatusIconProps> = ({ health, count }) => (
  <div className="odf-csv-status-popup__row">
    <div className="odf-csv-status-popup__icon">
      {healthStateMapping[health].icon}
    </div>
    <div className="odf-csv-status-popup__count">{count}</div>
  </div>
);

export const ODFOperatorPopup: React.FC<ODFOperatorPopupProps> = ({
  csvStatusMap,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const [operatorStatus, setOperatorStatus] = React.useState({});

  React.useEffect(() => {
    setOperatorStatus(getCsvStatusCount(csvStatusMap));
  }, [setOperatorStatus, csvStatusMap]);

  return (
    <Flex direction={{ default: 'column' }}>
      <Title headingLevel="h3" size="md">
        {t('Data Foundation status')}
      </Title>
      <Flex>
        {t(
          'The Data Foundation operator is the primary operator of Data Foundation'
        )}
      </Flex>
      <Flex>
        <Title headingLevel="h3" size="md">
          {t('Operator status')}
        </Title>
        <StatusPopupSection firstColumn="">
          <Status
            icon={
              <StatusIcon
                health={HealthState.OK}
                count={operatorStatus?.['running']}
              />
            }
          >
            {t('Running')}
          </Status>
          <Status
            icon={
              <StatusIcon
                health={HealthState.ERROR}
                count={operatorStatus?.['degraded']}
              />
            }
          >
            {t('Degraded')}
          </Status>
        </StatusPopupSection>
      </Flex>
    </Flex>
  );
};

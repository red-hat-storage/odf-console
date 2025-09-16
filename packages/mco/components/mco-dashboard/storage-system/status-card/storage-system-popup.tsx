import * as React from 'react';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import Status, { StatusPopupSection } from '@odf/shared/popup/status-popup';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
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
      <FlexItem data-test="storage-system-health-value">{value}</FlexItem>
      <FlexItem data-test="storage-system-health-icon">
        {healthStateMapping[health].icon}
      </FlexItem>
      <FlexItem data-test="storage-system-health-count">{`(${count})`}</FlexItem>
    </Flex>
  );
};

export const StorageSystemPopup: React.FC<StorageSystemPopopProps> = ({
  systemHealthMap,
}) => {
  const { t } = useCustomTranslation();
  const [sysCount, setSysCount] = React.useState({});

  React.useEffect(() => {
    setSysCount(getSystemHealthCount(systemHealthMap));
  }, [setSysCount, systemHealthMap]);

  return (
    <Flex direction={{ default: 'column' }}>
      <Title
        headingLevel="h3"
        size="md"
        data-test="storage-system-status-title"
      >
        {t('Storage system status')}
      </Title>
      <Flex data-test="storage-system-status-description">
        {t(
          'Storage system is responsible for ensuring different types of file and block storage availability, storage capacity management and generic operations on storage.'
        )}
      </Flex>
      <Title headingLevel="h3" size="md" data-test="storage-system-count">
        {t('Storage system')}
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
    <div
      className="odf-csv-status-popup__icon"
      data-test="operator-status-icon"
    >
      {healthStateMapping[health].icon}
    </div>
    <div
      className="odf-csv-status-popup__count"
      data-test="operator-status-count"
    >
      {count}
    </div>
  </div>
);

export const ODFOperatorPopup: React.FC<ODFOperatorPopupProps> = ({
  csvStatusMap,
}) => {
  const { t } = useCustomTranslation();
  const [operatorStatus, setOperatorStatus] = React.useState({});

  React.useEffect(() => {
    setOperatorStatus(getCsvStatusCount(csvStatusMap));
  }, [setOperatorStatus, csvStatusMap]);

  return (
    <Flex direction={{ default: 'column' }}>
      <Title headingLevel="h3" size="md" data-test="operator-status-title">
        {t('Data Foundation status')}
      </Title>
      <Flex data-test="operator-status-description">
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

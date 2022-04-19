import * as React from 'react';
import { StatusType } from '@odf/ocs/constants';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import { Status, StatusPopupSection } from '@odf/shared/popup/status-popup';
import { getWorstStatus } from '@odf/shared/utils';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { useTranslation } from 'react-i18next';
import { Stack, StackItem } from '@patternfly/react-core';

type ObjectServiceStatusProps = {
  RGWMetrics: SubsystemHealth;
  MCGMetrics: SubsystemHealth;
  statusType: StatusType;
};

export const ObjectServiceStatus: React.FC<ObjectServiceStatusProps> = ({
  RGWMetrics,
  MCGMetrics,
  statusType,
}) => {
  const { t } = useTranslation();

  const isMissing = !(RGWMetrics && MCGMetrics);
  const title =
    statusType === StatusType.HEALTH
      ? t('Object Service')
      : t('Data Resiliency');
  const popupTitle =
    statusType === StatusType.HEALTH
      ? t('Object Service Status')
      : t('Data Resiliency');
  const { state = HealthState.LOADING, message = '' } = !isMissing
    ? getWorstStatus([RGWMetrics, MCGMetrics], t)
    : {};
  return isMissing ? (
    <HealthItem
      title={title}
      state={RGWMetrics?.state || MCGMetrics?.state}
      details={RGWMetrics?.message || MCGMetrics?.message}
    />
  ) : (
    <HealthItem
      title={title}
      state={state}
      details={message}
      popupTitle={popupTitle}
    >
      <Stack hasGutter>
        <StackItem>
          {statusType === StatusType.HEALTH
            ? t('The object service includes 2 services.')
            : t('The data resiliency includes 2 services')}
        </StackItem>
        <StackItem>
          <StatusPopupSection
            firstColumn={t('Services')}
            secondColumn={t('Status')}
          >
            <Status icon={healthStateMapping[MCGMetrics.state]?.icon}>
              {t('Multicloud Object Gateway')}
            </Status>
            <Status icon={healthStateMapping[RGWMetrics.state]?.icon}>
              {t('Object Gateway (RGW)')}
            </Status>
          </StatusPopupSection>
        </StackItem>
      </Stack>
    </HealthItem>
  );
};

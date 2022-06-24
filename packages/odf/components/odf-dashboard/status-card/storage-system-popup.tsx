import * as React from 'react';
import Status, { StatusPopupSection } from '@odf/shared/popup/status-popup';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom';
import { Flex, FlexItem } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import './storage-system-popup.scss';

type SystemHealthMap = {
  systemName: string;
  healthState: HealthState;
  link: string;
  extraTexts?: string[];
};

type StorageSystemPopopProps = {
  systemHealthMap: SystemHealthMap[];
};

const healthStateToIcon = {
  [HealthState.OK]: (
    <CheckCircleIcon color="var(--pf-global--primary-color--100)" />
  ),
  [HealthState.WARNING]: (
    <ExclamationTriangleIcon color="var(--pf-global--warning-color--100)" />
  ),
  [HealthState.ERROR]: (
    <ExclamationCircleIcon color="var(--pf-global--danger-color--100)" />
  ),
};

const StorageSystemPopup: React.FC<StorageSystemPopopProps> = ({
  systemHealthMap,
}) => {
  const { t } = useCustomTranslation();
  return (
    <StatusPopupSection
      firstColumn={t('Storage System')}
      secondColumn={t('Health')}
    >
      {systemHealthMap.map((system) => (
        <Status
          key={system.systemName}
          icon={healthStateToIcon[system.healthState]}
        >
          <Flex direction={{ default: 'column' }}>
            <FlexItem className="odf-storageSystemPopup__item--margin">
              <Link to={system.link}>{system.systemName}</Link>
            </FlexItem>
            {!!system.extraTexts && (
              <FlexItem>
                {system.extraTexts.map((extraText, i) => (
                  <div className="text-muted" key={i}>
                    {extraText}
                  </div>
                ))}
              </FlexItem>
            )}
          </Flex>
        </Status>
      ))}
    </StatusPopupSection>
  );
};

export default StorageSystemPopup;

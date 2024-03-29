import * as React from 'react';
import { getCephsHealthState, WatchCephResources } from '@odf/ocs/utils';
import { healthStateMessage } from '@odf/shared/dashboards/status-card/states';
import { CephClusterModel } from '@odf/shared/models';
import { Status } from '@odf/shared/status/Status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  WatchK8sResults,
  StatusPopupSection,
  HealthState,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom-v5-compat';
import { Stack, StackItem } from '@patternfly/react-core';
import '@odf/shared/popup/status-popup.scss';

export const StoragePopover: React.FC<StoragePopoverProps> = ({ ceph }) => {
  const { t } = useCustomTranslation();

  const health = getCephsHealthState({ ceph }, t);
  const value = health.message || healthStateMessage(health.state, t);
  const operatorName = t('Data Foundation');

  return (
    <Stack hasGutter>
      <StackItem>
        {t(
          "Storage status represents the health status of Data Foundation's StorageCluster."
        )}
      </StackItem>
      <StackItem>
        <StatusPopupSection
          firstColumn={t('Provider')}
          secondColumn={t('Health')}
        >
          <div className="odf-status-popup__row">
            <Link to="/odf">{operatorName}</Link>
            <Status
              key="ocs"
              status={
                health.state === HealthState.OK && !value ? t('Healthy') : value
              }
            />
          </div>
        </StatusPopupSection>
      </StackItem>
    </Stack>
  );
};

export { getCephsHealthState as healthHandler };

export const healthResource = {
  ceph: {
    kind: referenceForModel(CephClusterModel),
    namespaced: false,
    isList: true,
  },
};

type StoragePopoverProps = WatchK8sResults<WatchCephResources>;

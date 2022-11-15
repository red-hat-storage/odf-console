import * as React from 'react';
import { getCephHealthState, WatchCephResource } from '@odf/ocs/utils';
import { healthStateMessage } from '@odf/shared/dashboards/status-card/states';
import { CephClusterModel } from '@odf/shared/models';
import { Status } from '@odf/shared/status/Status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  WatchK8sResults,
  useFlag,
  StatusPopupSection,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom';
import { Stack, StackItem } from '@patternfly/react-core';
import { ODF_MANAGED_FLAG } from '../../features';
import '@odf/shared/popup/status-popup.scss';

export const StoragePopover: React.FC<StoragePopoverProps> = ({ ceph }) => {
  const { t } = useCustomTranslation();

  const health = getCephHealthState({ ceph }, t);
  const value = health.message || healthStateMessage(health.state, t);
  const isOdfManaged = useFlag(ODF_MANAGED_FLAG);
  const operatorName = t('OpenShift Data Foundation');

  return (
    <Stack hasGutter>
      <StackItem>
        {t(
          "Storage status represents the health status of OpenShift Data Foundation's StorageCluster."
        )}
      </StackItem>
      <StackItem>
        <StatusPopupSection
          firstColumn={t('Provider')}
          secondColumn={t('Health')}
        >
          <div className="odf-status-popup__row">
            {!isOdfManaged ? (
              <Link to="/odf">{operatorName}</Link>
            ) : (
              operatorName
            )}
            <Status key="ocs" status={value} />
          </div>
        </StatusPopupSection>
      </StackItem>
    </Stack>
  );
};

export { getCephHealthState as healthHandler };

export const healthResource = {
  ceph: {
    kind: referenceForModel(CephClusterModel),
    namespaced: false,
    isList: true,
  },
};

type StoragePopoverProps = WatchK8sResults<WatchCephResource>;

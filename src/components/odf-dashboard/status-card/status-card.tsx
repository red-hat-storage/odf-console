import * as React from 'react';
import * as _ from 'lodash';
import { HealthState, WatchK8sResource } from 'badhikar-dynamic-plugin-sdk';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  HealthBody,
  HealthItem,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import { getOperatorHealthState } from '../utils';
import { Gallery, GalleryItem } from '@patternfly/react-core';
import { K8sListKind } from '../../../utils/types';
import { getStorageSystemDashboardLink, referenceForModel } from '../../utils';
import { ODFStorageSystem } from '../../../models';
import StorageSystemPopup, { SystemHealthMap } from './storage-system-popup';
import { StorageSystemKind } from '../../../types';

const operatorResource: WatchK8sResource = {
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: 'openshift-storage',
  isList: true,
};

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

export const StatusCard: React.FC = () => {
  const [ssData, ssLoaded, ssError] = useK8sWatchResource<
    K8sListKind<StorageSystemKind>
  >(storageSystemResource);

  const [csvData, csvLoaded, csvLoadError] =
    useK8sWatchResource<K8sListKind<StorageSystemKind>>(operatorResource);

  // Todo(bipuladh): Filter down to ODF
  const operatorStatus = csvData?.[0]?.status?.phase;

  const parsedData =
    ssLoaded && !ssError
      ? ssData.items?.reduce(
          (acc, curr) => {
            if (curr?.status?.phase === 'Ok') {
              acc['healthySystems'] = [...acc['healthySystems'], curr];
            } else {
              acc['unhealthySystems'] = [...acc['unhealthySystems'], curr];
            }
            return acc;
          },
          {
            healthySystems: [] as StorageSystemKind[],
            unhealthySystems: [] as StorageSystemKind[],
          }
        )
      : {
          healthySystems: [] as StorageSystemKind[],
          unhealthySystems: [] as StorageSystemKind[],
        };

  const { healthySystems = [], unhealthySystems = [] } = parsedData || {};

  const healthySystemsMap = healthySystems?.reduce((acc, curr) => {
    const systemMap = {
      systemName: curr.metadata?.name,
      healthState: HealthState.OK,
      link: getStorageSystemDashboardLink(curr),
    };
    acc.push(systemMap);
    return acc;
  }, [] as SystemHealthMap[]);

  const unhealthySystemsMap = unhealthySystems?.reduce((acc, curr) => {
    const systemMap = {
      systemName: curr.metadata?.name,
      healthState: HealthState.ERROR,
      link: getStorageSystemDashboardLink(curr),
    };
    acc.push(systemMap);
    return acc;
  }, [] as SystemHealthMap[]);

  const operatorHealthStatus = getOperatorHealthState(
    operatorStatus,
    !csvLoaded,
    csvLoadError
  );

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Status</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody>
        <HealthBody>
          <Gallery className="co-overview-status__health" hasGutter>
            <GalleryItem>
              <HealthItem
                title="OpenShift Data Foundation"
                state={operatorHealthStatus.state}
              />
            </GalleryItem>
            {healthySystems.length > 0 && (
              <GalleryItem>
                <HealthItem
                  title="Storage Systems"
                  popupTitle="Storage Systems"
                  state={HealthState.OK}
                >
                  <StorageSystemPopup systemHealthMap={healthySystemsMap} />
                </HealthItem>
              </GalleryItem>
            )}
            {unhealthySystems.length > 0 && (
              <GalleryItem>
                <HealthItem
                  title="Storage Systems"
                  popupTitle="Storage Systems"
                  state={HealthState.ERROR}
                >
                  <StorageSystemPopup systemHealthMap={unhealthySystemsMap} />
                </HealthItem>
              </GalleryItem>
            )}
          </Gallery>
        </HealthBody>
      </DashboardCardBody>
    </DashboardCard>
  );
};

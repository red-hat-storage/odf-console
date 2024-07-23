import * as React from 'react';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { CephClusterModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { K8sResourceKind, StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel, isOCSStorageSystem } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { CephObjectStoreModel, NooBaaSystemModel } from '../models/core';
import { Health, HEALTH_QUERY } from '../queries';
import {
  getCephHealthState,
  getNooBaaState,
  getRGWHealthState,
} from '../utils';

const cephClusterResource: WatchK8sResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

const cephObjectStoreResource: WatchK8sResource = {
  kind: referenceForModel(CephObjectStoreModel),
  isList: true,
};

const noobaaResource: WatchK8sResource = {
  kind: referenceForModel(NooBaaSystemModel),
  isList: true,
};

// Not applicable
const NA = 'N/A';

const AcceptableHealthStates = [
  HealthState.OK,
  HealthState.LOADING,
  HealthState.UPDATING,
  HealthState.NOT_AVAILABLE,
  NA,
];

export const useGetOCSHealth: UseGetOCSHealth = (systems) => {
  const { t } = useCustomTranslation();

  const [cephData, cephLoaded, cephLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);
  const [cephObjData, cephObjLoaded, cephObjLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(cephObjectStoreResource);
  const [noobaaData, noobaaLoaded, noobaaLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(noobaaResource);

  const [noobaaHealthStatus, noobaaQueryLoadError] = useCustomPrometheusPoll({
    query: HEALTH_QUERY[Health.NOOBAA],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  return React.useMemo(() => {
    let unifiedHealthStates: UnifiedHealthStates = {};
    systems?.forEach((system: StorageSystemKind) => {
      if (isOCSStorageSystem(system)) {
        const systemName = getName(system);
        const systemNamespace = getNamespace(system);

        const cephCluster = cephData?.find(
          (ceph) => getNamespace(ceph) === systemNamespace
        );
        const cephObjectStore = cephObjData?.find(
          (cephObj) => getNamespace(cephObj) === systemNamespace
        );
        const noobaaCluster = noobaaData?.find(
          (noobaa) => getNamespace(noobaa) === systemNamespace
        );

        const cephHealthState = getCephHealthState(
          {
            ceph: {
              data: cephCluster,
              loaded: cephLoaded,
              loadError: cephLoadError,
            },
          },
          t
        ).state;

        const interimRGWState =
          !cephObjLoadError && cephObjLoaded
            ? getRGWHealthState(cephObjectStore).state
            : NA;

        // there will only be single NooBaa instance (even for multiple StorageSystems)
        // and its status should only be linked with the corresponding StorageSystem/StorageCluster.
        const interimMCGState = !_.isEmpty(noobaaCluster)
          ? getNooBaaState(
              [
                {
                  response: noobaaHealthStatus,
                  error: noobaaQueryLoadError,
                },
              ],
              t,
              {
                loaded: noobaaLoaded,
                loadError: noobaaLoadError,
                data: noobaaData,
              }
            ).state
          : NA;

        const mcgState = AcceptableHealthStates.includes(interimMCGState)
          ? HealthState.OK
          : HealthState.ERROR;

        const rgwState = AcceptableHealthStates.includes(interimRGWState)
          ? HealthState.OK
          : HealthState.ERROR;

        const cephStorageHealthStatus = AcceptableHealthStates.includes(
          cephHealthState
        )
          ? HealthState.OK
          : HealthState.ERROR;

        const unifiedObjectHealth =
          mcgState === HealthState.ERROR || rgwState === HealthState.ERROR
            ? HealthState.ERROR
            : HealthState.OK;

        let unifiedHealthState: UnifiedHealthState;
        if (
          unifiedObjectHealth === HealthState.ERROR &&
          cephStorageHealthStatus === HealthState.ERROR
        ) {
          unifiedHealthState = {
            rawHealthState: '2',
            errorMessages: [
              t('Block and File service is unhealthy'),
              t('Object service is unhealthy'),
            ],
          };
        } else if (unifiedObjectHealth === HealthState.ERROR) {
          unifiedHealthState = {
            rawHealthState: '1',
            errorMessages: [t('Object service is unhealthy')],
            errorComponent:
              rgwState !== HealthState.OK ? 'block-file' : 'object',
          };
        } else if (cephStorageHealthStatus === HealthState.ERROR) {
          unifiedHealthState = {
            rawHealthState: '1',
            errorMessages: [t('Block and File service is unhealthy')],
            errorComponent: 'block-file',
          };
        } else {
          unifiedHealthState = {
            rawHealthState: '0',
          };
        }

        unifiedHealthStates[`${systemName}${systemNamespace}`] =
          unifiedHealthState;
      }
    });

    return unifiedHealthStates;
  }, [
    systems,
    cephData,
    cephLoaded,
    cephLoadError,
    cephObjData,
    cephObjLoaded,
    cephObjLoadError,
    noobaaData,
    noobaaLoaded,
    noobaaLoadError,
    noobaaHealthStatus,
    noobaaQueryLoadError,
    t,
  ]);
};

type UnifiedHealthState = {
  rawHealthState: string;
  errorMessages?: string[];
  errorComponent?: string;
};

type UnifiedHealthStates = {
  [systemNameAndNamespace: string]: UnifiedHealthState;
};

type UseGetOCSHealth = (systems: StorageSystemKind[]) => UnifiedHealthStates;

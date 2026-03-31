import * as React from 'react';
import {
  CephObjectStoreModel,
  NooBaaSystemModel,
  StorageClusterKind,
} from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { CephClusterModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
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

export const useGetOCSHealth: UseGetOCSHealth = (storageCluster) => {
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
    // Check if any required resources are still loading (not loaded and no error)
    const isLoading =
      (!cephLoaded && !cephLoadError) ||
      (!cephObjLoaded && !cephObjLoadError) ||
      (!noobaaLoaded && !noobaaLoadError);

    if (isLoading) {
      return {
        healthState: HealthState.LOADING,
        message: t('Loading'),
      };
    }

    // Check if all resources failed to load (network errors)
    const allResourcesErrored =
      (cephLoadError || !cephLoaded) &&
      (cephObjLoadError || !cephObjLoaded) &&
      (noobaaLoadError || !noobaaLoaded);

    if (
      allResourcesErrored &&
      (cephLoadError || cephObjLoadError || noobaaLoadError)
    ) {
      return {
        healthState: HealthState.UNKNOWN,
        message: t('Unknown'),
      };
    }

    let blockFileHealthState: SubsystemHealth = {
      healthState: HealthState.UNKNOWN,
      message: t('Unknown'),
    };

    let objectHealthState: SubsystemHealth = {
      healthState: HealthState.UNKNOWN,
      message: t('Unknown'),
    };

    const systemNamespace = getNamespace(storageCluster);
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

    blockFileHealthState.healthState = AcceptableHealthStates.includes(
      cephHealthState
    )
      ? HealthState.OK
      : HealthState.ERROR;
    blockFileHealthState.message = AcceptableHealthStates.includes(
      cephHealthState
    )
      ? t('Healthy')
      : t('Unhealthy');

    objectHealthState.healthState =
      mcgState === HealthState.ERROR || rgwState === HealthState.ERROR
        ? HealthState.ERROR
        : HealthState.OK;
    objectHealthState.message =
      mcgState === HealthState.ERROR || rgwState === HealthState.ERROR
        ? t('Unhealthy')
        : t('Healthy');

    const unifiedHealthMessage =
      blockFileHealthState.healthState === HealthState.OK &&
      objectHealthState.healthState === HealthState.OK
        ? t('Healthy')
        : t('Unhealthy');

    const unifiedHealthStates = {
      healthState:
        blockFileHealthState.healthState === HealthState.OK &&
        objectHealthState.healthState === HealthState.OK
          ? HealthState.OK
          : HealthState.ERROR,
      message: unifiedHealthMessage,
    };
    return unifiedHealthStates;
  }, [
    cephData,
    cephLoadError,
    cephLoaded,
    cephObjData,
    cephObjLoadError,
    cephObjLoaded,
    noobaaData,
    noobaaHealthStatus,
    noobaaLoadError,
    noobaaLoaded,
    noobaaQueryLoadError,
    storageCluster,
    t,
  ]);
};

type SubsystemHealth = {
  healthState: HealthState;
  message: string;
};

type UseGetOCSHealth = (system: StorageClusterKind) => SubsystemHealth;

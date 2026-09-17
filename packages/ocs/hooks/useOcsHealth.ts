import * as React from 'react';
import {
  CephObjectStoreModel,
  NooBaaSystemModel,
  StorageClusterKind,
} from '@odf/shared';
import { CephClusterModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import { K8sResourceKind, NooBaaKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import {
  getCephHealthState,
  getNooBaaHealthFromCR,
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

const AcceptableHealthStates = [
  HealthState.OK,
  HealthState.LOADING,
  HealthState.UPDATING,
  HealthState.PROGRESS,
  HealthState.NOT_AVAILABLE,
];

export type OCSHealthResult = {
  healthState: HealthState;
  message: string;
  mcgHealth: SubsystemHealth;
};

type ResourceData<T> = {
  data: T[];
  loaded: boolean;
  loadError: unknown;
};

export const computeOCSHealth = (
  storageCluster: StorageClusterKind,
  ceph: ResourceData<K8sResourceKind>,
  cephObj: ResourceData<K8sResourceKind>,
  noobaa: ResourceData<NooBaaKind>,
  t: TFunction
): OCSHealthResult => {
  const isLoading =
    (!ceph.loaded && !ceph.loadError) ||
    (!cephObj.loaded && !cephObj.loadError) ||
    (!noobaa.loaded && !noobaa.loadError);

  if (isLoading) {
    return {
      healthState: HealthState.LOADING,
      message: t('Loading'),
      mcgHealth: { state: HealthState.LOADING },
    };
  }

  const allResourcesErrored =
    (ceph.loadError || !ceph.loaded) &&
    (cephObj.loadError || !cephObj.loaded) &&
    (noobaa.loadError || !noobaa.loaded);

  if (
    allResourcesErrored &&
    (ceph.loadError || cephObj.loadError || noobaa.loadError)
  ) {
    return {
      healthState: HealthState.UNKNOWN,
      message: t('Unknown'),
      mcgHealth: { state: HealthState.UNKNOWN },
    };
  }

  const systemNamespace = getNamespace(storageCluster);
  const cephCluster = ceph.data?.find(
    (c) => getNamespace(c) === systemNamespace
  );
  const cephObjectStore = cephObj.data?.find(
    (o) => getNamespace(o) === systemNamespace
  );
  const noobaaCluster = noobaa.data?.find(
    (n) => getNamespace(n) === systemNamespace
  );

  const cephHealthState = getCephHealthState(
    {
      ceph: {
        data: cephCluster,
        loaded: ceph.loaded,
        loadError: ceph.loadError,
      },
    },
    t
  ).state;

  const interimRGWState =
    !cephObj.loadError && cephObj.loaded
      ? getRGWHealthState(cephObjectStore).state
      : HealthState.NOT_AVAILABLE;

  const mcgSubsystemHealth: SubsystemHealth = !_.isEmpty(noobaaCluster)
    ? getNooBaaHealthFromCR(noobaaCluster, t)
    : { state: HealthState.NOT_AVAILABLE };

  const mcgState = AcceptableHealthStates.includes(mcgSubsystemHealth.state)
    ? HealthState.OK
    : HealthState.ERROR;

  const rgwState = AcceptableHealthStates.includes(interimRGWState)
    ? HealthState.OK
    : HealthState.ERROR;

  const blockFileOk = AcceptableHealthStates.includes(cephHealthState);
  const objectOk =
    mcgState !== HealthState.ERROR && rgwState !== HealthState.ERROR;

  return {
    healthState: blockFileOk && objectOk ? HealthState.OK : HealthState.ERROR,
    message: blockFileOk && objectOk ? t('Healthy') : t('Unhealthy'),
    mcgHealth: mcgSubsystemHealth,
  };
};

export const useGetOCSHealth = (
  storageCluster: StorageClusterKind
): OCSHealthResult => {
  const { t } = useCustomTranslation();

  const [cephData, cephLoaded, cephLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);
  const [cephObjData, cephObjLoaded, cephObjLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(cephObjectStoreResource);
  const [noobaaData, noobaaLoaded, noobaaLoadError] =
    useK8sWatchResource<NooBaaKind[]>(noobaaResource);

  return React.useMemo(
    () =>
      computeOCSHealth(
        storageCluster,
        { data: cephData, loaded: cephLoaded, loadError: cephLoadError },
        {
          data: cephObjData,
          loaded: cephObjLoaded,
          loadError: cephObjLoadError,
        },
        { data: noobaaData, loaded: noobaaLoaded, loadError: noobaaLoadError },
        t
      ),
    [
      cephData,
      cephLoadError,
      cephLoaded,
      cephObjData,
      cephObjLoadError,
      cephObjLoaded,
      noobaaData,
      noobaaLoadError,
      noobaaLoaded,
      storageCluster,
      t,
    ]
  );
};

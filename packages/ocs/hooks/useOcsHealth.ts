import * as React from 'react';
import { K8sResourceKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  usePrometheusPoll,
  HealthState,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  CephClusterModel,
  CephObjectStoreModel,
  NooBaaSystemModel,
} from '../models/core';
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

export const useGetOCSHealth = () => {
  const { t } = useTranslation('plugin__odf-console');
  const [cephData, cephLoaded, cephLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);
  const [cephObjData, cephObjLoaded, cephObjLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(cephObjectStoreResource);
  const [noobaaData, noobaaLoaded, noobaaLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(noobaaResource);

  const [noobaaHealthStatus, ,noobaaQueryLoadError] = usePrometheusPoll({
    query: HEALTH_QUERY[Health.NOOBAA],
    endpoint: 'api/v1/query' as any,
  });

  const cephHealthState = getCephHealthState(
    { ceph: { data: cephData, loaded: cephLoaded, loadError: cephLoadError } },
    t
  ).state;
  const interimRGWState =
    !cephObjLoadError && cephObjLoaded
      ? getRGWHealthState(cephObjData[0]).state
      : NA;

  const interimMCGState = getNooBaaState(
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
  ).state;

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

  const unifiedHealthState = React.useMemo(() => {
    if (
      unifiedObjectHealth === HealthState.ERROR &&
      cephStorageHealthStatus === HealthState.ERROR
    ) {
      return {
        rawHealthState: '2',
        errorMessages: [
          t('Block and File service is unhealthy'),
          t('Object service is unhealthy'),
        ],
      };
    } else if (unifiedObjectHealth === HealthState.ERROR) {
      return {
        rawHealthState: '1',
        errorMessages: [t('Object service is unhealthy')],
        errorComponent: rgwState !== HealthState.OK ? 'block-file' : 'object',
      };
    } else if (cephStorageHealthStatus === HealthState.ERROR) {
      return {
        rawHealthState: '1',
        errorMessages: [t('Block and File service is unhealthy')],
        errorComponent: 'block-file',
      };
    }
    return {
      rawHealthState: '0',
    };
  }, [unifiedObjectHealth, cephStorageHealthStatus, rgwState, t]);

  return unifiedHealthState;
};

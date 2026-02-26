import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import { expandStorageUXBackendEndpoint } from '@odf/core/constants/attach-storage';
import { useNodesData, useSafeK8sGet } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { pvResource } from '@odf/core/resources';
import { NodeData } from '@odf/core/types';
import {
  checkArbiterCluster,
  checkFlexibleScaling,
  getDeviceSetCount,
  getSCAvailablePVs,
} from '@odf/core/utils';
import { getCephNodes } from '@odf/ocs/utils';
import {
  PageHeading,
  StatusBox,
  StorageClusterKind,
  StorageClusterModel,
  useFetchCsv,
} from '@odf/shared';
import { isCSVSucceeded, referenceForModel } from '@odf/shared/utils';
import {
  consoleFetch,
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom-v5-compat';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createWizardNodeState, getDeviceSetReplica } from '../utils';
import { AttachStorageFormFooter } from './attach-storage-footer';
import './attach-storage.scss';
import DeviceClassForm from './device-class-form';
import { LSOStorageClassDropdown } from './lso-storageclass-dropdown';
import {
  AttachStorageActionType,
  AttachStoragePayload,
  attachStorageReducer,
  createPayload,
  initialAttachStorageState,
} from './state';
import StoragePoolForm from './storage-pool-form';
import StorageClassForm from './storageclass-form';

const sendPostRequest = async (payload: AttachStoragePayload) => {
  const response = await consoleFetch(expandStorageUXBackendEndpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorMessage = `HTTP error! Status: ${response.status}`;
    throw new Error(errorMessage);
  }
};

const AttachStorage = () => {
  const { t } = useTranslation();
  const { resourceName, namespace } = useParams();
  const location = useLocation();
  const [state, dispatch] = React.useReducer(
    attachStorageReducer,
    initialAttachStorageState
  );
  const navigate = useNavigate();
  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });

  const isLSOInstalled = csvLoaded && !csvLoadError && isCSVSucceeded(csv);
  const [pvData, pvLoaded, pvLoadError] =
    useK8sWatchResource<K8sResourceCommon[]>(pvResource);

  React.useEffect(() => {
    if (csvLoaded && !isLSOInstalled) {
      navigate(
        `/odf/system/ns/${namespace}/${referenceForModel(
          StorageClusterModel
        )}/${resourceName}`
      );
    }
  }, [csvLoaded, isLSOInstalled, navigate, namespace, resourceName]);

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const clusterName = systemFlags[namespace]?.ocsClusterName;

  const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
    useSafeK8sGet<StorageClusterKind>(
      StorageClusterModel,
      clusterName,
      namespace
    );

  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData();

  const breadcrumbs = [
    {
      name: resourceName,
      path: `${location.pathname.split(`/~attachstorage`)[0]}`,
    },
    {
      name: t('Attach Storage'),
      path: '',
    },
  ];

  const onClose = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const onConfirm = React.useCallback(async () => {
    if (
      !storageClusterLoaded ||
      storageClusterLoadError ||
      !nodesLoaded ||
      nodesLoadError ||
      !pvLoaded ||
      pvLoadError
    ) {
      dispatch({
        type: AttachStorageActionType.SET_ERROR_MESSAGE,
        payload: t('Required data is not available. Please try again later.'),
      });
      return;
    }

    if (!pvData.length) {
      dispatch({
        type: AttachStorageActionType.SET_ERROR_MESSAGE,
        payload: t('No Persistent Volumes are available.'),
      });
      return;
    }

    if (!nodesData.length) {
      dispatch({
        type: AttachStorageActionType.SET_ERROR_MESSAGE,
        payload: t('No nodes data is available.'),
      });
      return;
    }

    try {
      dispatch({ type: AttachStorageActionType.SET_INPROGRESS, payload: true });
      const hasFlexibleScaling = checkFlexibleScaling(storageCluster);
      const isArbiterEnabled: boolean = checkArbiterCluster(storageCluster);

      const replica = getDeviceSetReplica(
        isArbiterEnabled,
        hasFlexibleScaling,
        createWizardNodeState(getCephNodes(nodesData, namespace) as NodeData[])
      );

      const pvs: K8sResourceCommon[] = getSCAvailablePVs(
        pvData,
        state.lsoStorageClassName
      );
      const availablePvsCount = pvs.length || 0;
      const failureDomain = storageCluster?.status?.failureDomain;
      const deviceSetCount = getDeviceSetCount(availablePvsCount, replica);
      const filesystemName = `${clusterName}-cephfilesystem`;
      const payload = createPayload(
        state,
        clusterName,
        failureDomain,
        replica,
        filesystemName,
        deviceSetCount
      );
      await sendPostRequest(payload);
      onClose();
    } catch (error) {
      dispatch({
        type: AttachStorageActionType.SET_ERROR_MESSAGE,
        payload: error.message || t('An unexpected error has occured.'),
      });
    } finally {
      dispatch({
        type: AttachStorageActionType.SET_INPROGRESS,
        payload: false,
      });
    }
  }, [
    t,
    storageCluster,
    storageClusterLoaded,
    storageClusterLoadError,
    nodesData,
    nodesLoaded,
    nodesLoadError,
    pvData,
    pvLoaded,
    pvLoadError,
    state,
    namespace,
    dispatch,
    clusterName,
    onClose,
  ]);

  const isLoaded =
    csvLoaded &&
    nodesLoaded &&
    areFlagsLoaded &&
    pvLoaded &&
    storageClusterLoaded;
  const isLoadError =
    flagsLoadError ||
    csvLoadError ||
    nodesLoadError ||
    storageClusterLoadError ||
    pvLoadError;

  const deviceSets = React.useMemo(
    () => storageCluster?.spec?.storageDeviceSets || [],
    [storageCluster?.spec?.storageDeviceSets]
  );

  const selectedStorageClassCount =
    deviceSets?.filter(
      (ds) =>
        ds.dataPVCTemplate?.spec?.storageClassName === state.lsoStorageClassName
    )?.length || 0;

  const defaultDeviceClassName =
    selectedStorageClassCount === 0
      ? state.lsoStorageClassName
      : `${state.lsoStorageClassName}-${selectedStorageClassCount}`;

  React.useEffect(() => {
    if (!state.lsoStorageClassName) return;

    dispatch({
      type: AttachStorageActionType.SET_DEVICE_CLASS,
      payload: defaultDeviceClassName,
    });
  }, [state.lsoStorageClassName, defaultDeviceClassName, dispatch]);

  return (
    <>
      <PageHeading title={t('Attach Storage')} breadcrumbs={breadcrumbs}>
        <Content className="attachstorage__description">
          <Content component={ContentVariants.small}>
            {t('Attach a new storage device class set to {{ resourceName }}', {
              resourceName,
            })}
          </Content>
        </Content>
      </PageHeading>
      {!isLoaded || isLoadError ? (
        <div className="pf-v6-u-pb-xl">
          <StatusBox
            loaded={isLoaded}
            loadError={isLoadError}
            label={t('Attach Storage form')}
          />
        </div>
      ) : (
        <div className="attachstorage-form">
          <LSOStorageClassDropdown
            dispatch={dispatch}
            storageCluster={storageCluster}
            namespace={namespace}
            state={state}
          />
          {selectedStorageClassCount > 0 && (
            <DeviceClassForm
              state={state}
              dispatch={dispatch}
              deviceSets={deviceSets}
              defaultDeviceClass={defaultDeviceClassName}
            />
          )}
          <div className="storagepool-form">
            <StoragePoolForm
              state={state}
              dispatch={dispatch}
              clusterName={clusterName}
            />
          </div>
          <StorageClassForm state={state} dispatch={dispatch} />
          <AttachStorageFormFooter
            state={state}
            cancel={onClose}
            onConfirm={onConfirm}
          />
        </div>
      )}
    </>
  );
};
export default AttachStorage;

import * as React from 'react';
import { combineReducers } from 'redux';
import { useStorageClusterNameDispatch } from '@odf/core/redux-store-reducer/actions/dispathchers';
import { storageClusterReducerName } from './reducers/selectors';
import storageClusterReducer from './reducers/storage-cluster-reducer';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { OCSStorageClusterModel } from '@odf/shared/models';
import { k8sList } from '@openshift-console/dynamic-plugin-sdk';

export default combineReducers(
  (() => {
    console.log('running combineReducers');
    return {
      [storageClusterReducerName]: storageClusterReducer,
    };
  })()
);

const scNameDetector = async () => {
  try {
    const storageClusters = await k8sList({
      model: OCSStorageClusterModel,
      queryParams: { CEPH_STORAGE_NAMESPACE },
      requestInit: null,
    });
    // @ts-ignore
    if (storageClusters?.length > 0) {
      // @ts-ignore
      const storageCluster = storageClusters.find(
        (sc) => sc.status.phase !== 'Ignored'
      );
      const storageClusterName = storageCluster?.metadata?.name;
      return storageClusterName;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const useSetStorageClusterName = (setFeatureFlag) => {
  const dispatch = useStorageClusterNameDispatch();

  // console.log("useSetStorageClusterName");
  // console.log("useSetStorageClusterName");
  // console.log("useSetStorageClusterName");
  // console.log("useSetStorageClusterName");

  React.useEffect(() => {
    scNameDetector()
      .then((res) => {
        dispatch(res);
      })
      .catch((e) => {
        dispatch(null);
      });
  }, [dispatch]);
};

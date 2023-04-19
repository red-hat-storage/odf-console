import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setStorageClusterName } from './storage-cluster-actions';

export const useStorageClusterNameDispatch = (): ((
  storageClusterName: string | null
) => void) => {
  const dispatch = useDispatch();
  return useCallback(
    (storageClusterName: string | null) => {
      dispatch(setStorageClusterName(storageClusterName));
    },
    [dispatch]
  );
};

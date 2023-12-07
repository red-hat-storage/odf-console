import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { nsPayload, setODFNamespace } from '../actions';

type UseODFNamespaceDispatch = () => (payload: nsPayload) => void;

export const useODFNamespaceDispatch: UseODFNamespaceDispatch = () => {
  const dispatch = useDispatch();

  return useCallback(
    (payload: nsPayload) => {
      dispatch(setODFNamespace(payload));
    },
    [dispatch]
  );
};

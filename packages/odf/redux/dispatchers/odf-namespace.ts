import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { NsPayload, setODFNamespace } from '../actions';

type UseODFNamespaceDispatch = () => (payload: NsPayload) => void;

export const useODFNamespaceDispatch: UseODFNamespaceDispatch = () => {
  const dispatch = useDispatch();

  return useCallback(
    (payload: NsPayload) => {
      dispatch(setODFNamespace(payload));
    },
    [dispatch]
  );
};

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { ODFSystemFlagsPayload, setODFSystemFlags } from '../actions';

type UseODFSystemFlagsDispatch = () => (payload: ODFSystemFlagsPayload) => void;

export const useODFSystemFlagsDispatch: UseODFSystemFlagsDispatch = () => {
  const dispatch = useDispatch();

  return useCallback(
    (payload: ODFSystemFlagsPayload) => {
      dispatch(setODFSystemFlags(payload));
    },
    [dispatch]
  );
};

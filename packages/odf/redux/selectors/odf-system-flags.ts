import { reduxReducerScope } from '@odf/core/redux/constants';
import { useSelector } from 'react-redux';
import { ODFSystemFlagsPayload } from '../actions';

export const odfSystemFlagsReducerName = 'odfSystemFlags';

const getODFSystemFlags = (state): ODFSystemFlagsPayload =>
  state.plugins?.[reduxReducerScope]?.[odfSystemFlagsReducerName] || {};

export const useODFSystemFlagsSelector = (): ODFSystemFlagsPayload & {
  areFlagsSafe: boolean;
} => {
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useSelector(getODFSystemFlags);

  return {
    // namespace-wise flags (as there can only be one cluster per namespace)
    systemFlags,
    // are all flags loaded and stored in redux
    areFlagsLoaded,
    // flags loading error object (if any)
    flagsLoadError,
    // is safe to use the flags
    areFlagsSafe: areFlagsLoaded && !flagsLoadError,
  };
};

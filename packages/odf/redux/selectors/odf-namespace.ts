import { reduxReducerScope } from '@odf/core/redux/constants';
import { useSelector } from 'react-redux';
import { NsPayload } from '../actions';

export const odfNamespaceReducerName = 'odfInstallNs';

const getODFNamespace = (state): NsPayload =>
  state.plugins?.[reduxReducerScope]?.[odfNamespaceReducerName] || {};

export const useODFNamespaceSelector = (): NsPayload & {
  isNsSafe: boolean;
  isFallbackSafe: boolean;
} => {
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useSelector(getODFNamespace);

  return {
    // installed operator namespace
    odfNamespace,
    // is namespace loaded and stored in redux
    isODFNsLoaded,
    // namespace loading error object (if any)
    odfNsLoadError,
    // is safe to use installed operator namespace
    isNsSafe: !!odfNamespace && isODFNsLoaded && !odfNsLoadError,
    // is safe to use fallback namespace (in case of any error, a fallback namespace is set alongside storing the error object to the redux store)
    isFallbackSafe: !!odfNamespace && isODFNsLoaded,
  };
};

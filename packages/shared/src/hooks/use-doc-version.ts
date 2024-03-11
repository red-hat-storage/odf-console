import { ClusterServiceVersionKind } from '@odf/shared/types';
import { ODF_DEFAULT_DOC_VERSION, PLUGIN_VERSION } from '../constants';
import {
  getOprMajorMinorVersion,
  parseOprMajorMinorVersion,
} from '../utils/common';
import { useFetchCsv, UseFetchCsvProps } from './use-fetch-csv';

type DefaultDocVersion = { defaultDocVersion?: string };

type UseDocVersionProps = DefaultDocVersion & UseFetchCsvProps;

type GetVersionWFallback = DefaultDocVersion & {
  csv: ClusterServiceVersionKind;
  loaded: boolean;
  loadError: any;
};

// Use this for the doc version (operator's major.minor) set at buildtime
export const DOC_VERSION =
  parseOprMajorMinorVersion(PLUGIN_VERSION) || ODF_DEFAULT_DOC_VERSION;

export const getVersionWFallback = ({
  csv,
  loaded,
  loadError,
  defaultDocVersion = null,
}: GetVersionWFallback): string => {
  const majorMinorVersion = getOprMajorMinorVersion(csv);
  // hook's consumer should use some fallback in case of any error (eg: user don't have access to read Subscriptions/CSVs)
  // fallback can be a default doc version or hiding doc link entirely, etc.
  const shouldUseFallback = !!loadError || (loaded && !majorMinorVersion);
  return shouldUseFallback ? defaultDocVersion || '' : majorMinorVersion;
};

// Use this to fetch doc version (operator's major.minor) at runtime
export const useDocVersion = ({
  defaultDocVersion,
  ...props
}: UseDocVersionProps): string => {
  const [csv, loaded, loadError] = useFetchCsv(props);

  return getVersionWFallback({ csv, loaded, loadError, defaultDocVersion });
};

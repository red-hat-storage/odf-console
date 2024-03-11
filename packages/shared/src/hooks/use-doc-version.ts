import { ClusterServiceVersionKind } from '@odf/shared/types';
import { getOprMajorMinorVersion } from '../utils/common';
import { useFetchCsv, UseFetchCsvProps } from './use-fetch-csv';

type DefaultDocVersion = { defaultDocVersion?: string };

type UseDocVersionProps = DefaultDocVersion & UseFetchCsvProps;

type GetVersionWFallback = DefaultDocVersion & {
  csv: ClusterServiceVersionKind;
  loaded: boolean;
  loadError: any;
};

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
  return shouldUseFallback && defaultDocVersion
    ? defaultDocVersion
    : majorMinorVersion;
};

export const useDocVersion = ({
  defaultDocVersion,
  ...props
}: UseDocVersionProps): string => {
  const [csv, loaded, loadError] = useFetchCsv(props);

  return getVersionWFallback({ csv, loaded, loadError, defaultDocVersion });
};

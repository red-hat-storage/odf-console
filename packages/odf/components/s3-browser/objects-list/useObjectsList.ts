import * as React from 'react';
import {
  ListObjectsV2CommandOutput,
  ListObjectVersionsCommandOutput,
  _Object as Content,
  CommonPrefix,
  ObjectVersion,
  DeleteMarkerEntry,
} from '@aws-sdk/client-s3';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import useSWRMutation from 'swr/mutation';
import {
  LIST_OBJECTS,
  DELIMITER,
  MAX_KEYS,
  LIST_VERSIONED_OBJECTS,
} from '../../../constants';
import { ObjectCrFormat } from '../../../types';
import {
  getPath,
  getPrefix as getSearchWithPrefix,
  convertObjectDataToCrFormat,
} from '../../../utils';
import {
  getPaginationCount,
  ContinuationTokens as LatestVersionsTokens,
  ContinuationVersionsTokens as AllVersionsTokens,
  VersionToken,
  fetchS3Resources,
  continuationTokensRefresher,
} from '../pagination-helper';

type UseObjectsList = ({
  bucketName,
  foldersPath,
  searchQuery,
  noobaaS3,
  setSelectedRows,
}: {
  bucketName: string;
  foldersPath: string;
  searchQuery: string;
  noobaaS3: S3Commands;
  setSelectedRows: React.Dispatch<React.SetStateAction<ObjectCrFormat[]>>;
  listAllVersions: boolean;
}) => {
  data: ListObjectsV2CommandOutput | ListObjectVersionsCommandOutput;
  error: any;
  isMutating: boolean;
  continuationTokens: LatestVersionsTokens | AllVersionsTokens;
  structuredObjects: ObjectCrFormat[];
  refreshTokens: () => Promise<void>;
  paginationToCount: number;
  paginationFromCount: number;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
};

export const useObjectsList: UseObjectsList = ({
  bucketName,
  foldersPath,
  searchQuery,
  noobaaS3,
  setSelectedRows,
  listAllVersions,
}) => {
  const { t } = useCustomTranslation();

  const searchWithPrefix = getSearchWithPrefix(searchQuery, foldersPath);
  const key = LIST_OBJECTS + DELIMITER + getPath(bucketName, searchWithPrefix);
  const versionsKey =
    LIST_VERSIONED_OBJECTS + DELIMITER + getPath(bucketName, searchWithPrefix);

  // latest/current version of objects
  const {
    data: dataLatestVersions,
    error: errorLatestVersions,
    isMutating: isMutatingLatestVersions,
    trigger: triggerLatestVersions,
  } = useSWRMutation(key, (_url, { arg }: { arg: string }) =>
    noobaaS3.listObjects({
      Bucket: bucketName,
      MaxKeys: MAX_KEYS,
      Delimiter: DELIMITER,
      FetchOwner: true,
      ...(!!searchWithPrefix && { Prefix: searchWithPrefix }),
      ...(!!arg && { ContinuationToken: arg }),
    })
  );
  // all versions of objects
  const {
    data: dataAllVersions,
    error: errorAllVersions,
    isMutating: isMutatingAllVersions,
    trigger: triggerAllVersions,
  } = useSWRMutation(versionsKey, (_url, { arg }: { arg: VersionToken }) =>
    noobaaS3.listObjectVersions({
      Bucket: bucketName,
      MaxKeys: MAX_KEYS,
      Delimiter: DELIMITER,
      ...(!!searchWithPrefix && { Prefix: searchWithPrefix }),
      ...(!!arg?.keyMarker && { KeyMarker: arg.keyMarker }),
      ...(!!arg?.versionIdMarker && { VersionIdMarker: arg.versionIdMarker }),
    })
  );

  // used for pagination (latest/current version of objects)
  const [latestVersionsTokens, setLatestVersionsTokens] =
    React.useState<LatestVersionsTokens>({
      previous: [],
      current: '',
      next: '',
    });
  // used for pagination (all versions of objects)
  const [allVersionsTokens, setAllVersionsTokens] =
    React.useState<AllVersionsTokens>({
      previous: [],
      current: null,
      next: null,
    });

  const loadedWOError = listAllVersions
    ? !isMutatingAllVersions && !errorAllVersions // all versions of objects
    : !isMutatingLatestVersions && !errorLatestVersions; // latest/current version of objects

  const structuredObjects: ObjectCrFormat[] = React.useMemo(() => {
    const objects: ObjectCrFormat[] = [];

    if (
      listAllVersions &&
      loadedWOError &&
      (!!dataAllVersions?.Versions?.length ||
        !!dataAllVersions?.DeleteMarkers?.length ||
        !!dataAllVersions?.CommonPrefixes?.length)
    ) {
      // all versions of objects
      dataAllVersions?.CommonPrefixes?.forEach((commonPrefix: CommonPrefix) => {
        objects.push(convertObjectDataToCrFormat(commonPrefix, t, true, false));
      });
      dataAllVersions?.DeleteMarkers?.forEach(
        (deleteMarker: DeleteMarkerEntry) => {
          objects.push(
            convertObjectDataToCrFormat(deleteMarker, t, false, true)
          );
        }
      );
      dataAllVersions?.Versions?.forEach((version: ObjectVersion) => {
        objects.push(convertObjectDataToCrFormat(version, t, false, false));
      });
    } else if (
      !listAllVersions &&
      loadedWOError &&
      (!!dataLatestVersions?.Contents?.length ||
        !!dataLatestVersions?.CommonPrefixes?.length)
    ) {
      // latest/current version of objects
      dataLatestVersions?.CommonPrefixes?.forEach(
        (commonPrefix: CommonPrefix) => {
          objects.push(
            convertObjectDataToCrFormat(commonPrefix, t, true, false)
          );
        }
      );
      dataLatestVersions?.Contents?.forEach((content: Content) => {
        objects.push(convertObjectDataToCrFormat(content, t, false, false));
      });
    }

    return objects;
  }, [dataLatestVersions, dataAllVersions, loadedWOError, listAllVersions, t]);

  const refreshTokens = listAllVersions
    ? () => {
        setLatestVersionsTokens({
          previous: [],
          current: '',
          next: '',
        });
        return continuationTokensRefresher(
          setAllVersionsTokens,
          triggerAllVersions,
          setSelectedRows,
          false,
          true
        ); // all versions of objects
      }
    : () => {
        setAllVersionsTokens({
          previous: [],
          current: null,
          next: null,
        });
        return continuationTokensRefresher(
          setLatestVersionsTokens,
          triggerLatestVersions,
          setSelectedRows
        ); // latest/current version of objects
      };

  const currentPageCount = listAllVersions
    ? (dataAllVersions?.Versions?.length || 0) +
      (dataAllVersions?.DeleteMarkers?.length || 0) +
      (dataAllVersions?.CommonPrefixes?.length || 0) // all versions of objects
    : (dataLatestVersions?.Contents?.length || 0) +
      (dataLatestVersions?.CommonPrefixes?.length || 0); // latest/current version of objects
  const [paginationToCount, paginationFromCount] = getPaginationCount(
    listAllVersions ? allVersionsTokens : latestVersionsTokens,
    currentPageCount,
    MAX_KEYS
  );

  const onNext = async () => {
    if (listAllVersions && !!allVersionsTokens.next && loadedWOError) {
      // all versions of objects
      fetchS3Resources<ListObjectVersionsCommandOutput>(
        setAllVersionsTokens,
        triggerAllVersions,
        true,
        allVersionsTokens.next,
        setSelectedRows,
        false,
        true
      );
    } else if (!listAllVersions && !!latestVersionsTokens.next && loadedWOError)
      // latest/current version of objects
      fetchS3Resources<ListObjectsV2CommandOutput>(
        setLatestVersionsTokens,
        triggerLatestVersions,
        true,
        latestVersionsTokens.next,
        setSelectedRows
      );
  };

  const onPrevious = async () => {
    if (listAllVersions && !!allVersionsTokens.current && loadedWOError) {
      // all versions of objects
      const paginationToken =
        allVersionsTokens.previous[allVersionsTokens.previous.length - 1];
      fetchS3Resources<ListObjectVersionsCommandOutput>(
        setAllVersionsTokens,
        triggerAllVersions,
        false,
        paginationToken,
        setSelectedRows,
        false,
        true
      );
    } else if (
      !listAllVersions &&
      !!latestVersionsTokens.current &&
      loadedWOError
    ) {
      // latest/current version of objects
      const paginationToken =
        latestVersionsTokens.previous[latestVersionsTokens.previous.length - 1];
      fetchS3Resources<ListObjectsV2CommandOutput>(
        setLatestVersionsTokens,
        triggerLatestVersions,
        false,
        paginationToken,
        setSelectedRows
      );
    }
  };

  return {
    data: listAllVersions ? dataAllVersions : dataLatestVersions,
    error: listAllVersions ? errorAllVersions : errorLatestVersions,
    isMutating: listAllVersions
      ? isMutatingAllVersions
      : isMutatingLatestVersions,
    continuationTokens: listAllVersions
      ? allVersionsTokens
      : latestVersionsTokens,
    structuredObjects,
    refreshTokens,
    paginationToCount,
    paginationFromCount,
    onNext,
    onPrevious,
  };
};

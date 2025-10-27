import {
  _Object as Content,
  CommonPrefix,
  ListBucketsCommandOutput,
  LifecycleRule,
  ObjectVersion,
  DeleteMarkerEntry,
} from '@aws-sdk/client-s3';
import { DASH, WILDCARD } from '@odf/shared/constants';
import { getName } from '@odf/shared/selectors';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  DELIMITER,
  BUCKETS_BASE_ROUTE,
  getBucketOverviewBaseRoute,
  PREFIX,
  SEARCH,
} from '../constants';
import { BucketCrFormat, ObjectCrFormat, S3ProviderType } from '../types';

export const getBreadcrumbs = (
  foldersPath: string,
  bucketName: string,
  providerType: S3ProviderType,
  t: TFunction
) => {
  const folders = foldersPath?.split(DELIMITER)?.filter(Boolean);
  const foldersCount = folders?.length || 0;
  const bucketsListPage = [{ name: t('Buckets'), path: BUCKETS_BASE_ROUTE }];

  let currentFolder = '';

  if (!foldersCount)
    return {
      breadcrumbs: [...bucketsListPage, { name: bucketName, path: '' }],
      currentFolder,
    };

  currentFolder = folders[foldersCount - 1] + DELIMITER;

  const initialBreadcrumb = [
    ...bucketsListPage,
    {
      name: bucketName,
      path: `${getBucketOverviewBaseRoute(bucketName, providerType)}`,
    },
  ];
  let encodedPathToFolder = '';
  return {
    breadcrumbs: folders.reduce((acc, folderName) => {
      const folderNameWDelimiter = folderName + DELIMITER;
      encodedPathToFolder = !encodedPathToFolder
        ? encodeURIComponent(folderNameWDelimiter)
        : encodedPathToFolder + encodeURIComponent(folderNameWDelimiter);
      acc.push({
        name: folderNameWDelimiter,
        path: `${getBucketOverviewBaseRoute(bucketName, providerType)}?${PREFIX}=${encodedPathToFolder}`,
      });
      return acc;
    }, initialBreadcrumb),
    currentFolder,
  };
};

export const getPath = (bucketName: string, foldersPath: string) =>
  !foldersPath ? bucketName + DELIMITER : bucketName + DELIMITER + foldersPath;

export const getPrefix = (name: string, foldersPath: string) =>
  !!foldersPath ? foldersPath + name : name;

export const getEncodedPrefix = (name: string, foldersPath: string) =>
  !!foldersPath
    ? encodeURIComponent(foldersPath + name)
    : encodeURIComponent(name);

export const convertObjectDataToCrFormat = (
  objectData: Content | ObjectVersion | DeleteMarkerEntry | CommonPrefix,
  t: TFunction,
  isFolder = false,
  isDeleteMarker = false
): ObjectCrFormat => {
  const structuredObject: ObjectCrFormat = {
    metadata: { name: '', uid: '' },
    apiResponse: { lastModified: DASH, size: DASH, versionId: DASH },
    isFolder: false,
    type: '',
  };
  if (isFolder) {
    const prefix = (objectData as CommonPrefix)?.Prefix;
    structuredObject.metadata.name = prefix;
    structuredObject.metadata.uid = prefix;
    structuredObject.isFolder = true;
    structuredObject.type = t('Folder');
  } else {
    const key = (objectData as Content | ObjectVersion | DeleteMarkerEntry)
      ?.Key;
    const lastIndexOfDot = key.lastIndexOf('.');
    const versionId =
      (objectData as ObjectVersion | DeleteMarkerEntry)?.VersionId || DASH;
    const isLatestVersion = (objectData as ObjectVersion | DeleteMarkerEntry)
      ?.IsLatest;
    structuredObject.metadata.name = key;
    structuredObject.metadata.uid = key + versionId;
    structuredObject.apiResponse.lastModified =
      (
        objectData as Content | ObjectVersion | DeleteMarkerEntry
      )?.LastModified?.toString() || DASH;
    structuredObject.apiResponse.size =
      humanizeBinaryBytes((objectData as Content | ObjectVersion)?.Size, 'B')
        ?.string || DASH;
    structuredObject.type = isDeleteMarker
      ? t('Delete marker')
      : (lastIndexOfDot !== -1
          ? key.substring(lastIndexOfDot + 1, key.length)
          : DASH) || DASH;
    structuredObject.apiResponse.ownerName =
      (objectData as Content | ObjectVersion | DeleteMarkerEntry)?.Owner
        ?.DisplayName || DASH;
    structuredObject.apiResponse.versionId = versionId;
    if (isDeleteMarker) structuredObject.isDeleteMarker = true;
    if (isLatestVersion) structuredObject.isLatest = true;
  }

  return structuredObject;
};

export const replacePathFromName = (
  object: ObjectCrFormat | string,
  foldersPath: string
): string =>
  typeof object === 'string'
    ? object.replace(foldersPath, '')
    : getName(object).replace(foldersPath, '');

export const convertBucketDataToCrFormat = (
  listBucketsCommandOutput: ListBucketsCommandOutput
): BucketCrFormat[] =>
  listBucketsCommandOutput?.Buckets.map((bucket) => ({
    metadata: {
      name: bucket.Name,
      uid: bucket.Name,
      creationTimestamp: bucket.CreationDate.toString(),
    },
    apiResponse: {
      owner: listBucketsCommandOutput?.Owner?.DisplayName,
    },
  })) || [];

export const getNavigationURL = (
  bucketName: string,
  providerType: S3ProviderType,
  foldersPath: string,
  inputValue: string
): string => {
  const queryParams = [
    ...(!!foldersPath
      ? [`${PREFIX}=${getEncodedPrefix('', foldersPath)}`]
      : []),
    ...(!!inputValue ? [`${SEARCH}=${getEncodedPrefix(inputValue, '')}`] : []),
  ];
  const queryParamsString = !!queryParams.length
    ? '?' + queryParams.join('&')
    : '';

  return (
    `${getBucketOverviewBaseRoute(bucketName, providerType)}` +
    queryParamsString
  );
};

export const isRuleScopeGlobal = (rule: LifecycleRule) => {
  const filter = rule.Filter;

  if (!filter) return true;

  if (filter.Prefix === '') return true;

  if (filter.And) {
    const { Prefix, Tags, ObjectSizeGreaterThan, ObjectSizeLessThan } =
      filter.And;

    if (
      !Prefix &&
      _.isEmpty(Tags) &&
      !ObjectSizeGreaterThan &&
      !ObjectSizeLessThan
    ) {
      return true;
    }

    return false;
  }

  if (
    !!filter.Prefix ||
    !_.isEmpty(filter.Tag) ||
    !!filter.ObjectSizeGreaterThan ||
    !!filter.ObjectSizeLessThan
  ) {
    return false;
  }

  return true;
};

export const getObjectVersionId = (object: ObjectCrFormat) => {
  const versionId = object?.apiResponse?.versionId;
  return versionId === DASH ? undefined : versionId;
};

export const sortByLastModified = (a: ObjectCrFormat, b: ObjectCrFormat) => {
  let lastModifiedB: string | number = b?.apiResponse?.lastModified;
  let lastModifiedA: string | number = a?.apiResponse?.lastModified;
  if (lastModifiedB === DASH || !lastModifiedB) lastModifiedB = 0;
  if (lastModifiedA === DASH || !lastModifiedA) lastModifiedA = 0;
  return new Date(lastModifiedB).getTime() - new Date(lastModifiedA).getTime();
};

export const isAllowAllConfig = (config: string[]) =>
  config?.length === 1 && config[0] === WILDCARD;

export const getProviderLabel = (providerType: S3ProviderType) =>
  providerType === S3ProviderType.Noobaa ? 'MCG' : 'RGW';

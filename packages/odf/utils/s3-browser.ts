import {
  _Object as Content,
  CommonPrefix,
  ListBucketsCommandOutput,
  LifecycleRule,
} from '@aws-sdk/client-s3';
import { DASH } from '@odf/shared/constants';
import { getName } from '@odf/shared/selectors';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { DELIMITER, BUCKETS_BASE_ROUTE, PREFIX, SEARCH } from '../constants';
import { BucketCrFormat, ObjectCrFormat } from '../types';

export const getBreadcrumbs = (
  foldersPath: string,
  bucketName: string,
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
    { name: bucketName, path: `${BUCKETS_BASE_ROUTE}/${bucketName}` },
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
        path: `${BUCKETS_BASE_ROUTE}/${bucketName}?${PREFIX}=${encodedPathToFolder}`,
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
  objectData: Content | CommonPrefix,
  isFolder: boolean,
  t: TFunction
): ObjectCrFormat => {
  const structuredObject: ObjectCrFormat = {
    metadata: { name: '', uid: '' },
    apiResponse: { lastModified: DASH, size: DASH },
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
    const key = (objectData as Content)?.Key;
    const lastIndexOfDot = key.lastIndexOf('.');
    structuredObject.metadata.name = key;
    structuredObject.metadata.uid = key;
    structuredObject.apiResponse.lastModified =
      (objectData as Content)?.LastModified?.toString() || DASH;
    structuredObject.apiResponse.size =
      humanizeBinaryBytes((objectData as Content)?.Size, 'B')?.string || DASH;
    structuredObject.type =
      (lastIndexOfDot !== -1
        ? key.substring(lastIndexOfDot + 1, key.length)
        : DASH) || DASH;
    structuredObject.apiResponse.ownerName =
      (objectData as Content)?.Owner?.DisplayName || DASH;
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

  return `${BUCKETS_BASE_ROUTE}/${bucketName}` + queryParamsString;
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

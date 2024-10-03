import { _Object as Content, CommonPrefix } from '@aws-sdk/client-s3';
import { DASH } from '@odf/shared/constants';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import { DELIMITER, BUCKETS_BASE_ROUTE, PREFIX } from '../constants';
import { ObjectCrFormat } from '../types';

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

export const convertObjectsDataToCrFormat = (
  objectData: Content | CommonPrefix,
  isFolder: boolean,
  t: TFunction
): ObjectCrFormat => {
  const structuredObjects: ObjectCrFormat = {
    metadata: { name: '', uid: '' },
    apiResponse: { lastModified: DASH, size: DASH },
    isFolder: false,
    type: '',
  };
  if (isFolder) {
    const prefix = (objectData as CommonPrefix)?.Prefix;
    structuredObjects.metadata.name = prefix;
    structuredObjects.metadata.uid = prefix;
    structuredObjects.isFolder = true;
    structuredObjects.type = t('Folder');
  } else {
    const key = (objectData as Content)?.Key;
    const lastIndexOfDot = key.lastIndexOf('.');
    structuredObjects.metadata.name = key;
    structuredObjects.metadata.uid = key;
    structuredObjects.apiResponse.lastModified =
      (objectData as Content)?.LastModified?.toString() || DASH;
    structuredObjects.apiResponse.size =
      humanizeBinaryBytes((objectData as Content)?.Size, 'B', 'GiB')?.string ||
      DASH;
    structuredObjects.type =
      (lastIndexOfDot !== -1
        ? key.substring(lastIndexOfDot + 1, key.length)
        : DASH) || DASH;
  }

  return structuredObjects;
};

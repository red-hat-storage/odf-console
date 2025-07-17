import { StartingPoint } from '@odf/core/types/install-ui';

// Starting point relates to the URL
export const getModalStartPoint = (pathname: string): StartingPoint => {
  const pathParts = pathname.split('/');
  const lastPart = pathParts.pop();
  switch (lastPart) {
    case 'storage-cluster':
      return StartingPoint.STORAGE_CLUSTER;
    case 'overview':
      return StartingPoint.OVERVIEW;
    case 'external-system':
      return StartingPoint.EXTERNAL_SYSTEM;
    case 'object-storage':
      return StartingPoint.OBJECT_STORAGE;
    default:
      return StartingPoint.OVERVIEW;
  }
};

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
    case 'external-systems':
      return StartingPoint.EXTERNAL_SYSTEMS;
    case 'object-storage':
      return StartingPoint.OBJECT_STORAGE;
    default:
      return StartingPoint.OVERVIEW;
  }
};

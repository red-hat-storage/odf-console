import { StartingPoint } from '@odf/core/types/install-ui';

// Starting point relates to the URL
export const getModalStartPoint = (pathname: string): StartingPoint => {
  const pathParts = pathname.split('/');
  const lastPart = pathParts.pop();
  return StartingPoint[lastPart] || StartingPoint.OVERVIEW;
};

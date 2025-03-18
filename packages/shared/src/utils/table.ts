import * as _ from 'lodash-es';
import { SortByDirection } from '@patternfly/react-table';

const sort = (aValue: any, bValue: any, c: SortByDirection) => {
  const negation = c !== SortByDirection.asc;
  const sortVal = aValue.localeCompare(bValue);
  return negation ? -sortVal : sortVal;
};

export const sortRows = (
  a: any,
  b: any,
  c: SortByDirection,
  sortField?: string,
  favoriteNames?: string[]
) => {
  let aValue = sortField ? _.get(a, sortField, '').toString() : a;
  let bValue = sortField ? _.get(b, sortField, '').toString() : b;
  if (!!favoriteNames) {
    aValue = favoriteNames.includes(aValue).toString();
    bValue = favoriteNames.includes(bValue).toString();
  }
  return sort(aValue, bValue, c);
};

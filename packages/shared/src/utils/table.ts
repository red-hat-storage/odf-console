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
  sortField: string,
  favoriteNames?: string[]
) => {
  let aValue = _.get(a, sortField, '').toString();
  let bValue = _.get(b, sortField, '').toString();
  if (!!favoriteNames) {
    aValue = favoriteNames.includes(aValue).toString();
    bValue = favoriteNames.includes(bValue).toString();
  }
  return sort(aValue, bValue, c);
};

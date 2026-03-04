import * as _ from 'lodash-es';
import { SortByDirection } from '@patternfly/react-table';

export const sort = (aValue: any, bValue: any, c: SortByDirection) => {
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
  let aValue = _.get(a, sortField, '').toString();
  let bValue = _.get(b, sortField, '').toString();
  if (!!favoriteNames) {
    aValue = favoriteNames.includes(aValue).toString();
    bValue = favoriteNames.includes(bValue).toString();
  }
  return sort(aValue, bValue, c);
};

export const sortNumericRows = <T extends Record<string, any>>(
  a: T,
  b: T,
  direction: SortByDirection,
  field: string
): number => {
  const aValue = _.get(a, field, 0) as number;
  const bValue = _.get(b, field, 0) as number;
  const sortVal = aValue - bValue;
  return direction === SortByDirection.asc ? sortVal : -sortVal;
};

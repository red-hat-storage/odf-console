import * as _ from 'lodash-es';
import { SortByDirection } from '@patternfly/react-table';

export const sortRows = (
  a: any,
  b: any,
  c: SortByDirection,
  sortField: string
) => {
  const negation = c !== SortByDirection.asc;
  const aValue = _.get(a, sortField, '').toString();
  const bValue = _.get(b, sortField, '');
  const sortVal = String(aValue).localeCompare(String(bValue));
  return negation ? -sortVal : sortVal;
};

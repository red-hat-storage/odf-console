import { MatchExpression } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';

export const createEquals = (key: string, value: string): MatchExpression => ({
  key,
  operator: 'Equals',
  values: [value],
});

export const requirementFromString = (string) => {
  string = string.trim();

  // "key"
  if (/^[0-9A-Za-z/\-_.]+$/.test(string)) {
    return {
      key: string,
      operator: 'Exists',
      values: [],
    };
  }

  // "!key"
  if (/^!\s*[0-9A-Za-z/\-_.]+$/.test(string)) {
    return {
      key: string.split(/!\s*/)[1],
      operator: 'DoesNotExist',
      values: [],
    };
  }

  // "key=value" OR "key==value"
  if (/^[0-9A-Za-z/\-_.]+\s*==?\s*[0-9A-Za-z/\-_.]+$/.test(string)) {
    const parts = string.split(/\s*==?\s*/);
    const key = parts[0];
    const value = parts[1];
    return createEquals(key, value);
  }

  // "key!=value"
  if (/^[0-9A-Za-z/\-_.]+\s*!=\s*[0-9A-Za-z/\-_.]+$/.test(string)) {
    return {
      key: string.split(/\s*!=\s*/)[0],
      operator: 'NotEquals',
      values: [string.split(/\s*!=\s*/)[1]],
    };
  }

  // "key in (value1[,value2,...])"
  if (/^[0-9A-Za-z/\-_.]+\s+in\s+\([0-9A-Za-z/\-_.,\s]+\)$/.test(string)) {
    const parts = string.split(/\s+in\s+/);
    const key = parts[0];
    const values = parts[1].slice(1, -1).split(',').map(_.trim);

    return {
      key,
      operator: 'In',
      values,
    };
  }

  // "key notin (value1[,value2,...])"
  if (/^[0-9A-Za-z/\-_.]+\s+notin\s+\([0-9A-Za-z/\-_.,\s]+\)$/.test(string)) {
    const parts = string.split(/\s+notin\s+/);
    const key = parts[0];
    const values = parts[1].slice(1, -1).split(',').map(_.trim);

    return {
      key,
      operator: 'NotIn',
      values,
    };
  }

  // "key > value1"
  if (/^[0-9A-Za-z/\-_.]+\s+>\s+[0-9.]+$/.test(string)) {
    const parts = string.split(/\s+>\s+/);
    const key = parts[0];
    const value = parts[1];

    return {
      key,
      operator: 'GreaterThan',
      values: [value],
    };
  }

  // "key < value1"
  if (/^[0-9A-Za-z/\-_.]+\s+<\s+[0-9.]+$/.test(string)) {
    const parts = string.split(/\s+<\s+/);
    const key = parts[0];
    const value = parts[1];

    return {
      key,
      operator: 'LessThan',
      values: [value],
    };
  }

  return; // falsy means parsing failure
};

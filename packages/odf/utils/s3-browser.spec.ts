import { TFunction } from 'i18next';
import { ObjectCrFormat } from '../types';
import {
  getStorageClassDisplayName,
  isObjectDeepArchived,
  parseRestoreHeader,
  getRestoreStatusText,
} from './s3-browser';

const makeObject = (
  storageClass?: string,
  restoreStatus?: ObjectCrFormat['apiResponse']['restoreStatus']
): ObjectCrFormat => ({
  metadata: { name: 'obj', uid: 'obj' },
  apiResponse: { storageClass, restoreStatus },
});

// pass-through translator: returns the key, interpolating {{expiry}} when given.
const t = ((key: string, options?: { expiry?: string }) =>
  options?.expiry
    ? key.replace('{{expiry}}', options.expiry)
    : key) as TFunction;

describe('getStorageClassDisplayName', () => {
  it('shows every storage class exactly as fetched', () => {
    expect(getStorageClassDisplayName('DEEP_ARCHIVE')).toBe('DEEP_ARCHIVE');
    expect(getStorageClassDisplayName('STANDARD')).toBe('STANDARD');
    expect(getStorageClassDisplayName('GLACIER')).toBe('GLACIER');
  });

  it('returns blank only when no storage class is provided', () => {
    expect(getStorageClassDisplayName(undefined)).toBe('');
    expect(getStorageClassDisplayName('')).toBe('');
  });
});

describe('deep archive predicates', () => {
  it('isObjectDeepArchived is true only for DEEP_ARCHIVE', () => {
    expect(isObjectDeepArchived(makeObject('DEEP_ARCHIVE'))).toBe(true);
    expect(isObjectDeepArchived(makeObject('STANDARD'))).toBe(false);
    expect(isObjectDeepArchived(makeObject())).toBe(false);
  });
});

describe('parseRestoreHeader', () => {
  it('returns undefined when no header is present', () => {
    expect(parseRestoreHeader(undefined)).toBeUndefined();
    expect(parseRestoreHeader('')).toBeUndefined();
  });

  it('detects an in-progress restore', () => {
    expect(parseRestoreHeader('ongoing-request="true"')).toEqual({
      isRestoreInProgress: true,
    });
  });

  it('detects a completed restore with its expiry date', () => {
    expect(
      parseRestoreHeader(
        'ongoing-request="false", expiry-date="Fri, 21 Dec 2012 00:00:00 GMT"'
      )
    ).toEqual({
      isRestoreInProgress: false,
      restoreExpiryDate: 'Fri, 21 Dec 2012 00:00:00 GMT',
    });
  });
});

describe('getRestoreStatusText', () => {
  it('is blank for non-deep-archived objects', () => {
    expect(getRestoreStatusText(makeObject('STANDARD'), t)).toBe('');
  });

  it('reports "Archived" when not restored', () => {
    expect(getRestoreStatusText(makeObject('DEEP_ARCHIVE'), t)).toBe(
      'Archived'
    );
  });

  it('reports "Restoring…" while a restore is in progress', () => {
    expect(
      getRestoreStatusText(
        makeObject('DEEP_ARCHIVE', { isRestoreInProgress: true }),
        t
      )
    ).toBe('Restoring…');
  });

  it('reports "Restored until <date>" for a valid, unexpired restore', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const text = getRestoreStatusText(
      makeObject('DEEP_ARCHIVE', {
        isRestoreInProgress: false,
        restoreExpiryDate: future.toISOString(),
      }),
      t
    );
    expect(text).toBe(`Restored until ${future.toLocaleDateString()}`);
  });

  it('falls back to "Archived" once the restored copy has expired', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      getRestoreStatusText(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: false,
          restoreExpiryDate: past.toISOString(),
        }),
        t
      )
    ).toBe('Archived');
  });
});

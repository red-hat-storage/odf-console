import { TFunction } from 'i18next';
import { ObjectCrFormat } from '../types';
import {
  getStorageClassDisplayName,
  getRestoreStatusText,
  isObjectDeepArchived,
  isObjectRestored,
  isObjectRestoreInProgress,
  parseRestoreHeader,
} from './s3-browser';

// Passthrough translation mock with simple {{var}} interpolation.
const t = ((key: string, opts?: Record<string, unknown>) =>
  opts
    ? key.replace(/{{\s*(\w+)\s*}}/g, (_match, name) => String(opts[name]))
    : key) as TFunction;

const makeObject = (
  storageClass?: string,
  restoreStatus?: ObjectCrFormat['apiResponse']['restoreStatus']
): ObjectCrFormat => ({
  metadata: { name: 'obj', uid: 'obj' },
  apiResponse: { storageClass, restoreStatus },
});

const DAY_MS = 24 * 60 * 60 * 1000;
// Relative to "now" so the assertions stay valid over time.
const futureExpiry = () => new Date(Date.now() + DAY_MS).toISOString();
const pastExpiry = () => new Date(Date.now() - DAY_MS).toISOString();

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

  it('isObjectRestoreInProgress reflects the flag', () => {
    expect(
      isObjectRestoreInProgress(
        makeObject('DEEP_ARCHIVE', { isRestoreInProgress: true })
      )
    ).toBe(true);
    expect(
      isObjectRestoreInProgress(
        makeObject('DEEP_ARCHIVE', { isRestoreInProgress: false })
      )
    ).toBe(false);
    expect(isObjectRestoreInProgress(makeObject('DEEP_ARCHIVE'))).toBe(false);
  });

  it('isObjectRestored is true only when completed with a future expiry', () => {
    expect(
      isObjectRestored(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: false,
          restoreExpiryDate: futureExpiry(),
        })
      )
    ).toBe(true);
    // expired copy -> effectively archived again
    expect(
      isObjectRestored(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: false,
          restoreExpiryDate: pastExpiry(),
        })
      )
    ).toBe(false);
    // unparseable expiry -> not restored
    expect(
      isObjectRestored(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: false,
          restoreExpiryDate: 'not-a-date',
        })
      )
    ).toBe(false);
    // still running -> not restored
    expect(
      isObjectRestored(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: true,
          restoreExpiryDate: futureExpiry(),
        })
      )
    ).toBe(false);
    // no expiry -> not restored
    expect(
      isObjectRestored(
        makeObject('DEEP_ARCHIVE', { isRestoreInProgress: false })
      )
    ).toBe(false);
  });
});

describe('getRestoreStatusText', () => {
  it('returns blank for non-deep-archived objects', () => {
    expect(getRestoreStatusText(makeObject('STANDARD'), t)).toBe('');
    expect(getRestoreStatusText(makeObject(), t)).toBe('');
  });

  it('returns "Archived" for an archived, not-restored object', () => {
    expect(getRestoreStatusText(makeObject('DEEP_ARCHIVE'), t)).toBe(
      'Archived'
    );
  });

  it('returns the restoring text while in progress', () => {
    expect(
      getRestoreStatusText(
        makeObject('DEEP_ARCHIVE', { isRestoreInProgress: true }),
        t
      )
    ).toBe('Restoring…');
  });

  it('returns "Restored until <date>" once restored', () => {
    expect(
      getRestoreStatusText(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: false,
          restoreExpiryDate: futureExpiry(),
        }),
        t
      )
    ).toMatch(/^Restored until /);
  });

  it('falls back to "Archived" once the restored copy has expired', () => {
    expect(
      getRestoreStatusText(
        makeObject('DEEP_ARCHIVE', {
          isRestoreInProgress: false,
          restoreExpiryDate: pastExpiry(),
        }),
        t
      )
    ).toBe('Archived');
  });
});

describe('parseRestoreHeader', () => {
  it('returns undefined for an empty header', () => {
    expect(parseRestoreHeader(undefined)).toBeUndefined();
    expect(parseRestoreHeader('')).toBeUndefined();
  });

  it('parses an in-progress restore', () => {
    expect(parseRestoreHeader('ongoing-request="true"')).toEqual({
      isRestoreInProgress: true,
    });
  });

  it('parses a completed restore with an expiry date', () => {
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

import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import {
  S3_CREDENTIALS_SESSION_STORE_KEY,
  S3_CREDENTIALS_LOCAL_STORE_KEY,
} from '../../../../constants';
import {
  StorageType,
  SecretRef,
  StoredCredentials,
  SetSecretRefWithStorage,
} from '../types';

const readStore = (storageType: StorageType): StoredCredentials => {
  try {
    const key =
      storageType === StorageType.Session
        ? S3_CREDENTIALS_SESSION_STORE_KEY
        : S3_CREDENTIALS_LOCAL_STORE_KEY;
    const raw =
      (storageType === StorageType.Session
        ? sessionStorage.getItem(key)
        : localStorage.getItem(key)) || '{}';
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const writeStore = (storageType: StorageType, data: StoredCredentials) => {
  const key =
    storageType === StorageType.Session
      ? S3_CREDENTIALS_SESSION_STORE_KEY
      : S3_CREDENTIALS_LOCAL_STORE_KEY;
  const str = JSON.stringify(data);

  if (storageType === StorageType.Session) {
    // Does not dispatch "storage" event for any tab.
    // Current tab uses local state updates.
    sessionStorage.setItem(key, str);
  } else {
    // Does dispatch "storage" event for other tabs.
    // But current tab does not get it, it uses local state updates instead.
    localStorage.setItem(key, str);
  }
};

const clearStore = (storageType: StorageType) => {
  const key =
    storageType === StorageType.Session
      ? S3_CREDENTIALS_SESSION_STORE_KEY
      : S3_CREDENTIALS_LOCAL_STORE_KEY;

  if (storageType === StorageType.Session) {
    // Does not dispatch "storage" event for any tab.
    sessionStorage.removeItem(key);
  } else {
    // Does dispatch "storage" event for other tabs.
    localStorage.removeItem(key);
  }
};

// We only need this hook for non-admin users
export const useStorage = (
  provider: S3ProviderType,
  isAdmin: boolean = false
) => {
  const [secretRef, setSecretRef] = React.useState<SecretRef | null>(null);
  const [storageType, setStorageType] = React.useState<StorageType | null>(
    null
  );

  // Current-tab, initial load (session has more priority than local)
  React.useEffect(() => {
    if (isAdmin) return;

    const session = readStore(StorageType.Session)[provider];
    if (session) {
      setSecretRef(session);
      setStorageType(StorageType.Session);
      return;
    }

    const local = readStore(StorageType.Local)[provider];
    if (local) {
      setSecretRef(local);
      setStorageType(StorageType.Local);
    }
  }, [provider, isAdmin]);

  // Cross-tab updates (only for localStorage)
  React.useEffect(() => {
    if (isAdmin) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === S3_CREDENTIALS_LOCAL_STORE_KEY) {
        try {
          const parsed: StoredCredentials = JSON.parse(e.newValue);
          // "provider" is the S3 provider of the current tab
          const updated = parsed?.[provider];

          // Only update if we're not using session storage (i.e., using local or null)
          // and using the same "provider" which was changed in another tab.
          // This ensures that changes to other providers don't affect this tab.
          if (storageType !== StorageType.Session) {
            if (updated) {
              setSecretRef(updated);
              setStorageType(StorageType.Local);
            } else {
              // Provider was removed from local storage
              setSecretRef(null);
              setStorageType(null);
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error: ', err);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [provider, storageType, secretRef, isAdmin]);

  const setSecretRefWithStorage: SetSecretRefWithStorage = React.useCallback(
    (value, targetStorageType) => {
      if (isAdmin) return;

      const currentData = readStore(targetStorageType);
      const updatedData = { ...currentData, [provider]: value };
      writeStore(targetStorageType, updatedData);

      setSecretRef(value);
      setStorageType(targetStorageType);
    },
    [provider, isAdmin, setSecretRef, setStorageType]
  );

  const logout = React.useCallback(() => {
    if (isAdmin) return;

    // Clear only the current provider from the storage type we're using
    if (storageType === StorageType.Session) {
      const sessionData = readStore(StorageType.Session) || {};
      delete sessionData[provider];
      if (Object.keys(sessionData).length === 0) {
        clearStore(StorageType.Session);
      } else {
        writeStore(StorageType.Session, sessionData);
      }
    } else if (storageType === StorageType.Local) {
      const localData = readStore(StorageType.Local) || {};
      delete localData[provider];
      if (Object.keys(localData).length === 0) {
        clearStore(StorageType.Local);
      } else {
        writeStore(StorageType.Local, localData);
      }
    }

    setSecretRef(null);
    setStorageType(null);
  }, [provider, storageType, isAdmin, setSecretRef, setStorageType]);

  return {
    secretRef,
    storageType,
    setSecretRef: setSecretRefWithStorage,
    logout,
  } as const;
};

import * as React from 'react';

// Default ODF user settings storage path
const DEFAULT_ODF_CONSOLE_USER_SETTINGS_KEY = 'odf-console-user-settings';
const STORAGE_EVENT = 'storage';

export const deserializeData = (data: string | null) => {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

export const serializeData = <T>(data: T) => {
  if (typeof data === 'string') {
    return data;
  }
  try {
    return JSON.stringify(data);
  } catch {
    return data;
  }
};

// Get user settings from local storage
const getDataFromLocalStorage = (storageKey: string) =>
  deserializeData(localStorage.getItem(storageKey)) ?? {};

// Initialize state
const initializeDataFromLocalStorage = <T>(
  storageKey: string,
  keyRef: string,
  defaultValue: T
) => {
  const valueInStorage = getDataFromLocalStorage(storageKey);
  return valueInStorage?.hasOwnProperty(keyRef) &&
    valueInStorage[keyRef] !== undefined
    ? valueInStorage[keyRef]
    : defaultValue;
};

// Update local state with user settings by event
const syncLatestDataFromLocalStorage = <T>(
  isMounted: boolean,
  storageKey: string,
  storage: Storage,
  key: string,
  newValue: string,
  data: T,
  userSettingsKey: string,
  setData: React.Dispatch<any>
) => {
  if (isMounted && storage === localStorage && key === storageKey) {
    const newData = deserializeData(newValue)?.[userSettingsKey];
    if (
      newData !== undefined &&
      serializeData(newData) !== serializeData(data)
    ) {
      setData(newData);
    }
  }
};

const updateLocalStorage = <T>(
  storageKey: string,
  userSettingsKey: string,
  localData: any,
  newState: T
) => {
  // Trigger update also when unmounted
  const dataToUpdate = {
    ...localData,
    ...{
      [userSettingsKey]: newState,
    },
  };

  const newValue = serializeData(dataToUpdate);

  try {
    // Update the local storage
    localStorage.setItem(storageKey, newValue);

    // Dispatch storage event to sync the settings changes for other tabs
    generateStorageEventToUpdate(storageKey, newValue);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Error while updating local storage for key ${storageKey}`,
      err
    );
  }
};

// Generate storage event to sync latest settings on other tabs
const generateStorageEventToUpdate = (storageKey, newValue: string) => {
  // Create a storage event to dispatch locally since browser windows do not fire the
  // storage event if the change originated from the current window
  const event = new StorageEvent('storage', {
    storageArea: localStorage,
    key: storageKey,
    newValue,
    oldValue: localStorage.getItem(storageKey),
    url: window.location.toString(),
  });

  window.dispatchEvent(event);
};

export const useUserSettingsLocalStorage = <T>(
  // User settings sub storage path
  userSettingsKey: string,
  // Sync user settings changes in all tabs
  sync = false,
  // Default value for the initial settings
  defaultValue?: T,
  // ODF settings base storage path
  storageKey: string = DEFAULT_ODF_CONSOLE_USER_SETTINGS_KEY
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  // Mount status for safty state updates
  const mounted = React.useRef(true);
  React.useEffect(() => () => (mounted.current = false), []);
  const keyRef = React.useRef<string>(
    userSettingsKey?.replace(/[^-._a-zA-Z0-9]/g, '_')
  );

  const [data, setData] = React.useState(() =>
    initializeDataFromLocalStorage(storageKey, keyRef.current, defaultValue)
  );
  const dataRef = React.useRef<T>(data);
  dataRef.current = data;

  // Sync latest user settings across all tabs.
  const syncLatestData = React.useCallback(
    (event: StorageEvent) =>
      syncLatestDataFromLocalStorage(
        mounted.current,
        storageKey,
        event.storageArea,
        event.key,
        event.newValue,
        dataRef.current,
        keyRef.current,
        setData
      ),
    [storageKey]
  );

  React.useEffect(() => {
    if (sync) {
      window.addEventListener(STORAGE_EVENT, syncLatestData);
    }
    return () => {
      if (sync) {
        window.removeEventListener(STORAGE_EVENT, syncLatestData);
      }
    };
  }, [syncLatestData, sync]);

  const updateData = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (action: React.SetStateAction<T>) => {
      const previousData = dataRef.current;
      const newState =
        typeof action === 'function'
          ? (action as (prevState: T) => T)(previousData)
          : action;
      const localData = getDataFromLocalStorage(storageKey);
      if (
        newState !== undefined &&
        serializeData(newState) !== serializeData(localData?.[keyRef.current])
      ) {
        // Update settings changes for current tab
        if (mounted.current) {
          setData(newState);
        }
        // Update user settings changes in local stroage
        updateLocalStorage(storageKey, keyRef.current, localData, newState);
      }
    },
    [storageKey]
  );

  return [data, updateData];
};

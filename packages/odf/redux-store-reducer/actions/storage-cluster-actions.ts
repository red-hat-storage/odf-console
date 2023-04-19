import { action } from 'typesafe-actions';

export enum Actions {
  SetStorageClusterName = 'setStorageClusterName',
}

export type ActionTypes = {
  type: Actions.SetStorageClusterName;
  payload: { storageClusterName: string | null };
};

export const setStorageClusterName = (storageClusterName: string | null) =>
  action(Actions.SetStorageClusterName, { storageClusterName });

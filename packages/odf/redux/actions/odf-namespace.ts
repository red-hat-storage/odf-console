import { action } from 'typesafe-actions';

export type nsPayload = {
  odfNamespace: string | null;
  isODFNsLoaded: boolean;
  odfNsLoadError: unknown;
};

export enum nsActions {
  SetODFNamespace = 'setODFNamespace',
}

export type nsActionTypes = {
  type: nsActions;
  payload: nsPayload;
};

export const setODFNamespace = (payload: nsPayload): nsActionTypes =>
  action(nsActions.SetODFNamespace, payload);

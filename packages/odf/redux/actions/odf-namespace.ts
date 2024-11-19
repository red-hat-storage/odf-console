import { action } from 'typesafe-actions';

export type NsPayload = {
  odfNamespace: string | null;
  isODFNsLoaded: boolean;
  odfNsLoadError: unknown;
};

export enum NsActions {
  SetODFNamespace = 'setODFNamespace',
}

export type NsActionTypes = {
  type: NsActions;
  payload: NsPayload;
};

export const setODFNamespace = (payload: NsPayload): NsActionTypes =>
  action(NsActions.SetODFNamespace, payload);

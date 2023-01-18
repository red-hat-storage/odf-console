import { useReducer, useEffect, useState, Reducer } from 'react';
import { HelperTextItemProps } from '@patternfly/react-core';

export type State = {
  fieldRequirements: Record<string, HelperTextItemProps['variant']>;
};

export type Action = {
  type: HelperTextItemProps['variant'] | 'reset';
  payload?: string;
  resetType?: 'success' | 'indeterminate';
};

export const reducer = (
  state: State,
  { type, payload, resetType }: Action
): State => ({
  ...state,
  fieldRequirements: Object.entries(state.fieldRequirements).reduce(
    (acc, [rule, status]) => ({
      ...acc,
      [rule]: type === 'reset' ? resetType : payload === rule ? type : status,
    }),
    {}
  ),
});

export const init = (fields: string[]): State => ({
  fieldRequirements: fields.reduce((acc, curr) => {
    return { ...acc, [curr]: 'indeterminate' };
  }, {}),
});

const initialState: State = {
  fieldRequirements: {},
};

export const resetState = (
  isDirty: boolean,
  dispatch: (action: Action) => void
) => {
  dispatch({ type: 'reset', resetType: isDirty ? 'success' : 'indeterminate' });
  return [];
};

export const dispatchErrors = (
  formErrors: string[],
  dispatchedErrors: string[],
  dispatch: (action: Action) => void
) => {
  formErrors?.forEach((err) => {
    if (!dispatchedErrors?.includes(err)) {
      dispatchedErrors?.push(err);
      dispatch({ type: 'error', payload: err });
    }
  });
  return dispatchedErrors;
};

export const dispatchSuccess = (
  formErrors: string[],
  dispatchedErrors: string[],
  dispatch: (action: Action) => void
) => {
  dispatchedErrors?.forEach((err, index) => {
    if (!formErrors.includes(err)) {
      dispatchedErrors.splice(index, 1);
      dispatch({ type: 'success', payload: err });
    }
  });
  return dispatchedErrors;
};

export const checkErrors = (
  errorMessages: Record<string, any> = {},
  stack: string[],
  isDirty: boolean,
  dispatch: (action: Action) => void
) => {
  const formErrors = Object.keys(errorMessages);
  const dispatchedErrors = stack.slice();

  if (!formErrors.length) resetState(isDirty, dispatch);

  return dispatchSuccess(
    formErrors,
    dispatchErrors(formErrors, dispatchedErrors, dispatch),
    dispatch
  );
};

const useFieldRequirements = (
  fieldRequirements: string[],
  isDirty: boolean,
  error: any
) => {
  const [state, dispatch] = useReducer<Reducer<State, Action>, State>(
    reducer,
    initialState,
    () => init(fieldRequirements)
  );
  const [, setErrorStack] = useState<string[]>([]);

  useEffect(() => {
    setErrorStack((prevState) => {
      return checkErrors(error?.messages, prevState, isDirty, dispatch);
    });
  }, [dispatch, error, isDirty]);

  return state;
};

export default useFieldRequirements;

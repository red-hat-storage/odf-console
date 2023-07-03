import * as React from 'react';
import { HelperTextItemProps } from '@patternfly/react-core';

export type Status = HelperTextItemProps['variant'];

export type ActionType = Status | 'reset';

export type State = {
  fieldRequirements: Record<string, Status>;
};

export type Dispatch = React.Dispatch<Action>;

export type Action = {
  type: ActionType;
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
  fieldRequirements: fields?.reduce((acc, curr) => {
    return { ...acc, [curr]: 'indeterminate' };
  }, {}),
});

const initialState: State = {
  fieldRequirements: {},
};

export const resetState = (isDirty: boolean, dispatch: Dispatch) => {
  dispatch({ type: 'reset', resetType: isDirty ? 'success' : 'indeterminate' });
  return [];
};

export const dispatchErrors = (
  formErrors: string[],
  dispatchedErrors: string[],
  dispatch: Dispatch
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
  dispatch: Dispatch
) => {
  const remainingErrors = dispatchedErrors.slice();
  dispatchedErrors?.forEach((err: string) => {
    if (!formErrors.includes(err)) {
      const index = remainingErrors.findIndex((x) => x === err);
      remainingErrors.splice(index, 1);
      dispatch({ type: 'success', payload: err });
    }
  });
  return remainingErrors;
};

export const checkErrors = (
  errorMessages: Record<string, any> = {},
  errorsDispatched: string[],
  isDirty: boolean,
  dispatch: Dispatch
) => {
  const formErrors = Object.keys(errorMessages);
  const dispatchedErrors = errorsDispatched.slice();

  if (!formErrors.length) return resetState(isDirty, dispatch);

  return dispatchSuccess(
    formErrors,
    dispatchErrors(formErrors, dispatchedErrors, dispatch),
    dispatch
  );
};

const useFieldRequirements = <TError>(
  fieldRequirements: string[],
  isDirty: boolean,
  error?: TError
) => {
  const [state, dispatch] = React.useReducer<
    React.Reducer<State, Action>,
    State
  >(reducer, initialState, () => init(fieldRequirements));
  const [, setErrorStack] = React.useState<string[]>([]);

  React.useEffect(() => {
    setErrorStack((prevState) => {
      return checkErrors(error?.['messages'], prevState, isDirty, dispatch);
    });
  }, [dispatch, error, isDirty]);

  return state;
};

export default useFieldRequirements;

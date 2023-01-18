import { renderHook } from '@testing-library/react-hooks';
import useFieldRequirements, {
  checkErrors,
  resetState,
  init,
  dispatchErrors,
  dispatchSuccess,
  reducer,
  State,
  Action,
} from './useFieldRequirements';

//#region test helpers

const fieldRequirements = {
  bic: ['This field is required', 'Numbers only', 'Maximum of 5 characters'],
};

const expectedState = (state: State, status: any, message?: string) => ({
  ...state,
  fieldRequirements: fieldRequirements.bic.reduce(
    (acc, rule) => ({
      ...acc,
      [rule]: message ? (rule === message ? status : 'indeterminate') : status,
    }),
    {}
  ),
});

const initialisedState: State = init(fieldRequirements.bic);

const withState: (status: any, message?: string) => State = expectedState.bind(
  null,
  initialisedState
);

//#endregion

describe('hook', () => {
  it('should return state with all given field requirements set to indeterminate when isDirty is false', () => {
    const formErrors = undefined;
    const isDirty = false;
    const { result } = renderHook(() =>
      useFieldRequirements(fieldRequirements.bic, isDirty, formErrors)
    );

    const expected = initialisedState;
    const actual = result.current;
    expect(actual).toMatchObject(expected);
  });

  it('should return state with all given field requirements set to success when isDirty is true', () => {
    const formErrors = undefined;
    const isDirty = true;
    const { result } = renderHook(() =>
      useFieldRequirements(fieldRequirements.bic, isDirty, formErrors)
    );

    const expected = withState('success');
    const actual = result.current;
    expect(actual).toMatchObject(expected);
  });

  it('should return state with errors when formErrors is not empty', () => {
    const formErrors = {
      messages: {
        ['unique name']: {},
        ['This field is required']: {},
      },
    };
    const isDirty = true;
    const { result } = renderHook(() =>
      useFieldRequirements(fieldRequirements.bic, isDirty, formErrors)
    );

    const expected = withState('error', 'This field is required');
    const actual = result.current;
    expect(actual).toMatchObject(expected);
  });

  it('should return empty state with field requirements are empty', () => {
    const formErrors = undefined;
    const isDirty = false;
    const { result } = renderHook(() =>
      useFieldRequirements([], isDirty, formErrors)
    );

    const expected = { fieldRequirements: {} };
    const actual = result.current;
    expect(actual).toMatchObject(expected);
  });
});

describe('reducer', () => {
  it('should set indeterminate status for all field requirements at startup', () => {
    const message = fieldRequirements.bic[1];
    const action: Action = {
      type: 'indeterminate',
      payload: message,
    };
    const expected = withState('indeterminate');
    const actual = reducer(initialisedState, action);
    expect(actual).toStrictEqual(expected);
  });

  it('should set error status for matching field requirement', () => {
    const message = fieldRequirements.bic[1];
    const action: Action = { type: 'error', payload: message };
    const expected = withState('error', message);
    const actual = reducer(initialisedState, action);
    expect(actual).toStrictEqual(expected);
  });

  it('should set success status for matching field requirement', () => {
    const message = fieldRequirements.bic[2];
    const action: Action = {
      type: 'success',
      payload: message,
    };
    const expected = withState('success', message);
    const actual = reducer(initialisedState, action);
    expect(actual).toStrictEqual(expected);
  });

  it('should reset state to indeterminate', () => {
    const action: Action = { type: 'reset', resetType: 'indeterminate' };
    const expected = withState('indeterminate');
    const actual = reducer(initialisedState, action);
    expect(actual).toStrictEqual(expected);
  });

  it('should reset state to success', () => {
    const action: Action = { type: 'reset', resetType: 'success' };
    const expected = withState('success');
    const actual = reducer(initialisedState, action);
    expect(actual).toStrictEqual(expected);
  });

  it('should not return new state when not matching field requirements', () => {
    const action: Action = {
      type: 'error',
      payload: "something that doesn't exist",
    };
    const expected = initialisedState;
    const actual = reducer(initialisedState, action);
    expect(actual).toStrictEqual(expected);
  });
});

describe('init', () => {
  it('should return valid state obj from array of strings', () => {
    const actual = init(['must be string', 'maximum length 32 characters']);
    const expected = {
      fieldRequirements: {
        ['must be string']: 'indeterminate',
        ['maximum length 32 characters']: 'indeterminate',
      },
    };
    expect(actual).toStrictEqual(expected);
  });

  it('should return valid state obj from empty array', () => {
    const actual = init([]);
    expect(actual).toStrictEqual({ fieldRequirements: {} });
  });
});

describe('checkErrors', () => {
  it('should call resetState when not errors are present', () => {
    const action: Action = { type: 'reset', resetType: 'indeterminate' };
    const formErrors = {};
    const dispatchedErrors = [];
    const isDirty = false;
    const dispatch = jest.fn();
    const expected = [];
    const actual = checkErrors(formErrors, dispatchedErrors, isDirty, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(action);
  });

  it('should add error to dispatchedErrors local state', () => {
    const formErrors = {
      ['This field is required']: {},
      ['Unique name']: {},
      ['Minimum 200 characters']: {},
    };
    const dispatchedErrors = [];
    const isDirty = false;
    const dispatch = jest.fn();
    const expected = [
      'This field is required',
      'Unique name',
      'Minimum 200 characters',
    ];
    const actual = checkErrors(formErrors, dispatchedErrors, isDirty, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  it('should add new error to the dispatchedErrors local state', () => {
    const formErrors = {
      ['This field is required']: {},
      ['Numbers only']: {},
    };
    const dispatchedErrors = ['This field is required'];
    const isDirty = false;
    const dispatch = jest.fn();
    const expected = ['This field is required', 'Numbers only'];
    const actual = checkErrors(formErrors, dispatchedErrors, isDirty, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should remove errors from dispatchedErrors local state that are no longer being reported by formErrors prop', () => {
    const formErrors = {
      ['Numbers only']: {},
    };
    const dispatchedErrors = ['This field is required', 'Numbers only'];
    const isDirty = false;
    const dispatch = jest.fn();
    const expected = ['Numbers only'];
    const actual = checkErrors(formErrors, dispatchedErrors, isDirty, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should clear dispatchedErrors local state if formErrors is empty', () => {
    const formErrors = {};
    const dispatchedErrors = ['This field is required', 'Numbers only'];
    const isDirty = false;
    const dispatch = jest.fn();
    const expected = [];
    const actual = checkErrors(formErrors, dispatchedErrors, isDirty, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalled();
  });
});

describe('resetState', () => {
  it('should set statuses to indeterminate when isDirty is false and return empty array', () => {
    const action: Action = {
      type: 'reset',
      resetType: 'indeterminate',
    };
    const isDirty = false;
    const dispatch = jest.fn();
    const actual = resetState(isDirty, dispatch);
    const expected = [];
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledWith(action);
  });

  it('should set statuses to success when isDirty is true and return empty array', () => {
    const action: Action = {
      type: 'reset',
      resetType: 'success',
    };
    const isDirty = true;
    const dispatch = jest.fn();
    const actual = resetState(isDirty, dispatch);
    const expected = [];
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledWith(action);
  });
});

describe('dispatchErrors', () => {
  it('should dispatch errors', () => {
    const formErrors = ['This field is required', 'Numbers only'];
    const dispatchedErrors = [];
    const dispatch = jest.fn();
    const expected = ['This field is required', 'Numbers only'];
    const actual = dispatchErrors(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('should dispatch only new errors', () => {
    const formErrors = ['This field is required', 'Numbers only'];
    const dispatchedErrors = ['Numbers only'];
    const dispatch = jest.fn();
    const expected = ['Numbers only', 'This field is required'];
    const actual = dispatchErrors(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should not dispatch errors when formErrors is empty', () => {
    const formErrors = [];
    const dispatchedErrors = ['Numbers only'];
    const dispatch = jest.fn();
    const expected = ['Numbers only'];
    const actual = dispatchErrors(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch errors already dispatched errors', () => {
    const formErrors = ['This field is required', 'Numbers only'];
    const dispatchedErrors = ['This field is required', 'Numbers only'];
    const dispatch = jest.fn();
    const expected = ['This field is required', 'Numbers only'];
    const actual = dispatchErrors(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('dispatchSuccess', () => {
  it('should dispatch success when formErrors is empty', () => {
    const formErrors = [];
    const dispatchedErrors = ['This field is required', 'Numbers only'];
    const dispatch = jest.fn();
    const expected = [];
    const actual = dispatchSuccess(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('should dispatch success when formError no longer reports previously dispatched error', () => {
    const formErrors = ['Unique name'];
    const dispatchedErrors = ['Numbers only'];
    const dispatch = jest.fn();
    const expected = [];
    const actual = dispatchSuccess(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should not dispatch success when dispatchedErrors is empty', () => {
    const formErrors = [];
    const dispatchedErrors = [];
    const dispatch = jest.fn();
    const expected = [];
    const actual = dispatchSuccess(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch success while formErrors reports same dispatched errors', () => {
    const formErrors = ['This field is required', 'Numbers only'];
    const dispatchedErrors = ['This field is required', 'Numbers only'];
    const dispatch = jest.fn();
    const expected = ['This field is required', 'Numbers only'];
    const actual = dispatchSuccess(formErrors, dispatchedErrors, dispatch);
    expect(actual).toEqual(expected);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

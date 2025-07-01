import { renderHook } from '@testing-library/react-hooks';
import * as Yup from 'yup';
import useYupValidationResolver from './useYupValidationResolver';

//#region  test data
const fields = {
  username: {
    ref: { name: 'username' },
    name: 'username',
  },
  passowrd: {
    ref: { name: 'passowrd' },
    name: 'passowrd',
  },
};
//#endregion

describe('useYupValidationResolver tests', () => {
  it('should return an obj with values property with valid obj and errors property with empty object when passes validation', async () => {
    const schema = Yup.object({
      name: Yup.string().required(),
      password: Yup.string().notRequired(),
    });
    const validateSpy = jest.spyOn(schema, 'validate');
    const { result } = renderHook(() => useYupValidationResolver(schema));
    const expected = { values: { name: 'test' }, errors: {} };
    const actual = await result?.current({ name: 'test' }, undefined, {
      fields,
      shouldUseNativeValidation: false,
    });
    expect(actual).toMatchObject(expected);
    expect(actual?.errors).toMatchObject({});
    expect(typeof result.current).toBe('function');
    expect(validateSpy).toHaveBeenCalledTimes(1);
  });

  it('should return an obj with values property with empty obj and errors property with valid object when fails validation', async () => {
    const schema = Yup.object({
      name: Yup.string().required(),
      password: Yup.string().required(),
    });
    const validateSpy = jest.spyOn(schema, 'validate');
    const { result } = renderHook(() => useYupValidationResolver(schema));
    const expected = {
      values: {},
      errors: {
        name: {
          message: 'Required',
          messages: {
            ['Required']: {
              field: 'name',
              type: 'optionality',
            },
          },
          type: 'optionality',
        },
      },
    };
    const actual = await result?.current({}, undefined, {
      fields,
      shouldUseNativeValidation: false,
    });

    expect(actual).toMatchObject(expected);
    expect(typeof result.current).toBe('function');
    expect(validateSpy).toHaveBeenCalledTimes(1);
  });

  it('should return errors obj with a messages property for each error', async () => {
    const schema = Yup.object({
      name: Yup.string().required(),
      password: Yup.string().required(),
    });
    const validateSpy = jest.spyOn(schema, 'validate');
    const { result } = renderHook(() => useYupValidationResolver(schema));

    const actual = await result?.current({}, undefined, {
      fields,
      shouldUseNativeValidation: false,
    });

    expect(actual?.values).toMatchObject({});
    expect(actual?.errors['name']).toHaveProperty('messages');
    expect(typeof result.current).toBe('function');
    expect(validateSpy).toHaveBeenCalledTimes(1);
  });

  it('should return a key value map where the keys are the error messages inside errors object', async () => {
    const schema = Yup.object({
      name: Yup.string().required(),
      password: Yup.string().required(),
    });
    const validateSpy = jest.spyOn(schema, 'validate');
    const { result } = renderHook(() => useYupValidationResolver(schema));

    const actual = await result?.current({}, undefined, {
      fields,
      shouldUseNativeValidation: false,
    });

    expect(actual?.values).toMatchObject({});
    expect(actual?.errors['name'].messages).toHaveProperty('Required');
    expect(typeof result.current).toBe('function');
    expect(validateSpy).toHaveBeenCalledTimes(1);
  });
});

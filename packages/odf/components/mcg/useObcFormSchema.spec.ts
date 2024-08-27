import { NOOBAA_PROVISIONER } from '@odf/core/constants';
import * as selectors from '@odf/shared/selectors';
import { renderHook } from '@testing-library/react-hooks';
import { State } from './state';
import useObcFormSchema from './useObcFormSchema';

jest.mock('@odf/shared/selectors', () => ({
  getName: jest.fn().mockReturnValue('test'),
}));

jest.mock('@odf/shared/hooks/useK8sList', () => ({
  __esModule: true,
  useK8sList: () => [
    [
      {
        metadata: {
          name: 'test',
        },
      },
    ],
    true,
    undefined,
  ],
}));

const defaultNs = 'test-namespace';
const defaultState = { scProvisioner: '' } as State;
const defaultSc = 'test-storageclass';

describe('useObcFormSchema tests', () => {
  it('should return error "Cannot be used before"', async () => {
    const obcName = 'test';
    const expected = 'Cannot be used before';
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    await expect(
      result.current.obcFormSchema.validate({
        obcName,
        'sc-dropdown': defaultSc,
      })
    ).rejects.toThrow(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should return error "No more than 253 characters"', async () => {
    const obcName = new Array(254).fill('a').join('');
    const expected = 'No more than 253 characters';
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    await expect(
      result.current.obcFormSchema.validate({
        obcName,
        'sc-dropdown': defaultSc,
      })
    ).rejects.toThrow(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should return error "Starts and ends with a lowercase letter or number"', async () => {
    const obcName = '.invalid-name-';
    const expected = 'Starts and ends with a lowercase letter or number';
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    await expect(
      result.current.obcFormSchema.validate({
        obcName,
        'sc-dropdown': defaultSc,
      })
    ).rejects.toThrow(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should return error "Only lowercase letters, numbers, non-consecutive periods, or hyphens"', async () => {
    const obcName = 'invalid---name09';
    const expected =
      'Only lowercase letters, numbers, non-consecutive periods, or hyphens';
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    await expect(
      result.current.obcFormSchema.validate({
        obcName,
        'sc-dropdown': defaultSc,
      })
    ).rejects.toThrow(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should pass validation on empty obc name input', async () => {
    const obcName = '';
    const expected = {};
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    const actual = await result.current.obcFormSchema.validate({
      obcName,
      'sc-dropdown': defaultSc,
    });
    expect(actual).toMatchObject(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should pass validation on valid obc name input', async () => {
    const obcName = 'valid-name';
    const expected = { obcName };
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    const actual = await result.current.obcFormSchema.validate({
      obcName,
      'sc-dropdown': defaultSc,
    });
    expect(actual).toMatchObject(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should pass validation on max of 253 chars', async () => {
    const obcName = new Array(253).fill('a').join('');
    const expected = { obcName };
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    const actual = await result.current.obcFormSchema.validate({
      obcName,
      'sc-dropdown': defaultSc,
    });
    expect(actual).toMatchObject(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should return error "sc-dropdown is a required field"', async () => {
    const obcName = 'valid-name';
    const expected = 'sc-dropdown is a required field';
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, defaultState)
    );
    await expect(
      result.current.obcFormSchema.validate({
        obcName,
        'sc-dropdown': undefined,
      })
    ).rejects.toThrow(expected);
    expect(spy).toHaveBeenCalled();
  });

  it('should return error "bucketclass is a required field"', async () => {
    const obcName = 'valid-name';
    const expected = 'bucketclass is a required field';
    const spy = jest.spyOn(selectors, 'getName');
    const { result } = renderHook(() =>
      useObcFormSchema(defaultNs, {
        scProvisioner: NOOBAA_PROVISIONER,
      } as State)
    );
    await expect(
      result.current.obcFormSchema.validate({
        obcName,
        'sc-dropdown': defaultSc,
      })
    ).rejects.toThrow(expected);
    expect(spy).toHaveBeenCalled();
  });
});

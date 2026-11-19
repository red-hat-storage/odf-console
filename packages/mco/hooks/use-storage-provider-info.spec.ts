import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { renderHook } from '@testing-library/react';
import { useStorageProviderInfo } from './use-storage-provider-info';

jest.mock('@openshift-console/dynamic-plugin-sdk');

const mockWatch = useK8sWatchResource as jest.Mock;
const odfInfo = { metadata: { name: 'odf-client-info' } };
const scaleInfo = { metadata: { name: 'ibm-storage-scale-info' } };
const notFound = { response: { status: 404 } };
const forbidden = { response: { status: 403 } };

const watching = (odf: unknown[], scale: unknown[]) =>
  mockWatch.mockImplementation(({ name }) =>
    name === 'odf-client-info' ? odf : scale
  );

describe('useStorageProviderInfo', () => {
  it('returns both maps once loaded', () => {
    watching([odfInfo, true, undefined], [scaleInfo, true, undefined]);

    expect(renderHook(useStorageProviderInfo).result.current).toEqual({
      odfClientInfoCM: odfInfo,
      scaleCM: scaleInfo,
      loaded: true,
    });
  });

  it('settles without a map that is missing or unreadable', () => {
    watching([odfInfo, true, undefined], [undefined, false, notFound]);
    expect(renderHook(useStorageProviderInfo).result.current).toEqual({
      odfClientInfoCM: odfInfo,
      scaleCM: undefined,
      loaded: true,
    });

    watching([undefined, false, forbidden], [scaleInfo, true, undefined]);
    expect(renderHook(useStorageProviderInfo).result.current).toEqual({
      odfClientInfoCM: undefined,
      scaleCM: scaleInfo,
      loaded: true,
    });
  });

  it('waits while a map is still loading', () => {
    watching([odfInfo, true, undefined], [undefined, false, undefined]);

    expect(renderHook(useStorageProviderInfo).result.current.loaded).toBe(
      false
    );
  });
});

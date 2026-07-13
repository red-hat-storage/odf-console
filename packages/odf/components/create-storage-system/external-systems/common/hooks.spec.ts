import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
} from '@odf/core/constants';
import { ClusterModel } from '@odf/shared/models/scale';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { renderHook } from '@testing-library/react-hooks';
import { useLocalScaleClusterState } from './hooks';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(),
}));

describe('useLocalScaleClusterState', () => {
  beforeEach(() => jest.clearAllMocks());

  it('watches the named local Scale cluster in its namespace', () => {
    jest.mocked(useK8sWatchResource).mockReturnValue([null, false, null]);

    renderHook(() => useLocalScaleClusterState());

    expect(useK8sWatchResource).toHaveBeenCalledWith({
      groupVersionKind: {
        group: ClusterModel.apiGroup,
        version: ClusterModel.apiVersion,
        kind: ClusterModel.kind,
      },
      isList: false,
      name: IBM_SCALE_LOCAL_CLUSTER_NAME,
      namespace: IBM_SCALE_NAMESPACE,
    });
  });

  it('treats a missing local Scale cluster as absent', () => {
    jest
      .mocked(useK8sWatchResource)
      .mockReturnValue([null, true, { response: { status: 404 } }]);

    const { result } = renderHook(() => useLocalScaleClusterState());

    expect(result.current).toEqual({ status: 'absent' });
  });

  it('preserves non-404 lookup failures as errors', () => {
    const error = { response: { status: 403 } };
    jest.mocked(useK8sWatchResource).mockReturnValue([null, true, error]);

    const { result } = renderHook(() => useLocalScaleClusterState());

    expect(result.current).toEqual({ status: 'error', error });
  });
});

import { ProviderNames } from '@odf/core/types';
import { CEPH_SC_KMS_PROVIDER_SESSION_STORAGE } from '@odf/ocs/constants';
import { addKubevirtAnnotations, addKeyRotationAnnotation } from './mutators';

describe('tests for add annotations mutator', () => {
  it('should add annotations for encrypted StorageClass', () => {
    const sc = {
      parameters: {
        encrypted: 'true',
      },
      metadata: {
        annotations: {
          'some-existing-annotation': 'value',
        },
      },
    };

    const result = addKubevirtAnnotations(sc);

    expect(result.metadata.annotations).toEqual({
      'some-existing-annotation': 'value',
      'cdi.kubevirt.io/clone-strategy': 'copy',
    });
  });

  it('should not add annotations for non encrypted StorageClass', () => {
    const sc = {
      parameters: {
        encrypted: 'false',
      },
      metadata: {
        annotations: {
          'some-existing-annotation': 'value',
        },
      },
    };

    const result = addKubevirtAnnotations(sc);

    expect(result.metadata.annotations).toEqual({
      'some-existing-annotation': 'value',
    });
  });

  it('should not add annotations for missing parameters property', () => {
    const sc = {
      metadata: {
        annotations: {
          'some-existing-annotation': 'value',
        },
      },
    };

    const result = addKubevirtAnnotations(sc);

    expect(result.metadata.annotations).toEqual({
      'some-existing-annotation': 'value',
    });
  });

  it('should not add annotations for missing encrypted field', () => {
    const sc = {
      parameters: {},
      metadata: {
        annotations: {
          'some-existing-annotation': 'value',
        },
      },
    };

    const result = addKubevirtAnnotations(sc);

    expect(result.metadata.annotations).toEqual({
      'some-existing-annotation': 'value',
    });
  });

  it('should add annotations in metadata for empty metadata property', () => {
    const sc = {
      parameters: {
        encrypted: 'true',
      },
      metadata: {},
    };

    const result = addKubevirtAnnotations(sc);

    expect(result.metadata.annotations).toEqual({
      'cdi.kubevirt.io/clone-strategy': 'copy',
    });
  });
});

describe('addKeyRotationAnnotation', () => {
  afterEach(() => {
    sessionStorage.removeItem(CEPH_SC_KMS_PROVIDER_SESSION_STORAGE);
  });

  it('should add weekly schedule for non-GKLM encrypted StorageClass', () => {
    sessionStorage.setItem(
      CEPH_SC_KMS_PROVIDER_SESSION_STORAGE,
      ProviderNames.VAULT
    );
    const sc = {
      parameters: { encrypted: 'true' },
      metadata: { annotations: {} },
    };

    expect(addKeyRotationAnnotation(sc).metadata.annotations).toEqual({
      'keyrotation.csiaddons.openshift.io/schedule': '@weekly',
    });
  });

  it('should skip key rotation for GKLM encrypted StorageClass', () => {
    sessionStorage.setItem(
      CEPH_SC_KMS_PROVIDER_SESSION_STORAGE,
      ProviderNames.GKLM
    );
    const sc = {
      parameters: { encrypted: 'true' },
      metadata: { annotations: {} },
    };

    expect(addKeyRotationAnnotation(sc).metadata.annotations).toEqual({});
  });
});

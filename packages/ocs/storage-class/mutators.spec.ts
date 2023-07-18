import { addKubevirtAnnotations } from './mutators';

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

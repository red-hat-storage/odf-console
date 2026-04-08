import { renderHook } from '@testing-library/react-hooks';
import useSANSystemFormValidation from './useFormValidation';

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@odf/shared/constants', () => ({
  fieldRequirementsTranslations: {
    maxChars: (_t: unknown, max: number) => `No more than ${max} characters`,
    minChars: (_t: unknown, min: number) => `No less than ${min} characters`,
    cannotBeEmpty: () => 'Cannot be empty',
    mustBeUnique: () => 'Name must be unique',
    mustBeLowercase: () =>
      "Must consist of lower case alphanumeric characters or '-'",
    startEndAlphanumeric: () =>
      'Must start and end with an alphanumeric character',
  },
}));

jest.mock(
  '@odf/core/components/create-storage-system/external-systems/common/useResourceNameValidation',
  () => ({
    createUniquenessValidator: () => () => true,
  })
);

describe('useSANSystemFormValidation', () => {
  const baseValidValues = {
    lunGroupName: 'valid-lun-group',
    imageRegistryUrl: 'quay.io',
    imageRepositoryName: 'my-repo',
    secretKey: 'secret',
    caCertificateSecret: '',
    privateKeySecret: '',
  };

  describe('Secure boot: CA certificate and Private key optional', () => {
    it('should allow form to be valid without CA certificate and Private key (unsecure boot)', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      const valid = await result.current.formSchema.isValid({
        ...baseValidValues,
        caCertificateSecret: '',
        privateKeySecret: '',
      });
      expect(valid).toBe(true);
    });

    it('should allow form to be valid with both CA certificate and Private key (secure boot)', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      const valid = await result.current.formSchema.isValid({
        ...baseValidValues,
        caCertificateSecret: 'ca-secret',
        privateKeySecret: 'key-secret',
      });
      expect(valid).toBe(true);
    });
  });

  describe('Registry configuration: image registry/repo required only when OpenShift registry absent', () => {
    it('when hasPersistentRegistry is true, should not require imageRegistryUrl and imageRepositoryName', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), false)
      );
      const validWithoutRegistry = await result.current.formSchema.isValid({
        ...baseValidValues,
        imageRegistryUrl: '',
        imageRepositoryName: '',
      });
      expect(validWithoutRegistry).toBe(true);

      const validWithRegistry =
        await result.current.formSchema.isValid(baseValidValues);
      expect(validWithRegistry).toBe(true);
    });

    it('when hasPersistentRegistry is false, should require imageRegistryUrl and imageRepositoryName', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      const validWithoutRegistry = await result.current.formSchema.isValid({
        lunGroupName: baseValidValues.lunGroupName,
        imageRegistryUrl: '',
        imageRepositoryName: '',
        secretKey: baseValidValues.secretKey,
        caCertificateSecret: '',
        privateKeySecret: '',
      });
      expect(validWithoutRegistry).toBe(false);
    });
  });

  describe('Secret key required only when registry section is shown and no persistent registry', () => {
    it('when showRegistrySection is false and no persistent registry, should require secretKey', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), false)
      );
      const validWithoutSecret = await result.current.formSchema.isValid({
        ...baseValidValues,
        secretKey: '',
      });
      expect(validWithoutSecret).toBe(true);
    });

    it('when showRegistrySection is true and persistent registry present, should require secretKey', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      const validWithoutSecret = await result.current.formSchema.isValid({
        ...baseValidValues,
        secretKey: '',
      });
      expect(validWithoutSecret).toBe(false);
    });

    it('when showRegistrySection is false, should not require secretKey', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), false)
      );
      const validWithoutSecret = await result.current.formSchema.isValid({
        lunGroupName: baseValidValues.lunGroupName,
        imageRegistryUrl: '',
        imageRepositoryName: '',
        secretKey: '',
        caCertificateSecret: '',
        privateKeySecret: '',
      });
      expect(validWithoutSecret).toBe(true);
    });
  });

  describe('imageRegistryUrl validation', () => {
    const makeValues = (imageRegistryUrl: string) => ({
      ...baseValidValues,
      imageRegistryUrl,
    });

    it.each([
      'quay.io',
      'registry.example.com',
      'registry.example.com:5000',
      'registry.example.com:5000/my/repo',
      '192.168.1.1',
      '192.168.1.1:5000',
      'myregistry:8080/path',
    ])('should accept valid URL without protocol: %s', async (url) => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      expect(await result.current.formSchema.isValid(makeValues(url))).toBe(
        true
      );
    });

    it.each([
      'https://quay.io',
      'http://registry.example.com',
      '-invalid.com',
      '.invalid.com',
    ])('should reject invalid URL: %s', async (url) => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      expect(await result.current.formSchema.isValid(makeValues(url))).toBe(
        false
      );
    });
  });

  describe('Testing combinations', () => {
    it('OpenShift registry present + all optional cert fields empty: valid with registry filled', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      expect(await result.current.formSchema.isValid(baseValidValues)).toBe(
        true
      );
    });

    it('OpenShift registry present + secure boot (CA + key): valid', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), true)
      );
      expect(
        await result.current.formSchema.isValid({
          ...baseValidValues,
          caCertificateSecret: 'ca',
          privateKeySecret: 'key',
        })
      ).toBe(true);
    });

    it('No OpenShift registry + secretKey only: valid', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), false)
      );
      expect(
        await result.current.formSchema.isValid({
          lunGroupName: baseValidValues.lunGroupName,
          imageRegistryUrl: '',
          imageRepositoryName: '',
          secretKey: 'my-secret',
          caCertificateSecret: '',
          privateKeySecret: '',
        })
      ).toBe(true);
    });

    it('No OpenShift registry + secretKey + secure boot: valid', async () => {
      const { result } = renderHook(() =>
        useSANSystemFormValidation(new Set(), false)
      );
      expect(
        await result.current.formSchema.isValid({
          lunGroupName: baseValidValues.lunGroupName,
          imageRegistryUrl: '',
          imageRepositoryName: '',
          secretKey: 'my-secret',
          caCertificateSecret: 'ca',
          privateKeySecret: 'key',
        })
      ).toBe(true);
    });
  });
});
